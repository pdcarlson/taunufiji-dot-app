# Architecture

## Clean Architecture (Onion)

The application is built on a Clean Architecture foundation, strictly enforcing the Dependency Rule: inner layers (Domain) are independent of outer layers (Infrastructure/Presentation).

```text
Presentation → Application → Domain ← Infrastructure
```

### 1. Domain Layer (`lib/domain`)

The heart of the software. Has **no imports from infrastructure, application, or presentation layers**.

- **Entities**: Pure TypeScript classes defining core business objects (`HousingTask`, `LedgerEntry`).
- **Ports**: Interface definitions for external systems (`ITaskRepository`, `INotificationProvider`).
- **Types / DTOs**: Zod schemas (`lib/domain/types/`) define the canonical shape of domain objects (e.g., `BaseEntitySchema`, `TaskSchema`). Zod is the sole external dependency in this layer — it is used for schema _definition and type inference_ (`z.infer<…>`). Runtime validation of input payloads destined for Server Actions happens in the presentation layer; the domain schemas serve as the single source of truth for the data contracts shared across layers.

### 2. Application Layer (`lib/application`)

Orchestrates business logic and use cases.

- **Services**: `DutyService`, `LedgerService`, `LibraryService`, `ScheduleService`, `AdminService`.
- **Event Handlers**: Asynchronous listeners for domain events published via `DomainEventBus` (task lifecycle notifications, points on approve/reject). Overdue duty expiry and next-instance generation run in the scheduled housing batch pipeline (`expireOverdueDutyTask`), not via a domain event.
- **Scheduling**: Cron handlers (`lib/application/services/jobs`) for recurring logic — `UnlockTasksJob`, `NotifyRecurringJob`, `NotifyUrgentJob`, `ExpireDutiesJob`, `NotifyExpiredJob`, `EnsureFutureTasksJob`.

### 3. Infrastructure Layer (`lib/infrastructure`)

Concrete implementations of domain ports.

- **Dependency Injection**: Custom IoC Container (`container.ts`) lazy-loads dependencies, enabling robust unit testing via mock injection.
- **Persistence**: Repository pattern implementation using the Appwrite Node.js SDK.
- **Messaging**: Discord Bot integration for real-time notifications via DMs and channel messages.
- **Storage**: S3 storage service for signed URL generation (uploads/downloads).
- **Events**: Domain event bus (`dispatcher.ts`) for decoupled cross-cutting concerns.

### 4. Presentation Layer (`app/`, `components/`)

- **Server Actions**: Secured entry points using `actionWrapper` (`lib/presentation/utils/action-handler.ts`) that enforces a strict pipeline:
  1. **Authentication**: JWT verification (required unless `public: true`).
  2. **Global Brother check**: Every non-public action verifies the caller holds a Brother role via `authService.verifyBrother`. Skipped only when `public` is set.
  3. **Optional RBAC**: If `allowedRoles` is provided, an additional `authService.verifyRole` call checks the caller against those specific Discord role IDs. When `allowedRoles` is omitted, the Brother check alone gates access.
  4. **Execution with DI**: Only after auth and authorization pass does `actionWrapper` call `getContainer()` to inject the IoC container and invoke the handler.
  5. **Error Handling**: Failures at any step are caught and returned as standardized `{ success, error }` envelopes.
- **Components**: Organized by feature domain (`components/features/housing`, `library`, `leaderboard`).
- **Container/Presentational Pattern**: Components receive dependencies as props (e.g., `getJWT`) rather than importing infrastructure directly.

## Key Architectural Rules

1. **Dependency Rule**: Source code dependencies only point inwards. The Domain knows nothing about the Database.
2. **Separation of Concerns**: UI (React) is completely decoupled from Business Logic (Services).
3. **Testability**: The Application layer can be tested in isolation by mocking the Infrastructure interfaces.
4. **No static service calls**: All services use constructor injection via the IoC container.
5. **Domain independence**: `lib/domain` must have zero imports from infrastructure, application, or presentation layers. Zod is the only allowed external dependency (for schema definitions in `lib/domain/types/`).

## Authentication Flow

1. User clicks "Login with Discord" → Appwrite OAuth flow
2. On success, client receives Appwrite session
3. Client creates JWT via `account.createJWT()`
4. JWT is passed to Server Actions for stateless authentication
5. Server Actions verify JWT and resolve user profile (including Discord roles)

## Deployment Architecture

- **Hosting**: **Vercel** builds and serves the Next.js app from the GitHub repo (**Preview** from **`main`** and other branches as configured; **Production** from **`production`** when set as the production branch).
- **Backend**: **Appwrite** (Auth, Databases) is configured via env vars injected at deploy time; it does not host the web app.
- **CI**: GitHub Actions runs quality gates (lint, type check, test, build) on pushes and PRs.
- **Cron**: Vercel Cron triggers `/api/cron?job=HOUSING_BATCH` on the **production** deployment per `vercel.json` (once daily on the current schedule); Vercel sends `Authorization: Bearer <CRON_SECRET>` when that env var is set on the project.

For the full platform split (Vercel vs Appwrite vs AWS vs Discord vs GitHub), see [Platform](platform.md). For deployment procedures, see [docs/deployment/](../docs/deployment/).
