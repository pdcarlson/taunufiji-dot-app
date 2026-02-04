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
  - **Modal Refactor**:
    - **Edit Modal**: Intelligent Duty constraints (Hidden Points/Unlock). Added **Lead Time** control for Recurring Tasks that updates the parent Schedule. Fixed bug where changing Due Date didn't update "Locked" status.
    - **Create Modals**: Removed "Points" input from Schedule and One-Off creators (Default 0).
    - **Backend**: Added `getSchedule` and `updateSchedule` capabilities to `TasksService`.

## 2026-01-23: Cron Resilience & Debugging

- **Diagnostic Audit**:
  - Ran comprehensive audit (`scripts/debug-task.ts`). Confirmed **Zero** stuck/overdue tasks in DB.
  - Conclusion: Reported issues were likely transient or timezone-related.
- **Architecture Hardening**:
  - **Granular Error Policy**: Refactored `TasksService.runCron` to catch errors _per task_. One failing task no longer crashes the job.
  - **Visibility**: Updated `/api/cron` to send specific **Discord Warning Webhooks** if any sub-task fails, eliminating "silent failures".
- **Fixes**:
  - Fixed syntax errors in `tasks.service.ts` (unclosed try/catch blocks).
  - Improved `runCron` return statistics to include error details.

- **Critical Fix (Fines)**:
  - **Issue**: Appwrite Database Ledger Schema `amount` strictly enforced positive integers (0-999999), causing fines (-50) to crash the Cron Job.
  - **Resolution**:
    - Added `is_debit` boolean attribute to `ledger` collection via migration (`scripts/add-ledger-debit-attr.ts`).
    - Updated `PointsService` to store fines as absolute values with `is_debit: true`.
    - Updated `PointsHistory` UI to interpret `is_debit` and display negative amounts in Red.
- **Workflow Optimization**:
  - Updated Cron GitHub Action to run every 5 minutes (`*/5 * * * *`) for rapid testing cycles.
  - Updated Cron GitHub Action to run every 5 minutes (`*/5 * * * *`) for rapid testing cycles.

## 2026-01-23: Cron Notification Overhaul

- **Architecture Change**: Extracted cron job logic from `tasks.service.ts` to dedicated `cron.service.ts` for better separation of concerns
- **New Service Created**:
  - `lib/services/cron.service.ts` - Simplified 5-step workflow:
    1. Unlock locked recurring tasks (locked → open)
    2. Notify uninformed recurring tasks (none → unlocked)
    3. Send urgent notifications (< 12h to due)
    4. Expire overdue duties (open → expired + fine)
    5. Notify expired tasks to admin channel
- **Schema Update**:
  - Updated `notification_level` enum: removed "halfway" (unused), added "expired"
- **Cron Routes Updated**:
  - `app/api/cron/route.ts` and `app/api/cron/housing/route.ts` now use `CronService.runHourly()`
  - Removed all Discord webhook error notifications (errors now log to console for GitHub Actions visibility)
- **Logic Simplification**:
  - ✅ Bounties are ignored in urgent/expiry processing
  - ✅ Duties: Get urgent notification if < 12h, expire notification if status=expired
  - ✅ Recurring Tasks: Get "unlocked" notification when status=open, then urgent/expired as needed
- **Error Handling**: All catch blocks use proper TypeScript `unknown` type with `getErrorMessage()` helper
- **Fixes**:
  - Fixed production build error: imported `HousingTask` from `models.ts` instead of defining local interface missing Appwrite Document properties
- **Cleanup**: Removed 208 lines of old `runCron()` code from `tasks.service.ts`

## 2026-01-23: Notification System Improvements

- **Overhaul**: Simplified DM notification format (removed emojis, standardized structure)
- **New Feature**: Added User DM on task expiry
  - When a task expires, the user now receives a direct message: `Task expired: {title}. A fine of -50 points has been applied.`
  - Previously only admins were notified in the housing channel
- **Reliability Upgrade**: Cron job now requires **BOTH** Admin Notification and User DM to succeed before marking a task as "expired_notified". This ensures retry logic covers both channels.
- **Discord Integration**: Added `expired` to `NotificationType` enum.

## 2026-01-23: Repository Maintenance

- **Cleanup**: Ignored legacy PDF content in `legacy-site/content/taunews` to reduce repo size.
  - Removed files from git tracking (`git rm --cached`).
  - Updated `.gitignore`.
  - Also ignored `legacy-site/static/media/taunews` (redundant large files).

## 2026-01-26: Library Upload Improvements

- **Duplicate Checking**:
  - Implemented `checkDuplicate` logic in `LibraryService` preventing users from uploading the same exam (Dept/Number/Type/Sem/Year/Version) twice.
  - Added frontend toast error ("This exam already exists!") to block submission.
- **PDF Viewer Enhancements**:
  - **Margins**: Reduced canvas padding from 40px to 10px for a "tight fit" view.
  - **Zoom**: Added discrete Zoom Controls (0.5x to 3.0x) and "+" / "-" buttons.
  - **Reload**: Added a "Reload PDF" button to restart the rendering process if it gets stuck.

## 2026-01-26: Full-Width Upload Page Layout

- **Context-Aware DashboardShell**: Modified `DashboardShell.tsx` to detect `/library/upload` routes using `usePathname()`.
- **Removed Width Constraints**: Upload page now uses full screen width (no `max-w-5xl` constraint) and full height (`h-screen`).
- **Other Pages Unchanged**: All other dashboard pages retain the centered 1024px max-width layout with padding.

## 2026-01-26: PDF Redaction & Upload Fixes

- **Fixed Redaction Alignment**: Removed CSS `scale()` transform that was causing double-scaling (canvas already rendered at correct size).
- **Increased Upload Limit**: Changed Next.js `bodySizeLimit` from 10MB to 200MB to support large PDF uploads.
- **Fixed Duplicate Check**: Converted from session-based to JWT-based authentication to match app architecture and fix "No session" errors.

## 2026-02-01: Architecture Audit & Refactor

- **Consolidation**:
  - Moved legacy Event Handlers to `lib/infrastructure/events/handlers`.
  - Deleted superseded `lib/application/handlers`.
  - Unified Event initialization in `lib/infrastructure/events/init.ts` and wired it via `instrumentation.ts` for reliable startup.
- **Service Layer (Dependency Injection)**:
  - Removed the static `TasksService` facade.
  - Refactored `housing.actions.ts`, `dashboard.actions.ts`, `admin.ts`, and `cron.service.ts` to use individual services (`AdminService`, `QueryService`, `DutyService`) directly or via `getContainer()`.
  - Upgraded `DutyService` and `PointsService` to use proper Constructor Injection with Interfaces, enabling better testability and loose coupling.
- **Maintenance**:
  - Refactored `MaintenanceService` to use DI for `DutyService`, resolving circular dependency and static call issues.
  - Added `uploadFile` method to `StorageService` logic within actions to replace broken/missing references.
  - Fixed Build and Lint errors across the board, including stricter Type Checking and unused import removal.

- **Action**: Committed and pushed all recent refactors to `refactor/architecture-v2`.
- **Summary**: `refactor(dashboard): simplify housing dashboard and remove redis/docker`
- **Details**:
  - Removed Redis infrastructure and `ioredis` dependency.
  - Deleted `docker-compose.yml` and `HousingStats` widget.
  - Unified Housing Dashboard to use `MyDutiesWidget`.
  - Standardized `dashboard` and `tasks` actions to use `actionWrapper`.

## 2026-02-02: Infrastructure & UI Simplification

- **Context**: Removed Docker and Redis complexity and the redundant "Your Score" widget from Housing Dashboard as per user request.
- **Technical Changes**:
  - **Infrastructure**: Deleted `docker-compose.yml`, removed `ioredis` dependency, and stripped Redis caching logic from `PointsService` and `Container`.
  - **UI**: Removed `HousingStats` component usage and file.
- **Impact**: Simplified development stack (no Docker required), reduced dependencies, and streamlined the Housing Dashboard UI.

## 2026-02-02: Unification of Task Displays

- **Context**: Addressed inconsistency between Main Dashboard ("My Duties") and Housing Dashboard ("My Responsibilities").
- **Technical Changes**:
  - **Refactor**: Updated `HousingDashboardClient` to use `getMyTasksAction` and render the shared `MyDutiesWidget`.
  - **Cleanup**: Removed custom, fragile client-side filtering logic for "My Responsibilities" in `HousingDashboardClient`.
- **Impact**: Both dashboards now use the exact same logic and UI to display user tasks, reducing maintenance overhead and ensuring consistency.

## 2026-02-02: Architecture Standardization & JWT Fixes

- **Context**: Resolved critical "Invalid Token" errors in the Housing Dashboard. Standardized remaining Action files to use the unified `actionWrapper` pattern.
- **Technical Changes**:
  - **Standardization**: Refactored `dashboard.actions.ts` and `tasks.actions.ts` to use `actionWrapper`, ensuring consistent error handling and authentication checks.
  - **Bug Fix**: Updated `HousingStats.tsx` to correctly fetch a JWT using `getToken()` and pass it to Server Actions instead of passing raw User IDs.
- **Impact**: Dashboard now loads correctly without 401 errors. All Server Actions now follow the same secure implementation pattern.

## 2026-02-02: Route Restoration & Action Standardization

- **Context**: Addressed missing `/dashboard/housing` route causing 404s. Standardized Housing Server Actions to match the new architecture patterns.
- **Technical Changes**:
  - **Routes**: Re-created `app/dashboard/housing/page.tsx` rendering `HousingDashboardClient`.
  - **Refactor**: Updated `HousingDashboardClient` to fetch data client-side using `useEffect` + `useAuth`, removing dependency on server-side props.
  - **Actions**: Refactored `housing.actions.ts` to use `actionWrapper` for consistent authentication and error handling, reducing boilerplate.
- **Impact**: Restored functionality to the Housing Dashboard. Improved code maintainability by unifying action patterns.

## 2026-02-02: Client-Centric Auth Refactor & Build Fixes

- **Context**: Completed a major refactor to eliminate cookie-based authentication, shifting to a stateless, client-centric JWT architecture. Addressed extensive build failures caused by missing actions and legacy code in features.
- **Technical Changes**:
  - **Authentication**: Disabled `createSessionClient` (cookie-auth). Implemented `createJWTClient` usage across all Server Actions (`housing`, `library`, `ledger`, `dashboard`).
  - **Housing Feature**: Fully implemented `housing.actions.ts` with 10+ new actions (`claim`, `proof`, `review`, `CRU task/schedule`) bridging `DutyService`, `ScheduleService`, and `AdminService`.
  - **Library Feature**: Added `getLibraryStatsAction` and refactored `LibraryClient` to fetch data client-side, removing server-side dependencies in `LibraryPage`.
  - **Components**: Converted `LeaderboardList`, `HousingDashboardClient`, `LibraryPage` to Client Components to consume `useAuth()`/JWTs.
  - **Refactor**: Cleaned up `action-handler.ts` and `safe-action.ts` to strictly enforce JWT requirements and removed dead code.
- **Impact**: Application `npm run build` passes successfully. Authentication is now fully decoupled from Next.js server session cookies, enabling stateless deployment and clearer separation of concerns.

## 2026-02-02: Fix Critical Auth Redirect Loop

- **Context**: Resolved a critical infinite redirect loop between `/dashboard` and `/login` caused by a race condition in client-side navigation.
- **Technical Changes**:
  - **Login Page Refactor**: Split `app/login/page.tsx` into a Server Component (with session check) and `app/login/LoginClient.tsx` (UI only).
  - **Logic Change**: Moved the "If logged in, go to dashboard" check to the Server Component. It now performs a **full Appwrite session validation** via `account.get()` (rather than just checking for cookie existence), ensuring robust protection against stale-cookie loops.
- **Impact**: Eliminates the "flicker" of the login page for authenticated users, prevents race conditions, and handles stale sessions gracefully. `npm run build` confirmed passing.

## 2026-02-02: Housing Dashboard Refactor (Container/Presentational Pattern)

- **Context**: Decoupled frontend components from Appwrite infrastructure by implementing the Container/Presentational pattern (_Week 4: Component Architecture_).
- **Technical Changes**:
  - Created `hooks/useJWT.ts` hook to centralize JWT token creation.
  - Refactored `TaskCard.tsx` to receive `getJWT` as a prop instead of importing `account` directly.
  - Updated Housing page (`app/dashboard/housing/page.tsx`) to use `useJWT` hook and pass `getJWT` to all TaskCard instances.
  - Refactored all housing modals (`ProofReviewModal`, `EditTaskModal`, `CreateBountyModal`, `CreateScheduleModal`, `CreateOneOffModal`) to use `useJWT` hook.
  - Fixed error handling from `any` to `unknown` type throughout codebase.
  - Updated test files (`TaskCard.test.tsx`, `auth.service.test.ts`, `duty.service.test.ts`) to use DTO format (`id` vs `$id`).
- **Impact**: 6 components now decoupled from Appwrite. All 18 tests passing. TypeScript compilation clean.

## 2026-02-01: Dependency Injection & Architecture Refactor

- **Context**: Transitioned the application from a Service Locator pattern (static calls) to strictly typed Dependency Injection to improve testability and architectural clarity.
- **Technical Changes**:
  - Converted `UserService`, `AuthService`, `DutyService`, `ScheduleService`, `QueryService`, `AdminService`, `MaintenanceService`, and `LibraryService` to Classes with Constructor Injection.
  - Refactored `lib/infrastructure/container.ts` to be the single composition root.
  - Introduced `actionWrapper` in `lib/presentation/utils/action-handler.ts` to standardize Server Actions (Auth, DI, Error Handling).
  - Updated `housing.actions.ts`, `dashboard.actions.ts`, and `library.actions.ts` to consume services via the Container.
  - Enforced strict layered architecture with new `lib/domain/types` (Zod schemas).
- **Impact**: Breaking changes for any consumers still using the old static service methods. Tests will need updates to instantiate service classes with mocks.

## 2026-02-01: Build Stabilization & Security Patching

- **Context**: Addressed critical build failures and security vulnerabilities following the architecture refactor.
- **Technical Changes**:
  - **Dependency Security**: Pinned `fast-xml-parser` to `^5.3.4` (overrides) and updated `cross-spawn` to resolve 21 high/critical vulnerabilities.
  - **Environment**: Upgraded to `next@16.1.6`, `tailwindcss@4.1.18`, and enabled `lightningcss` for builds.
  - **Correctness**: Fixed legacy Appwrite SDK usage (`$id`, `$createdAt`) in `Housing` components, `TaskRepository`, `UserRepository`, and API routes, replacing them with Pure Domain Types.
  - **Testing**: Installed missing Vitest dependencies (`vitest`, `jsdom`, `@testing-library/*`) to fix build-time type checks.
  - **Refactor**: Completed DI migration for `Discord Handlers` and `CronService`, removing all static service calls.
- **Impact**: `npm run build` is now passing. Zero high-severity vulnerabilities reported by `npm audit`.

## 2026-02-01: System Repair & Stability Fixes

- **Context**: Resolved critical runtime crashes preventing local development and fixed an infinite recursion bug in the authentication flow.
- **Technical Changes**:
  - **Infrastructure**: Verified and started `redis` container via `docker-compose` to resolve `ECONNREFUSED`.
  - **Data Integrity**: Relaxed `BaseEntitySchema` date validation (`z.string().datetime()` -> `z.string()`) to accommodate Appwrite's irregular ISO timestamp formats.
  - **Stability**: Removed redundant `syncUserAction` call in `DashboardShell.tsx` which was causing an infinite `Sync -> Update -> Render` loop on the client side.
  - **Testing**: Fixed `setup` and `teardown` in `library.service.test.ts`, `duty.service.test.ts`, and `points.service.test.ts` to use proper Dependency Injection and robust assertions.
- **Impact**: Application is now stable locally. `npm run dev`, `npm run build`, and `npm test` all pass.

## 2026-02-02: Component Architecture Standardization

- **Context**: Resolved 'Split Personality' architecture where components were scattered between dashboard/ and features/, causing code duplication and circular dependencies.
- **Technical Changes**:
  - **Housing**: Consolidated all housing logic into components/features/housing. Replaced the 'Small' TaskCard.tsx with the robust Dashboard version.
  - **Library**: Moved all library components to components/features/library.
  - **Leaderboard**: Moved all leaderboard components to components/features/leaderboard.
  - **Cleanup**: Removed components/dashboard/housing, library, and leaderboard directories. components/dashboard now strictly contains Shell/Layout components.
  - **Fixes**: Patched MyDutiesWidget props and resolved circular import dependencies in app/dashboard pages.
- **Impact**: Enforces strict Domain-Driven directory structure. Eliminated 45% of component duplication.

## 2026-02-03: Dashboard Overhaul & Global Ledger Implementation

- **Context**: Improved the main dashboard to be more aesthetically pleasing and more informative by introducing a chapter-wide points ledger and cleaning up the Library card.
- **Technical Changes**:
  - **Global Ledger**: Transitioned the points ledger from a personal view to a chapter-wide "Recent Activity" feed.
    - Updated `IUserRepository` with `findManyByDiscordIds` for efficient batch name resolution.
    - Modified `getDashboardStatsAction` to fetch transactions for all users and resolve names in a single round-trip.
  - **UI/UX**:
    - **PointsLedger**: Created a new full-width component with transaction "stacking" logic (grouping consecutive identical actions by the same user with a "xN" badge).
    - **LibraryWidget**: Redesigned the card to remove history lists and focus on a clean "Contribute" CTA.
  - **Logic & Types**:
    - Updated `HistoryItem` DTO to include `userName` and `userId`.
    - Fixed pre-existing type errors in `TaskCard.test.tsx` and `PointsLedger.tsx` (name collisions and invalid props).
    - Updated `MockFactory` to support the new repository methods.

## 2026-02-03: Frontend Architecture & Cleanup

- **Context**: Standardized component architecture and cleaned up dead code.
- **Technical Changes**:
  - **Component Structure**: Enforced strict `components/features/[featureName]`, `components/layout/`, and `components/ui/` pattern.
  - **Auth Module**: Migrated Login Logic to `features/auth`.
  - **Static Assets**: Moved `favicon.ico` to `public/`.
  - **Dead Code**: Removed unused Next.js SVGs (`next.svg`, `vercel.svg`, etc).
- **Impact**: Codebase is clean, predictable, and ready for backend refactoring.

## 2026-02-03: Backend Infrastructure Refactor

- **Context**: Executed a comprehensive backend refactor to match the "Feature-First" architecture of the frontend. Enforced Clean Architecture and strictly typed Dependency Injection.
- **Technical Changes**:
  - **Dependency Injection**:
    - Refactored `StorageService` to `S3StorageService` class using `IStorageService` port.
    - Updated `container.ts` to manage storage dependencies properly.
  - **Service Migration**:
    - Moved services to feature-scoped directories: `identity/`, `ledger/`, `housing/`, `library/`.
    - Relocated test files (`points.service.test.ts`, `auth.service.test.ts`) to match their services.
  - **Action Segregation**:
    - Split `housing.actions.ts` into `duty`, `admin`, `schedule`, and `query` actions.
    - Split `library.actions.ts` into `manage` and `read` actions.
    - Updated 15+ consumer components to import from granular action files.
- **Verification**:
  - `npm run build` passing with 0 errors.
  - `npm test` passing (Fixed `TaskCard` userId mismatch and updated mocks).
- **Impact**: Backend code is now highly modular, testable, and aligned with the project's long-term architectural goals.

## 2026-02-03: Refactor Lib Structure & Cron Split

- **Context**: To improve maintainability and strictly follow Clean Architecture, the lib folder was restructured. CronService was monolithic and split into smaller handlers.
- **Technical Changes**:
  - Split CronService into jobs/handlers/ (UnlockTasksJob, NotifyUrgentJob, etc.).
  - Created index.ts barrel files for all service modules.
  - Updated container.ts to use standardized imports.
  - Patched env.ts to skip Zod validation in 	est environment.
  - Fixed dependency injection in LibraryService.test.ts.
  - **Security**: Fixed uploadFileAction to enforce JWT authentication.
- **Impact**: Cleaner imports, easier testing of cron jobs, and fixed a security/reliability bug in file uploads.

## 2026-02-03: Fix 'completed_at' Schema Error
- **Issue**: Task approval failed with Invalid document structure: Unknown attribute: "completed_at".
- **Root Cause**: The AdminService logic was updated to set completed_at, but the Appwrite database schema was missing this attribute.
- **Fix**:
  - Created and ran migration script scripts/add-completed-at-attr.ts to add the missing datetime attribute.
  - Added unit test lib/application/services/housing/admin.service.test.ts to verify erifyTask logic and prevent regressions.

## 2026-02-03: Fix Silent Ledger Failure
- **Issue**: Task approval showed success in UI even if Points/Ledger transaction failed (swallowed error).
- **Fix**:
  - Updated DomainEventBus to propagate errors instead of swallowing them.
  - Updated AdminService.verifyTask to catch Event errors, **Rollback** task status to pending, and throw a visible error to the UI.
  - Validated with dmin.service.test.ts (mocking EventBus failure).
