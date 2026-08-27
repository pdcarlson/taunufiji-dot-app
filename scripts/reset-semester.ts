/**
 * Semester reset for the housing task board.
 *
 * **Why this exists:** after a long outage (or at the end of any term) the `assignments`
 * collection holds stale rows whose `due_at` is in the past. The scheduled housing batch
 * (`/api/cron?job=HOUSING_BATCH`) scans *every* `open`/`pending` task with no proof and no
 * date floor, expires each one, fines the assignee through the double-entry ledger, and DMs
 * them on Discord. Restoring service without clearing that backlog fines the whole chapter at
 * once. See `lib/application/services/jobs/handlers/expire-duties.job.ts`.
 *
 * **What it touches:** `assignments` (delete) and `housing_schedules` (`active` -> false).
 * It never reads or writes `ledger`, `users.details_points_current`, or
 * `users.details_points_lifetime` — point history is preserved by design.
 *
 * **Safety model:** dry run by default. A JSON backup of every affected collection is written
 * before any mutation, on dry runs too, so the snapshot exists before you decide.
 *
 * ```bash
 * # 1. Inspect. Writes a backup, changes nothing.
 * npx tsx scripts/reset-semester.ts
 *
 * # 2. Narrow to the rows that actually arm the cron, if the counts warrant it.
 * npx tsx scripts/reset-semester.ts --statuses=open,pending,locked
 *
 * # 3. Execute.
 * npx tsx scripts/reset-semester.ts --apply
 * ```
 *
 * **Targeting production** (production uses a different project id than staging):
 *
 * ```bash
 * APPWRITE_TARGET_PROJECT_ID="<project id>" \
 * APPWRITE_TARGET_API_KEY="<server API key with databases.write>" \
 * npx tsx scripts/reset-semester.ts
 * ```
 *
 * Flags: `--apply`, `--statuses=a,b,c`, `--skip-schedules`, `--out=<dir>`, `--yes`.
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { config as loadDotEnv } from "dotenv";
import { Client, Databases, Query, Models } from "node-appwrite";
import { DB_ID, COLLECTIONS } from "@/lib/infrastructure/config/schema";

loadDotEnv({ path: ".env.local" });

/** Appwrite `listDocuments` page size; drained via offset until a short page returns. */
const PAGE_SIZE = 100;

/** Every status an `assignments` row can hold (see `AssignmentSchema`). */
const ALL_STATUSES = [
  "open",
  "pending",
  "approved",
  "rejected",
  "expired",
  "locked",
] as const;

type AssignmentStatus = (typeof ALL_STATUSES)[number];

/** Statuses the scheduled batch can still act on — the subset that actually arms the cron. */
const NON_TERMINAL_STATUSES: readonly AssignmentStatus[] = [
  "open",
  "pending",
  "locked",
];

type AssignmentDoc = Models.Document & {
  title?: string;
  status?: string;
  due_at?: string;
  assigned_to?: string;
  proof_s3_key?: string;
  initial_image_s3_key?: string;
};

type ScheduleDoc = Models.Document & {
  title?: string;
  active?: boolean;
  assigned_to?: string;
};

interface Options {
  apply: boolean;
  statuses: readonly AssignmentStatus[];
  statusesExplicit: boolean;
  skipSchedules: boolean;
  outDir: string;
  assumeYes: boolean;
}

function parseArgs(argv: string[]): Options {
  const apply = argv.includes("--apply");
  const skipSchedules = argv.includes("--skip-schedules");
  const assumeYes = argv.includes("--yes");

  const outArg = argv.find((a) => a.startsWith("--out="));
  const outDir = outArg ? outArg.slice("--out=".length) : "backups";

  const statusArg = argv.find((a) => a.startsWith("--statuses="));
  let statuses: readonly AssignmentStatus[] = ALL_STATUSES;

  if (statusArg) {
    const raw = statusArg
      .slice("--statuses=".length)
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const invalid = raw.filter(
      (s) => !ALL_STATUSES.includes(s as AssignmentStatus),
    );
    if (invalid.length > 0) {
      throw new Error(
        `Unknown status(es): ${invalid.join(", ")}. Valid: ${ALL_STATUSES.join(", ")}`,
      );
    }
    if (raw.length === 0) {
      throw new Error("--statuses was provided but empty.");
    }
    statuses = raw as AssignmentStatus[];
  }

  return {
    apply,
    statuses,
    statusesExplicit: Boolean(statusArg),
    skipSchedules,
    outDir,
    assumeYes,
  };
}

/**
 * Resolves the target Appwrite project, matching the override convention in
 * `scripts/add-expired-admin-notification-enum.ts` so production can be targeted explicitly
 * rather than by editing `.env.local`.
 */
function getTargetConfig(): {
  endpoint: string;
  projectId: string;
  apiKey: string;
} {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId =
    process.env.APPWRITE_TARGET_PROJECT_ID ??
    process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const apiKey =
    process.env.APPWRITE_TARGET_API_KEY ??
    process.env.APPWRITE_STAGING_API_KEY ??
    process.env.APPWRITE_API_KEY;

  if (!endpoint || !projectId || !apiKey) {
    throw new Error(
      "Missing Appwrite config. Need NEXT_PUBLIC_APPWRITE_ENDPOINT, project id (NEXT_PUBLIC_APPWRITE_PROJECT_ID or APPWRITE_TARGET_PROJECT_ID), and API key (APPWRITE_TARGET_API_KEY, APPWRITE_STAGING_API_KEY, or APPWRITE_API_KEY).",
    );
  }

  return { endpoint, projectId, apiKey };
}

/** Drains a collection page by page so nothing is silently truncated at the first 100 rows. */
async function fetchAll<T extends Models.Document>(
  databases: Databases,
  collectionId: string,
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  let page: T[];

  do {
    const result = await databases.listDocuments<T>({
      databaseId: DB_ID,
      collectionId,
      queries: [
        Query.limit(PAGE_SIZE),
        Query.offset(offset),
        Query.orderAsc("$id"),
      ],
    });
    page = result.documents;
    all.push(...page);
    offset += PAGE_SIZE;
  } while (page.length === PAGE_SIZE);

  return all;
}

function countBy<T>(items: T[], key: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}

function writeBackup(
  outDir: string,
  projectId: string,
  assignments: AssignmentDoc[],
  schedules: ScheduleDoc[],
): string {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(outDir, `reset-semester-${projectId}-${stamp}.json`);

  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        project_id: projectId,
        database_id: DB_ID,
        collections: {
          [COLLECTIONS.ASSIGNMENTS]: assignments,
          [COLLECTIONS.SCHEDULES]: schedules,
        },
      },
      null,
      2,
    ),
    "utf-8",
  );

  return file;
}

async function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await new Promise<string>((resolve) => {
    rl.question(question, resolve);
  });
  rl.close();
  return answer.trim().toUpperCase() === "YES";
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const { endpoint, projectId, apiKey } = getTargetConfig();

  const databases = new Databases(
    new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey),
  );

  console.log("=".repeat(72));
  console.log(
    options.apply ? "SEMESTER RESET — APPLY" : "SEMESTER RESET — DRY RUN",
  );
  console.log("=".repeat(72));
  console.log(`  endpoint    ${endpoint}`);
  console.log(`  project     ${projectId}`);
  console.log(`  database    ${DB_ID}`);
  console.log(`  statuses    ${options.statuses.join(", ")}`);
  console.log(
    `  schedules   ${options.skipSchedules ? "left alone" : "deactivate all"}`,
  );
  console.log("");

  // Read everything up front so the backup reflects pre-mutation state.
  console.log("Reading assignments...");
  const assignments = await fetchAll<AssignmentDoc>(
    databases,
    COLLECTIONS.ASSIGNMENTS,
  );
  console.log("Reading housing_schedules...");
  const schedules = await fetchAll<ScheduleDoc>(
    databases,
    COLLECTIONS.SCHEDULES,
  );

  const backupFile = writeBackup(
    options.outDir,
    projectId,
    assignments,
    schedules,
  );
  console.log(`\nBackup written: ${backupFile}`);
  console.log(
    `  ${assignments.length} assignments, ${schedules.length} schedules\n`,
  );

  const byStatus = countBy(assignments, (a) => a.status ?? "(unset)");
  console.log("assignments by status:");
  for (const status of ALL_STATUSES) {
    const n = byStatus.get(status) ?? 0;
    const selected = options.statuses.includes(status);
    console.log(
      `  ${selected ? "x" : " "} ${status.padEnd(10)} ${String(n).padStart(5)}${
        selected ? "   <- will be deleted" : ""
      }`,
    );
  }
  const unset = byStatus.get("(unset)") ?? 0;
  if (unset > 0) {
    console.log(
      `    ${"(unset)".padEnd(10)} ${String(unset).padStart(5)}   <- left alone`,
    );
  }

  const targeted = assignments.filter((a) =>
    options.statuses.includes((a.status ?? "") as AssignmentStatus),
  );

  // The blast radius the plan is built around: what the batch would act on right now.
  const now = Date.now();
  const overdueArmed = assignments.filter(
    (a) =>
      NON_TERMINAL_STATUSES.includes((a.status ?? "") as AssignmentStatus) &&
      !a.proof_s3_key &&
      a.due_at !== undefined &&
      new Date(a.due_at).getTime() < now,
  );

  console.log("");
  console.log(
    `Rows the housing batch would expire+fine+DM right now: ${overdueArmed.length}`,
  );
  if (overdueArmed.length > 0) {
    const distinctAssignees = new Set(
      overdueArmed.map((a) => a.assigned_to).filter(Boolean),
    );
    console.log(`  across ${distinctAssignees.size} distinct assignees`);
    const oldest = overdueArmed
      .map((a) => a.due_at)
      .filter((d): d is string => Boolean(d))
      .sort()[0];
    if (oldest) {
      console.log(`  oldest due_at: ${oldest}`);
    }
    const stillArmed = overdueArmed.filter(
      (a) => !options.statuses.includes((a.status ?? "") as AssignmentStatus),
    );
    if (stillArmed.length > 0) {
      console.log(
        `  WARNING: ${stillArmed.length} of these are NOT in --statuses and would survive this run.`,
      );
    }
  }

  const activeSchedules = schedules.filter((s) => s.active === true);
  console.log("");
  console.log(
    `housing_schedules: ${activeSchedules.length} active of ${schedules.length} total`,
  );

  // Orphaned S3 objects are reported, never deleted — that is a separate decision.
  const orphanKeys = targeted.flatMap((a) =>
    [a.proof_s3_key, a.initial_image_s3_key].filter(
      (k): k is string => typeof k === "string" && k.length > 0,
    ),
  );
  if (orphanKeys.length > 0) {
    console.log("");
    console.log(
      `S3 objects that would be orphaned in ${
        process.env.AWS_BUCKET_NAME ?? "(bucket)"
      }: ${orphanKeys.length}`,
    );
    console.log(
      "  Not deleted by this script. Recorded in the backup file above.",
    );
  }

  console.log("");
  console.log("-".repeat(72));
  console.log(`Would delete     ${targeted.length} assignments`);
  console.log(
    `Would deactivate ${options.skipSchedules ? 0 : activeSchedules.length} schedules`,
  );
  console.log(
    "Untouched        ledger, users.details_points_current, users.details_points_lifetime",
  );
  console.log("-".repeat(72));

  if (!options.apply) {
    console.log("");
    console.log("Dry run — nothing was changed.");
    if (!options.statusesExplicit) {
      console.log(
        `Tip: --statuses=${NON_TERMINAL_STATUSES.join(
          ",",
        )} clears only what arms the cron and keeps completed history.`,
      );
    }
    console.log("Re-run with --apply to execute.");
    return;
  }

  if (!options.assumeYes) {
    console.log("");
    const ok = await confirm(
      `Delete ${targeted.length} assignments from project ${projectId}? Type YES to proceed: `,
    );
    if (!ok) {
      console.log("Aborted. Nothing was changed.");
      process.exitCode = 1;
      return;
    }
  }

  let deactivated = 0;
  const errors: string[] = [];

  // Schedules first: a deactivated schedule cannot regenerate a task mid-run.
  if (!options.skipSchedules) {
    console.log("\nDeactivating schedules...");
    for (const schedule of activeSchedules) {
      try {
        await databases.updateDocument({
          databaseId: DB_ID,
          collectionId: COLLECTIONS.SCHEDULES,
          documentId: schedule.$id,
          data: { active: false },
        });
        deactivated++;
      } catch (error) {
        errors.push(
          `schedule ${schedule.$id} ("${schedule.title ?? "?"}"): ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
    console.log(`  deactivated ${deactivated}/${activeSchedules.length}`);
  }

  let deleted = 0;
  console.log("\nDeleting assignments...");
  for (const assignment of targeted) {
    try {
      await databases.deleteDocument({
        databaseId: DB_ID,
        collectionId: COLLECTIONS.ASSIGNMENTS,
        documentId: assignment.$id,
      });
      deleted++;
      if (deleted % 50 === 0) {
        console.log(`  ${deleted}/${targeted.length}`);
      }
    } catch (error) {
      errors.push(
        `assignment ${assignment.$id} ("${assignment.title ?? "?"}"): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
  console.log(`  deleted ${deleted}/${targeted.length}`);

  console.log("");
  console.log("=".repeat(72));
  console.log(`Deleted      ${deleted} assignments`);
  console.log(`Deactivated  ${deactivated} schedules`);
  console.log(`Backup       ${backupFile}`);
  console.log("=".repeat(72));

  if (errors.length > 0) {
    console.error(`\n${errors.length} operation(s) failed:`);
    for (const message of errors.slice(0, 20)) {
      console.error(`  - ${message}`);
    }
    if (errors.length > 20) {
      console.error(`  ... and ${errors.length - 20} more`);
    }
    process.exitCode = 1;
  }
}

/**
 * Turns the two failure modes that actually take this app down into actionable text.
 *
 * Node's `fetch` collapses TLS problems into a bare "fetch failed" and hides the real reason on
 * `error.cause` — the exact opacity that made the April 2026 outage hard to diagnose. A paused
 * Appwrite project is equally easy to misread as a credentials problem.
 */
function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  const cause = (error as { cause?: unknown })?.cause;
  const causeCode = (cause as { code?: string })?.code;
  const causeMessage =
    cause instanceof Error ? cause.message : cause ? String(cause) : "";

  if (
    causeCode === "CERT_HAS_EXPIRED" ||
    causeCode === "ERR_TLS_CERT_ALTNAME_INVALID" ||
    /certificate/i.test(causeMessage)
  ) {
    return [
      `${message} (${causeCode ?? "TLS error"}: ${causeMessage})`,
      "",
      "The Appwrite endpoint's TLS certificate is not valid. Check it with:",
      "  echo | openssl s_client -servername appwrite.taunufiji.app \\",
      "    -connect appwrite.taunufiji.app:443 2>/dev/null | openssl x509 -noout -dates",
      "",
      "Renew it in the Appwrite Console under the project's custom domains.",
      "A paused project cannot renew — unpause first, then renew.",
    ].join("\n");
  }

  if (/paused/i.test(message)) {
    return [
      message,
      "",
      "Unpause the project in the Appwrite Console, then re-run.",
    ].join("\n");
  }

  if (causeMessage) {
    return `${message} (${causeMessage})`;
  }

  return message;
}

main().catch((error) => {
  // Bad flags and missing config are expected operator errors — show the message, not a stack.
  console.error(`reset-semester failed: ${describeError(error)}`);
  if (process.env.DEBUG && error instanceof Error && error.stack) {
    console.error(error.stack);
  }
  process.exitCode = 1;
});
