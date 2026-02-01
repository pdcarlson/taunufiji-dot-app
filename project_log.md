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
