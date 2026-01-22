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
  - **Deep Audit**: Removed `any` type usage across `lib/services` and `lib/actions`. Enforced strict DTOs (`CreateAssignmentDTO`, `CreateResourceDTO`) ensuring full type safety between Client and Server Actions. Fixed client-side Modal payloads to match Schema. Fixed build errors in Housing components (`DutyRoster`, `ProofReviewModal`, `TasksService`). Replaced `any` in `tasks.service.ts` `adminReassign` with `Partial<CreateAssignmentDTO>`.
  - **Structure Upgrade**: Merged `LedgerPage` into `DashboardHome`. Moved logic to reusable `PointsHistory` component. Removed `/dashboard/ledger` route and updated navigation (Sidebar/Mobile) to match.
  - **Visual Consistency**: Created shared `Loader` component. Standardized Loading states across `HousingPage`, `PointsHistory`.
  - **UI/UX Polish**: Renamed Sidebar items to "Tasks" and "Library" for simplicity. Standardized Housing Dashboard to have consistent "Loading" spinners and "Boxed/Dashed" empty states for both "My Responsibilities" and "Bounties". Verified Mobile consistency.
  - **Leaderboard Logic**: Implemented `getMyRankAction` to fix "Your Rank: #-" issue. Component now fetches personal rank in parallel with Top 5.
  - **Critical ID Correction**: Fixed `HousingStats` and `LeaderboardWidget` using Auth ID instead of Discord ID for database lookups. Updated `README.md` with explicit Data Architecture usage guide. Removed hardcoded Mock Data from Housing Widget.
  - **Upload Hardening**: Increased Limit to 10MB. Rebuilt HEIC support using **Server-Side Conversion** (via `heic-convert`) to eliminate browser compatibility issues. Added `Loader` UI.
  - **Rejection Flow**: Enhanced `rejectTask` logic. Deadline passed = Delete & Penalty (-50pts). Time remaining = "Rejected" status & allow resubmit. UI updated to show red "Rejected" status.
  - **Mobile UI Polish**: Overhauled mobile layout for Housing and Library dashboards. Implemented dark-mode navigation bar (`bg-stone-950`), centered headers, compact stats cards, and responsive button groups for native-app feel.

## 2026-01-18: User Sync Logic Repair

- **Bug Fix**:
  - **New User Sync**: Corrected `getProfileAction` in `lib/actions/auth.actions.ts` to call `AuthService.syncUser` (create/update) instead of `AuthService.getProfile` (read-only). This ensures new Discord users are properly added to the `users` collection upon their first session check.
  - **Resilience**: Added a Fallback mechanism. If `syncUser` fails (e.g., Discord API 429/500), the system gracefully degrades to reading the existing profile, preventing login blocking for returning users during API outages.

## 2026-01-21: ID Strategy Refactor & "Ghost ID" Fix

- **Problem**: Persistent `409 Conflict` errors during new user creation, caused by a corrupt Appwrite Unique Index on `discord_id` (a "Ghost Document" existed in the index but not the collection).
- **Fix (Database)**:
  - Wiped and Recreated the `users` collection (`scripts/recreate-collection.ts`).
  - Restored users with **Random Document IDs** (`ID.unique()`).
  - Re-indexed `discord_id` as a Unique Attribute.
- **Fix (Codebase)**:
  - Refactored `AuthService.syncUser` to use `ID.unique()`.
  - Updated `dashboard.actions.ts` (`getMyRankAction`) to support looking up users by either Document ID or Discord ID.
  - Updated `LeaderboardWidget` to respect the new ID structure.
- **Status**: Login, Signup, and Leaderboards are fully functional. No more 409 loops.

## 2026-01-21: Final Infrastructure Audit & Hardening

- **Notifications & Cron**:
  - Implemented `NotificationService` for Discord DMs and Admin Channel pings.
  - Created `/api/cron` endpoint protected by `CRON_SECRET`.
  - Configured **GitHub Actions** (`.github/workflows/cron.yml`) to trigger the cron job hourly.
- **ID Strategy Enforcement ("Under No Circumstances")**:
  - **Audit**: Comprehensive scan of `housing.actions.ts`, `ledger.actions.ts`, and `library.actions.ts`.
  - **Backend Fixes**: Patched `claimTaskAction`, `reassignTaskAction`, `createTaskAction`, `getHistory`, `getMyTasks` to **strictly** use `profile.discord_id`.
  - **Frontend Fixes**: Updated `DutyRoster` and `CreateOneOffModal` to ensure they submit `discord_id` (not Doc ID) during assignment.
  - **Verification**: `npm test` and `tsc` passed with 0 errors.

- **Bug Fix (Library Upload)**:
  - **Issue**: "No Session" error during file upload even with JWT support enabled.
  - **Cause**: The Client Component (`app/dashboard/library/upload/page.tsx`) was calling `getMetadataAction()` without passing the JWT, causing the server to fall back to (missing) cookies.
  - **Fix**: Updated `page.tsx` to explicitly generate a JWT via `account.createJWT()` and pass it to the Server Action.

## 2026-01-21: Event-Driven Architecture & Distributed History

- **Architecture Refactor**:
  - Implemented **Domain Event Bus** (`lib/events/dispatcher.ts`) to decouple business logic.
  - Moved Point Awarding logic out of Services into `PointsHandler` (`lib/events/handlers/points.handler.ts`).
  - Services now emit events (`LIBRARY_UPLOADED`, `TASK_APPROVED`) instead of calling side-effects directly.
- **UI Overhaul (Distributed History)**:
  - Removed global `PointsHistory` component from Dashboard.
  - **Housing Widget**: Now displays recent "Tasks & Fines" directly on the card.
  - **Library Widget**: Now displays recent "Upload Contributions" directly on the card.
  - **Backend**: Updated `getDashboardStatsAction` to perform parallel, categorized queries for efficient data loading.
- **Scheduler Upgrade**:
  - Replaced legacy simple interval with full **RRule Support** (`rrule` library).
  - Added `lead_time_hours` configuration to Schedules.
  - Tasks now "Unlock" at specific times before the RRule due date, enabling complex weekly schedules (e.g., "Fridays at 5 PM").
- **Verification**:
  - Validated Scheduler logic via `scripts/test-scheduler.ts`.
  - Validated Event System via `npm test` and manual walkthrough.

## 2026-01-21: Discord Refactor & UI Fixes

- **Discord Notifications**:
  - Introduced **Notification Matrix** with standardized messages: Unlock, Halfway, Assigned, Updated, Approved, Rejected, Unassigned.
  - Replaced boolean `reminded` with enum `notification_level` (`none`, `unlocked`, `halfway`, `urgent`) in DB schema.
  - Refactored `NotificationService` with `sendNotification(userId, type, payload)` helper that appends **Magic Links**.
  - Updated `TasksService.runCron` to implement multi-stage notifications (Unlock at start, Halfway at 50% duration).
- **Discord Commands**:
  - **Added**: `/duty` (one-off with due date), `/schedule` (recurring with day/time), `/bounty`, `/leaderboard`.
  - **Removed**: Legacy ID-based commands (`/claim`, `/submit`, `/approve`, `/reject`, `/reassign`).
  - Commands use **ephemeral responses** (private to invoker) except `/leaderboard` (public).
  - Updated `register-commands.ts` to support Guild-specific commands for instant visibility.
- **Admin Edit Feature**:
  - Implemented `updateTaskAction` for Admins to modify task title, description, points, assignee, and due date.
  - Created `EditTaskModal` component with full form and validation.
- **UI Fixes**:
  - **Unclaim Bug**: Fixed silent failure caused by ID mismatch (`profile.$id` -> `profile.discord_id`).
  - **TaskCard**: Removed misplaced Edit button from cards.
  - **Master Task Roster Overhaul**: Now shows all task types (Bounty, Recurring, One-off), filters old tasks (>7 days), displays Type/Status/Due Date columns, and has edit button on hover for admins.

## 2026-01-22: Logic Hardening & UX Polish

- **Critical Logic Verified**:
  - Enforced `due_at` for assigned duties. prevent past dates and time-travel (`unlock_at` > `due_at`).
  - Added 10MB file size limit validation on client-side.
  - Added min/max validation for Points and Duration in Bounty creation.
- **UX Improvements**:
  - **TaskCard**: Always show Due Date for claimed tasks. Removed "Risk: -50 PTS" badge (reverted).
  - **Status Logic**: Fixed bug where Approved tasks showed as "Under Review". Added explicit "Completed" status.
  - **Persistence**: Approved tasks now remain visible for 24h before archiving.
  - **Feedback**: Added Loading Spinner for Proof images.
- **Resilience**:
  - Wrapped Notification Service in try/catch to prevent Discord API outages from blocking app/db operations.
- **Bug Fixes**:
  - **Admin Visibility**: Fixed regression where pending approvals from other users were invisible to Admins. Added `getPendingReviews` fetch for Admin users.
- **Refactor**:
  - **Date-Only Migration**: Removed time inputs from Modals and Discord Commands. All deadlines now default to **12:00 PM (Noon)** local/server time to reduce ambiguity.
  - **Discord UX**: Added `description` field to `current_schedule` command and clarified date formats in tooltips.
  - **Bounty Logic**: Refactored `unclaimTask` and `rejectTask` to explicitly clear `due_at` dates. This ensures available bounties never show a deadline until claimed.
  - **Feedback**: Added Loading Spinner to "Claim Bounty" button.
  - **Admin Controls**: Implemented Hybrid Editing for Bounties (Restricted fields, Safe Delete) to prevent misalignment. Added `deleteTaskAction`.
  - **Master Roster**: Locked completed tasks (`status='approved'`) from being edited to preserve historical data.
  - **Strict Expiry**: Implemented Cron Logic to fine/expire overdue duties and unclaim overdue bounties. submission is now strictly blocked after due date.
  - **Lazy Consistency**: Implemented "Just-in-Time" processing in `getMyTasks` to immediately unlock ready tasks and expire overdue ones. **Added Filter** to hide expired tasks from user view.
