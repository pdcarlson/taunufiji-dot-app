# Technology Stack

## Core Frameworks

- **Frontend**: Next.js 15+ (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4 (Utility-first)
- **Icons**: Lucide React

## Backend & Persistence

- **Platform**: Appwrite (Node.js SDK)
- **Database**: Appwrite Databases (Role-based access)
- **Authentication**: Appwrite Auth (Discord OAuth integration)
- **Storage**: Appwrite Buckets (for housing proof and library resources)

## Integrations

- **Messaging/Identity**: Discord API (for role verification and notifications)
- **Scheduling**: Next.js API Routes (triggered by GitHub Actions/Cron)

## Architecture & Patterns

- **Pattern**: Clean Architecture (Onion)
- **Layers**:
    - **Domain**: Pure business logic and entities (Zero dependencies)
    - **Application**: Use cases and services
    - **Infrastructure**: Concrete adapters (Appwrite, Discord)
    - **Presentation**: Next.js Pages and Server Actions
- **Dependency Injection**: Custom IoC Container (`lib/infrastructure/container.ts`)
- **Validation**: Zod (for DTOs and environment variables)

## Tooling & Quality

- **Language**: TypeScript (Strict Mode)
- **Testing**: Vitest (Unit & Integration)
- **Linting**: ESLint
- **CI**: GitHub Actions (Quality Gates)
- **CD**: Direct Appwrite/GitHub Integration (Staging, and Production deployments)
