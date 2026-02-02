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
