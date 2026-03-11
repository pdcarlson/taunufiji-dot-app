# Architecture

## Clean Architecture (Onion)

The application is built on a Clean Architecture foundation, strictly enforcing the Dependency Rule: inner layers (Domain) are independent of outer layers (Infrastructure/Presentation).

```
Presentation → Application → Domain ← Infrastructure
```

### 1. Domain Layer (`lib/domain`)

The heart of the software. Contains **zero external dependencies**.

- **Entities**: Pure TypeScript classes defining core business objects (`HousingTask`, `LedgerEntry`).
- **Ports**: Interface definitions for external systems (`ITaskRepository`, `INotificationProvider`).
- **DTOs**: Strict Zod schemas defining data contracts for Server Actions.

### 2. Application Layer (`lib/application`)

Orchestrates business logic and use cases.

- **Services**: `DutyService`, `LedgerService`, `LibraryService`, `ScheduleService`, `AdminService`.
- **Event Handlers**: Asynchronous listeners for domain events (e.g., `JobCompletedEvent`).
- **Scheduling**: Cron handlers (`lib/application/services/jobs`) for recurring logic — `UnlockTasksJob`, `NotifyUrgentJob`, `ExpireDutiesJob`, `EnsureFutureTasksJob`.

### 3. Infrastructure Layer (`lib/infrastructure`)

Concrete implementations of domain ports.

- **Dependency Injection**: Custom IoC Container (`container.ts`) lazy-loads dependencies, enabling robust unit testing via mock injection.
- **Persistence**: Repository pattern implementation using the Appwrite Node.js SDK.
- **Messaging**: Discord Bot integration for real-time notifications via DMs and channel messages.
- **Storage**: S3 storage service for signed URL generation (uploads/downloads).
- **Events**: Domain event bus (`dispatcher.ts`) for decoupled cross-cutting concerns.

### 4. Presentation Layer (`app/`, `components/`)

- **Server Actions**: Secured entry points using `actionWrapper` that safeguards every mutation with:
  1. **Authentication**: JWT verification.
  2. **Dependency Injection**: Context provisioning via the IoC container.
  3. **Authorization**: RBAC checks against Discord roles.
  4. **Error Handling**: Standardized error envelopes.
- **Components**: Organized by feature domain (`components/features/housing`, `library`, `leaderboard`).
- **Container/Presentational Pattern**: Components receive dependencies as props (e.g., `getJWT`) rather than importing infrastructure directly.

## Key Architectural Rules

1. **Dependency Rule**: Source code dependencies only point inwards. The Domain knows nothing about the Database.
2. **Separation of Concerns**: UI (React) is completely decoupled from Business Logic (Services).
3. **Testability**: The Application layer can be tested in isolation by mocking the Infrastructure interfaces.
4. **No static service calls**: All services use constructor injection via the IoC container.
5. **Domain independence**: `lib/domain` must have zero imports from infrastructure, application, or presentation layers.

## Authentication Flow

1. User clicks "Login with Discord" → Appwrite OAuth flow
2. On success, client receives Appwrite session
3. Client creates JWT via `account.createJWT()`
4. JWT is passed to Server Actions for stateless authentication
5. Server Actions verify JWT and resolve user profile (including Discord roles)

## Deployment Architecture

- **Staging**: Appwrite watches `staging` branch → auto-deploys to Staging Site
- **Production**: Appwrite watches `main` branch → auto-deploys to Production Site
- **CI**: GitHub Actions runs quality gates (lint, type check, test, build) on PRs
- **Cron**: GitHub Actions triggers `/api/cron?key=<secret>&job=HOURLY` every 12 minutes
