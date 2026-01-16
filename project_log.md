# Project Log

## 2026-01-12: Housing V2 - Scheduels & Bounties

- **Feature Completion**: Implemented full UI for Creating Recurring Schedules and Posting Bounties.
- **UX Improvements**:
  - Replaced Manual User ID entry with a Dynamic Member Dropdown in `CreateScheduleModal` (Backed by `getMembers` in `TasksService`).
  - Renamed "Expires In" to "Time to Complete" for Bounties to clarify logic.
- **Data Migration**:
  - Added `active` attribute to `housing_schedules` (via migration).
  - Added `points_value` and `execution_limit` attributes to `assignments` (via migration) to support V2 features.
- **Bug Fixes**:
  - Fixed `TasksService.getMembers is not a function` error.
  - Fixed `user.full_name` vs `user.name` type mismatch in `page.tsx`.
  - Fixed "Failed to post bounty" silent error by adding proper `console.error` and error return values in Server Actions.

## 2026-01-12: Universal Discord ID Migration

- **Architecture Change**: Switched Housing and Library modules to use **Discord IDs** instead of Auth IDs for data ownership. This prepares the system for future Discord Bot integration.
- **Refactor**:
  - `AuthProvider`: Now fetches and exposes `profile.discord_id`.
  - `Housing`: Frontend now filters "My Responsibilities" using Discord ID.
  - `Library`: Stats and Uploads now linked to Discord ID.
- **Fixes**:
  - Fixed `PointsService.getLeaderboard` reference error.
  - Fixed `AuthProvider` syntax error.
  - Corrected `housing.actions` logic to align with new ID strategy.
- **Note**: "Clean Slate" applied; old tasks/stats using Auth IDs are no longer visible to users.

## 2026-01-12: Housing UI Polish & Fixes

- **UI/UX Improvements**:
  - **Sorting**: Tasks now sorted by urgency (Due/Expires Soonest). "Under Review" tasks moved to bottom.
  - **Visuals**: "Under Review" tasks are now greyed out in "My Responsibilities".
  - **Timers**: Fixed Bounty countdown timer (removed invalid 24h offset).
  - **Actions**: Restricted "Claim/Unclaim" for Duties (Admin Only). Implementation of "Upload Proof" logic refined.
- **Review Process**:
  - **Better Modal**: Review Modal now fetches and displays real submitter name (via Discord ID resolution).
  - **Secure Images**: Implemented `getReviewDetailsAction` to generate Signed S3 URLs for proof images.
  - **Efficiency**: Removed "Confirm Approval" popup for faster workflow.
- **Bug Fixes**:
  - Fixed `Hydration Error` by suppressing warning on body (Extension conflict).
  - Fixed `CreateScheduleModal` sending Auth ID instead of Discord ID.
  - Fixed `ProofReviewModal` runtime error (null safety).

## 2026-01-13: Housing V2.1 Refinements

- **Master Roster Logic**:
  - **Unassign/Reassign**: Implemented `adminReassign` in `TasksService` to handle unassignment (setting `assigned_to` to null) and reassignment cleanly.
  - **Fairness Algorithm**: When reassigning a recurring duty, the deadline is now reset to `Now + Interval` to give the new assignee the full duration.
- **UI Polish**:
  - Renamed "Command Center" to "Home".
  - Added Dynamic Page Titles (Server-side metadata layouts).
  - Fixed "Active Tasks" count on dashboard to correctly filter by Profile ID.

## 2026-01-15: Production Readiness & Auth Fixes

- **Infrastructure & Security**:
  - **Custom Domain**: User configured `taunufiji.app` to resolve Third-Party Cookie blocking issues on Safari/iOS. Backend mapped to `appwrite.taunufiji.app`.
  - **Login Loop Fix**: Updated `.env.local` to use the new First-Party Endpoint.
  - **New User Safety**: Patched `AuthService.syncUser` to include default `position_key: "none"` to prevent silent failures during account creation.
- **Build Stability**:

  - **Typos & Types**: Fixed `getDashboardStatsAction` return type (missing `fullName`) and `TaskCard` status colors (missing `expired`/`locked`) to pass `npm run build` with Exit Code 0.

  - Removed Point Inputs for Duties (defaulting to 0) to streamline Admin workflow.

- **Documentation**:
  - Created `task_workflows.md` detailing the state machine for Recurring, One-Off, and Bounty tasks.

## 2026-01-16: Codebase Hardening & Audit

- **Security**:
  - **Verified RBAC**: Confirmed all Server Actions use `verifyBrother` guards.
  - **Documentation**: Added strict "Security Model" and "Database Schema" sections to `README.md`.
- **Testing**:
  - **AuthService**: Added full unit test suite logic (`verifyRole`, `syncUser`) to ensure security logic doesn't regress.
  - **LibraryService**: Fixed existing tests and added `search` coverage.
  - **PointsService**: Fixed logger mock to pass tests.
- **Cleanup**:

  - Deleted `logs/` directory.
  - Archived old migration scripts in `scripts/archive/`.
  - Audit passed with **0 TODOs**.

- **Bug Fixes**:
  - **Library Metadata 500 Error**: Refactored `api/library/metadata` to use `LibraryService.getSearchMetadata()` (Server-Side Admin Client) instead of Client Session, bypassing the strict 0-permission DB policy.
  - **Upload Session Error**: Refactored `uploadFileAction` to use JWT-based authentication (passed via FormData) instead of Cookie-based session, resolving cross-domain `No session` errors.
  - **Repo Consistency**: Moved `__tests__/library.test.ts` to `lib/services/library.service.test.ts` to match colocation pattern. Validation passed.
  - **Points System Repair**: Fixed ID Mismatch where `library.actions.ts` and `ledger.actions.ts` used Auth ID instead of Profile ID (Discord ID), causing silent failures. Hardened `PointsService` to throw explicit errors if user not found.
  - **Deep Audit**: Removed `any` type usage across `lib/services` and `lib/actions`. Enforced strict DTOs (`CreateAssignmentDTO`, `CreateResourceDTO`) ensuring full type safety between Client and Server Actions. Fixed client-side Modal payloads to match Schema.
