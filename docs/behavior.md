# Housing Behavior Reference

This document is the durable behavioral reference for the Housing module.

- **Active specs** in `docs/spec/current/` define in-progress rollout work.
- **Completed specs** are archived in `docs/spec/archive/`.
- **This document** defines expected runtime behavior, state transitions, and edge-case handling that should remain true across implementations.

## 1) Core Entities

### Task Types

- `duty`: recurring chore instance (usually tied to a schedule)
- `one_off`: manual assignment by admin
- `bounty`: optional claimable task
- `project`: longer-running optional assignment
- `ad_hoc`: user-submitted request for points

### Task Status Values

- `locked`: not yet visible/actionable; unlocks at `unlock_at`
- `open`: available to claim or complete
- `pending`: claimed/assigned work in progress (including proof-submitted items). There is no separate persisted `awaiting_review` status.
- `approved`: accepted and closed
- `rejected`: denied after review and potentially resubmittable (type-dependent)
- `expired`: missed deadline / no longer completable

### Notification Levels

- `none`: no delivery stage completed
- `unlocked`: initial availability notification sent
- `urgent`: urgent warning sent
- `expired_admin`: housing admin channel was alerted for an expired task; assignee DM not yet confirmed (retry DM only on the next run)
- `expired`: expiry path notifications completed

## 2) Identity and Authorization Model

### Identity Keys

- **Auth ID**: Appwrite authentication identity (`user.$id`)
- **Discord ID**: profile identity used for assignment ownership and notifications

### Authorization Rules

1. All authenticated server actions must verify the user has baseline Brother access (unless explicitly public).
2. Housing mutation actions must require housing-admin roles:
   - Housing Chair,
   - Cabinet,
   - Dev (if mapped in role configuration).
3. Query/read actions may use baseline Brother access depending on route sensitivity.

## 3) Canonical Task Lifecycle

## 3.1 Recurring Duty Flow (schedule-backed)

1. Schedule exists and is active.
2. New duty instance generated:
   - `locked` if `unlock_at` is in the future,
   - `open` if immediately visible.
3. At/after `unlock_at`, task becomes `open`.
4. Assigned user submits proof -> `pending` (review-ready via `proof_s3_key`).
5. Admin approves -> `approved`.
6. Next recurring instance is generated.
7. If missed deadline, task transitions to `expired` and fine behavior is triggered.
   - Assignments use `is_fine`: set `false` when the row is expired with a pending ledger fine; set `true` only after `awardPoints` succeeds. Hourly cron runs `pendingFinesJob` to retry fines when the ledger call failed after expiry.
   - Missed-duty fine ledger rows embed the task id in `reason` (`[task:<id>]`) so `expireOverdueDutyTask` and `pendingFinesJob` can skip `awardPoints` when a matching fine already exists (avoids double charges if `is_fine` was not persisted).
8. Overdue transition is canonicalized through shared expiry logic and may run from:
   - cron (`ExpireDutiesJob`) as the primary scheduled path, and
   - dashboard maintenance as a fallback path for assigned-user views.

## 3.2 One-Off Duty Flow

1. Admin creates one-off task, usually assigned to a user.
2. Task is immediately `open` unless otherwise specified.
3. Assigned user submits proof -> `pending` (review-ready via `proof_s3_key`).
4. Admin:
   - approves -> `approved`,
   - rejects -> `rejected` (resubmit semantics depend on implementation policy).

## 3.3 Bounty Flow

1. Admin creates bounty in `open`.
2. User claims bounty -> remains in `pending` but is interpreted as "claimed/in progress" while `proof_s3_key` is empty; assignee and due date are set.
3. User submits proof -> still `pending`, now explicitly review-ready because `proof_s3_key` is present.
4. Admin:
   - approves -> `approved`,
   - rejects -> returns to `open` and clears assignment/proof.
5. Overdue bounty handling should avoid fine logic used for mandatory duties.

## 3.4 Ad-Hoc Request Flow

1. User submits ad-hoc request with proof.
2. System creates task directly in `pending` and assigns to requester.
3. Admin:
   - approves -> points awarded and task accepted,
   - rejects -> request removed or denied according to policy.

## 4) Mutation Behavior Rules

### Housing admin: recurring scope → collections written

UI scope labels map to `RecurringMutationScope` on server actions. Cron reads **`housing_schedules`** for `ensureFutureTasksJob` / `triggerNextInstance`; if the schedule row is wrong, new instances can ignore an edit that only touched **`housing_assignments`**.

| UI / scope | Entry point | `housing_schedules` | `housing_assignments` | Cron can ignore edit if schedule wrong? |
| --- | --- | --- | --- | --- |
| **This instance** | `updateTaskAction` / `deleteTaskAction` → `AdminService` | No | Yes (single row) | No (next instance uses unchanged schedule) |
| **This + future** (edit) | `updateTaskAction` → `ScheduleService.updateTaskThisAndFuture` | Yes — **first** (`title`, `description`, `points_value`, `assigned_to`, optional `lead_time_hours` via `scheduleLeadTimeHours`, `last_generated_at`) | Yes — current row + non-final rows with `due_at >= effectiveFrom` | **Would** — schedule is updated in the same flow before rows |
| **Entire series** (edit) | `updateTaskAction` → `ScheduleService.updateTaskEntireSeries` | Same fields as this + future (entire non-final set) | Yes — current + all other non-final rows | **Would** — schedule updated first |
| **This + future** (delete) | `deleteTaskAction` → `ScheduleService.deleteTaskThisAndFuture` | Yes — `active: false` **before** deletes | Yes — current + matching future rows | N/A (schedule deactivated; no new instances) |
| **Entire series** (delete) | `deleteTaskAction` → `ScheduleService.deleteTaskEntireSeries` | Yes — `active: false` **before** deletes | Yes — peers then current row; throws if any delete fails | N/A |
| **Lead time only** (recurring edit modal) | Same `updateTaskAction` with `scheduleLeadTimeHours` in options (no separate second action) | Yes | Yes — unlock/status on open/locked rows when lead time changes | **Would** if only assignments changed |

**Already correct (audit, no code change needed for behavior):**

- `createScheduleAction` → `ScheduleService.createSchedule`: writes schedule then first assignment.
- `approveTaskAction` → `verifyTask` + `triggerNextInstance`: reads schedule for next instance (schedule must already match series intent).
- `adminReassign` / `rejectTask` / non-recurring paths: assignment-only by design.
- `updateScheduleLeadTimeAction` → `ScheduleService.updateSchedule`: direct schedule + scoped row recalculation when lead time changes without a task edit (still valid).

### Create Task

- Allowed only for housing admins.
- Must validate:
  - required title/type,
  - valid points/execution limits for bounty/project variants,
  - due dates are parseable and policy-compliant.
- Should set default status and notification level based on visibility.

### Update Task

- Allowed only for housing admins.
- Must not allow invalid status transitions.
- Editing schedule-derived metadata should preserve schedule integrity.

### Delete Task

- Allowed only for housing admins.
- Should fail clearly if task is not found.
- Historical audit concerns should be considered for already-approved records.
- For recurring deletions using `this_and_future` or `entire_series`, the schedule is soft-deactivated (`active: false`) before future-row cleanup to prevent cron resurrection races.

### Claim / Unclaim

- Claim:
  - requires task in `open`,
  - sets assignee and execution due date when applicable,
  - transitions to `pending` as "claimed/in progress" state.
- Unclaim:
  - requires caller owns current assignment,
  - restores task to `open` and clears assignment-specific due date where appropriate.

### Submit Proof

- Requires caller owns assigned task.
- Must reject submissions after expiry.
- On success stores proof key and remains `pending` (review-ready is inferred from `proof_s3_key`).

### Review (Approve / Reject)

- Allowed only for housing admins.
- Approve:
  - transitions to `approved`,
  - triggers points workflow and notifications,
  - should rollback status when critical side effects fail.
- Reject:
  - behavior varies by task type (`bounty` often returns to pool; `ad_hoc` may be deleted).

## 5) Edge-Case Matrix

## 5.1 Auth and Role Failures

- Missing/invalid JWT -> explicit authentication failure.
- Authenticated but no Brother role -> unauthorized baseline access failure.
- Brother but not housing admin invoking mutation -> role-specific denial.
- Discord API temporary failure while checking roles -> safe failure mode; no mutation.

## 5.2 Environment and Infrastructure Failures

- Appwrite endpoint/project mismatch -> database operation failure.
- Appwrite key lacks scope -> operation denied by backend.
- Discord token/guild/role mismatch -> verification/notification failures.
- S3 upload/read failure during proof paths -> submission/review failure with actionable message.

## 5.3 Data Consistency Failures

- Task not found during mutation -> deterministic not-found error.
- Task no longer in expected status (race or stale UI) -> conflict-style rejection.
- Assigned user mismatch during submit/unclaim -> ownership error.
- Unknown schema attributes from persistence layer -> validation/parsing failure.

## 5.4 Time and Scheduling Edge Cases

- `unlock_at > due_at` should never be generated.
- Recurrence generation should avoid creating overdue instances on recovery paths.
- Expiry check must use consistent timezone assumptions.
- Cron runs should be idempotent enough to avoid repeated destructive side effects.
- `open` tasks whose due time has passed should not remain user-actionable in dashboard views; they must be transitioned to `expired` by canonical expiry logic or hidden until transition completes.

## 5.5 Notification Edge Cases

- Notification delivery failure should not silently mark notification stage complete when retry is desired.
- **Expired task alerts (duty / one-off / project; not bounties)** use a **primary** path and a **secondary** path:
  - **Primary — housing admin channel**: Treat as the critical path for admins. The system must not advance to the final `notification_level: expired` until this step has succeeded at least once for the task.
  - **Secondary — assignee DM**: Less critical for admin awareness but still required before the flow is considered complete.
- **Partial failure rules**:
  - Channel fails: do not send the assignee DM yet; leave `notification_level` below `expired_admin`; retry both channel and DM on a later run.
  - Channel succeeds, DM fails: set `notification_level` to `expired_admin` so the next cron pass skips repeating the channel alert and only retries the DM; after DM succeeds, set `notification_level` to `expired`.
  - Unassigned expired tasks: mark `expired` without DMs (no assignee); admins still see the task in data if needed.
- Unlock and recurring notification stages should persist completion only after successful delivery.
- Urgent reminder threshold is `12` hours before `due_at`.

## 6) Error Surface Expectations

Client-facing errors should be categorized (not generic):

- `AUTHENTICATION_REQUIRED`
- `INSUFFICIENT_ROLE`
- `VALIDATION_ERROR`
- `DATABASE_ERROR`
- `EXTERNAL_SERVICE_ERROR`
- `UNKNOWN_ERROR`

User messaging should be actionable but not leak sensitive internals. Detailed diagnostics belong in server logs.

## 7) Observability Expectations

For staging QA and production readiness:

- Log task mutation context with task id/type and operation name.
- Include error class/code in mutation failures.
- Keep secret values redacted.
- Prefer structured log lines for grepability in CI/platform logs.

## 8) Verification Checklist (Behavioral)

Minimum walkthrough before production merge:

1. Login flow reaches dashboard successfully.
2. Housing admin creates:
   - one-off duty,
   - bounty,
   - recurring schedule.
3. Non-admin cannot create/update/delete tasks.
4. Assigned user can submit proof for valid tasks.
5. Admin can approve/reject and see expected outcomes.
6. Overdue paths trigger expected expiry behavior.
7. Error paths provide distinct, understandable feedback.

## 9) Related Documents

- [Product Definition](product.md)
- [Architecture](architecture.md)
- [Deployment Workflow](deployment.md)
- [Staging Environment Setup Spec](spec/current/staging-environment-setup.md)
- [QA Audit and Staging Hardening Spec (Archived)](spec/archive/qa-audit-and-staging-hardening.md)
