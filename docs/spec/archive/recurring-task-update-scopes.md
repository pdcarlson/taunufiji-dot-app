# Spec: Recurring Task Update Scopes and Time Consistency

## Status

complete

## Problem

Editing or deleting a recurring duty from the master task roster currently applies to a single task instance only. Because the parent schedule remains active, cron regeneration recreates future tasks and appears to "undo" user intent. The current date handling is also inconsistent across web UI and Discord schedule creation paths, causing visible off-by-one behavior and mismatched due dates.

## Requirements

### Functional

- [x] Editing/deleting recurring duties from the roster must always prompt for scope:
  - `This instance`
  - `This + future` (default)
  - `Entire series`
- [x] `This instance` affects only the selected task row.
- [x] `This + future` affects the selected row and all future generated instances from that due date forward, leaving historical rows untouched.
- [x] `Entire series` affects schedule metadata and all non-finalized generated rows in the series.
- [x] Explicit cancellation intent must not be resurrected by cron jobs.
- [x] Schedule mutations for recurring edits must use a single-schedule, effective-from strategy.

### Non-Functional

- [x] Time semantics use chapter-local behavior (`America/New_York`) as source of truth.
- [x] Stored date-time values remain ISO timestamps for persistence compatibility.
- [x] Existing clean architecture boundaries remain intact (presentation -> application -> domain <- infrastructure).

## Acceptance Criteria

- [x] Deleting with `This + future` prevents the same recurring task from reappearing in later cron cycles.
- [x] Editing with `This + future` updates schedule-derived future tasks while preserving past completed/expired history.
- [x] Editing with `This instance` does not mutate schedule recurrence.
- [x] Recurring schedules created from web UI and Discord resolve to equivalent ET due moments.
- [x] ET boundary and DST transitions produce expected due/unlock values in tests.

## Technical Approach

1. Introduce a shared mutation scope contract used by UI modal, server actions, and services.
2. Add service methods for scope-aware recurring updates/deletes using an effective-from date.
3. For schedule-level cancellation/mutation, remove unlocked/open/pending/locked future rows at or after effective date and update schedule metadata.
4. Update cron self-heal logic to skip schedules marked inactive and avoid recreating intentionally canceled chains.
5. Normalize RRULE generation between web and Discord command paths to ET-based rules with explicit `DTSTART;TZID=America/New_York`.
6. Add ET-safe conversion helpers for date-only UI input/output.

## Out of Scope

- Schema redesign requiring schedule splitting.
- Rewriting historical records that are already approved/expired.
- Adding database migrations for new schedule fields.

## Dependencies

- [Staging Environment Setup](../current/staging-environment-setup.md)
- [Behavior Reference](../../behavior.md)
- [Architecture](../../architecture.md)

## References

- Affected UX: `components/features/housing/EditTaskModal.tsx`
- Affected services: `lib/application/services/housing/admin.service.ts`, `lib/application/services/housing/schedule.service.ts`
- Affected jobs: `lib/application/services/jobs/handlers/ensure-future-tasks.job.ts`
