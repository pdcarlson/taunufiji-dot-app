# Housing Behavior Reference

This document is the durable behavioral reference for the Housing module.

- **Specs** in `spec/` define planned implementation work and rollout status.
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
- `pending`: claimed/assigned work in progress; if `proof_s3_key` is present, it is explicitly awaiting admin review
- `approved`: accepted and closed
- `rejected`: denied after review and potentially resubmittable (type-dependent)
- `expired`: missed deadline / no longer completable

### Notification Levels

- `none`: no delivery stage completed
- `unlocked`: initial availability notification sent
- `urgent`: urgent warning sent
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
4. Assigned user submits proof -> `pending`.
5. Admin approves -> `approved`.
6. Next recurring instance is generated.
7. If missed deadline, task transitions to `expired` and fine behavior is triggered.

## 3.2 One-Off Duty Flow

1. Admin creates one-off task, usually assigned to a user.
2. Task is immediately `open` unless otherwise specified.
3. Assigned user submits proof -> `pending`.
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
- On success stores proof key and enters `pending`.

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

## 5.5 Notification Edge Cases

- Notification delivery failure should not silently mark notification stage complete when retry is desired.
- Critical dual-notification paths (admin channel + user DM) should only mark complete after required deliveries succeed.

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
- [Staging Environment Setup Spec](../spec/staging-environment-setup.md)
