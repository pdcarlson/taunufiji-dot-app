# Technology Stack

## Core Frameworks

- **Frontend**: Next.js 16 (App Router, Turbopack)
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4 (Utility-first) with LightningCSS
- **Icons**: Lucide React

## Backend & Persistence

- **Platform**: Appwrite (Node.js SDK)
- **Database**: Appwrite Databases (Role-based access)
- **Authentication**: Appwrite Auth (Discord OAuth integration)
- **Storage**: AWS S3 (for library resources, with signed URLs)

## Integrations

- **Messaging/Identity**: Discord API (for role verification and notifications)
- **Scheduling**: Next.js API Routes (triggered by GitHub Actions cron)

## Architecture & Patterns

- **Pattern**: Clean Architecture (Onion)
- **Layers**:
  - **Domain** (`lib/domain`): Pure business logic and entities (zero dependencies)
  - **Application** (`lib/application`): Use cases and services
  - **Infrastructure** (`lib/infrastructure`): Concrete adapters (Appwrite, Discord, S3)
  - **Presentation** (`app/`, `components/`): Next.js Pages and Server Actions
- **Dependency Injection**: Custom IoC Container (`lib/infrastructure/container.ts`)
- **Validation**: Zod (for DTOs and environment variables)

## Tooling & Quality

- **Language**: TypeScript (Strict Mode)
- **Testing**: Vitest (Unit & Integration) with jsdom
- **Linting**: ESLint (flat config, `eslint.config.mjs`)
- **CI**: GitHub Actions (`ci.yml` — quality gates)
- **CD**: Direct Appwrite/GitHub Integration (branch-based: `staging` and `main`)
