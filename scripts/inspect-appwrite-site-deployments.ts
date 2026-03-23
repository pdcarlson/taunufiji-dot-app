/**
 * Lists Appwrite Sites deployments with size fields and optional build log excerpts.
 * Uses the same credentials as the app (cloud endpoint + API key with Sites read scope).
 *
 * Usage:
 *   APPWRITE_SITE_ID=<id> npx tsx scripts/inspect-appwrite-site-deployments.ts
 *   npx tsx scripts/inspect-appwrite-site-deployments.ts --site=<id> [--limit=20]
 *   npx tsx scripts/inspect-appwrite-site-deployments.ts --site=<id> --deployment=<deploymentId>
 *
 * If APPWRITE_SITE_ID / --site is omitted, prints all sites in the project (id + name).
 */
import { config as loadDotEnv } from "dotenv";
import { Query, Sites } from "node-appwrite";
import { createAppwriteAdminClientFromEnv } from "../lib/infrastructure/persistence/appwrite-admin-factory";

loadDotEnv({ path: ".env.local" });

const MB = 1024 * 1024;

function formatMb(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "?";
  }
  return `${(bytes / MB).toFixed(2)} MB`;
}

function parseArgs(argv: string[]): {
  siteId: string | undefined;
  limit: number;
  deploymentId: string | undefined;
  logTailChars: number;
} {
  let siteId = process.env.APPWRITE_SITE_ID;
  let limit = 15;
  let deploymentId: string | undefined;
  let logTailChars = 4_000;

  for (const arg of argv) {
    if (arg.startsWith("--site=")) {
      siteId = arg.slice("--site=".length).trim() || undefined;
    } else if (arg.startsWith("--limit=")) {
      const n = Number.parseInt(arg.slice("--limit=".length), 10);
      if (Number.isFinite(n) && n > 0 && n <= 100) {
        limit = n;
      }
    } else if (arg.startsWith("--deployment=")) {
      deploymentId = arg.slice("--deployment=".length).trim() || undefined;
    } else if (arg.startsWith("--log-tail=")) {
      const n = Number.parseInt(arg.slice("--log-tail=".length), 10);
      if (Number.isFinite(n) && n > 0) {
        logTailChars = n;
      }
    }
  }

  return { siteId, limit, deploymentId, logTailChars };
}

function assertCloudEndpoint(endpoint: string): void {
  const lower = endpoint.toLowerCase();
  if (!lower.startsWith("https://")) {
    throw new Error(
      "NEXT_PUBLIC_APPWRITE_ENDPOINT must use https (cloud Appwrite). Local http/localhost cannot reach the Sites API for your deployed project.",
    );
  }
  if (lower.includes("localhost") || lower.includes("127.0.0.1")) {
    throw new Error(
      "NEXT_PUBLIC_APPWRITE_ENDPOINT points at localhost. Use your cloud Appwrite API URL (e.g. https://<region>.cloud.appwrite.io/v1) in .env.local to inspect Sites deployments.",
    );
  }
}

async function main(): Promise<void> {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ?? "";
  assertCloudEndpoint(endpoint);

  const client = createAppwriteAdminClientFromEnv();
  const sites = new Sites(client);

  const { siteId, limit, deploymentId, logTailChars } = parseArgs(
    process.argv.slice(2),
  );

  if (!siteId) {
    const list = await sites.list({ total: true });
    console.log(`Sites in project (${list.total} total):\n`);
    for (const s of list.sites) {
      console.log(`  ${s.$id}  ${s.name}`);
    }
    console.log(
      "\nRe-run with APPWRITE_SITE_ID=<id> or --site=<id> to list deployments.",
    );
    return;
  }

  if (deploymentId) {
    const dep = await sites.getDeployment({ siteId, deploymentId });
    console.log(JSON.stringify(dep, null, 2));
    if (dep.buildLogs && dep.buildLogs.length > 0) {
      const tail =
        dep.buildLogs.length > logTailChars
          ? dep.buildLogs.slice(-logTailChars)
          : dep.buildLogs;
      console.log(
        `\n--- buildLogs (last ${tail.length} chars of ${dep.buildLogs.length}) ---\n`,
      );
      console.log(tail);
    }
    return;
  }

  const list = await sites.listDeployments({
    siteId,
    queries: [Query.orderDesc("$createdAt"), Query.limit(limit)],
    total: true,
  });

  console.log(
    `Deployments (newest first, limit ${limit}, total known: ${list.total}):\n`,
  );
  console.log(
    [
      "id".padEnd(12),
      "status".padEnd(10),
      "type".padEnd(8),
      "src".padEnd(10),
      "buildOut".padEnd(10),
      "total".padEnd(10),
      "sec".padEnd(5),
      "act",
      "branch / commit",
    ].join("  "),
  );
  console.log("-".repeat(120));

  for (const d of list.deployments) {
    const branch = d.providerBranch || "";
    const commit = d.providerCommitHash || "";
    const ref =
      branch || commit ? `${branch} ${commit}`.trim().slice(0, 48) : "";
    console.log(
      [
        d.$id.slice(0, 12).padEnd(12),
        String(d.status).padEnd(10),
        (d.type || "").slice(0, 8).padEnd(8),
        formatMb(d.sourceSize).padEnd(10),
        formatMb(d.buildSize).padEnd(10),
        formatMb(d.totalSize).padEnd(10),
        String(d.buildDuration).padEnd(5),
        d.activate ? "Y" : "N",
        ref,
      ].join("  "),
    );
  }

  console.log(
    "\nCompare sourceSize vs buildSize vs totalSize (Appwrite model: source = uploaded code, build = output artifact).",
  );
  console.log(
    "For full JSON + build log tail: --deployment=<deploymentId> [--log-tail=8000]",
  );
  console.log(
    "Request/runtime issues: Appwrite Console → Site → Logs (filter by deploymentId or path).",
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
