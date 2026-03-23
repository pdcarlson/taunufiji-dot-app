# AGENTS.md

## Project Overview

**Tau Nu Fiji** is a single Next.js 16 application (not a monorepo) serving as the operational platform for a fraternity chapter. It has three core modules — Housing (chore management), Ledger (scholarship points), and Library (academic resources) — all backed by external cloud services (Appwrite, Discord, AWS S3). There are no local databases or Docker containers.

**Hosting vs backend:** The **Next.js app** is built and served on **Vercel** (GitHub-connected). **Appwrite** is **backend only** (Auth, Databases) — it does **not** host this web app. See `spec/platform.md` before changing deployment or env docs.

For full product context, see `spec/product.md`. For architecture details, see `spec/architecture.md`.

---

## Documentation Model

The project uses a two-tier documentation structure:

### `spec/` — Canonical Contracts

Root-level directory containing the project's source of truth. These are authoritative documents that define what the system is, how it works, and where it runs.

| File | Purpose |
|------|---------|
| `spec/architecture.md` | Clean Architecture layers, patterns, authentication flow |
| `spec/behavior.md` | Housing module lifecycle, state transitions, edge-case matrix |
| `spec/platform.md` | Vercel vs Appwrite vs GitHub — canonical platform split |
| `spec/product.md` | Product definition, target audience, core modules, UX guidelines |
| `spec/tech-stack.md` | Frameworks, services, tooling |

### `docs/` — Topic-Organized Documentation

Granular, operational documentation organized by topic. Every `docs/<topic>/` document links upward to the relevant `spec/` file(s).

| Directory | Purpose |
|-----------|---------|
| `docs/deployment/` | CI, environments, cron, troubleshooting, branch protection |
| `docs/quality/` | Testing conventions, coverage, diagnostics |
| `docs/style-guide/` | Code style rules (TypeScript, JavaScript, HTML/CSS) |

See `spec/README.md` for the full index of contracts. See `docs/README.md` for the full topic index.

---

## Skills

### Skill: Code Style

**When to use**: When writing or reviewing any code in this project.

Full style guides are in `docs/style-guide/`. Key rules to always follow:

- **TypeScript**: No `any` (use `unknown`), no default exports, no `var`, no `#private` fields. Use `const` by default. Named exports only. Semicolons required.
- **Naming**: `UpperCamelCase` for types/classes, `lowerCamelCase` for variables/functions, `CONSTANT_CASE` for constants.
- **Comments**: Explain _why_, not _what_. Use JSDoc for public APIs. No redundant type annotations in JSDoc.
- **CSS**: This project uses Tailwind CSS. Custom CSS follows hyphenated class names, no ID selectors, no `!important`.

### Skill: Clean Architecture Enforcement

**When to use**: When modifying any code in `lib/`.

The codebase follows Clean Architecture (Onion) with strict layer boundaries. See `spec/architecture.md` for details.

**Rules**:

- `lib/domain/` must have **zero imports** from infrastructure, application, or presentation layers.
- Dependencies flow inwards only: Presentation → Application → Domain ← Infrastructure.
- All infrastructure adapters must implement a domain port (interface). Never use concrete infrastructure classes directly in application services.
- All services use constructor injection via the IoC container (`lib/infrastructure/container.ts`). No static service calls.
- Server Actions use `actionWrapper` for standardized auth, DI, error handling, and RBAC.

### Skill: Quality Gates

**When to use**: Before every commit and PR.

**Always run the full quality gate locally before pushing or opening a PR** so CI does not fail. Do not wait for the PR to run CI to discover failures.

Run these checks (matching CI in `.github/workflows/ci.yml`):

```bash
npm run lint              # ESLint — must have 0 errors (warnings OK)
npx tsc --noEmit          # TypeScript strict mode — must pass
npm run test -- --run     # Vitest — all tests must pass
SKIP_ENV_VALIDATION=true npm run build  # Next.js build — must succeed
```

**Coverage target**: >80% for new code. All new services and domain logic must have corresponding test files.

### Skill: Testing

**When to use**: When writing new code or modifying existing code.

- **Framework**: Vitest with jsdom. Config in `vitest.config.ts`, setup in `vitest.setup.ts`.
- **Mocking**: `vitest.setup.ts` provides mock env vars and mocks `server-only`. Tests run without external services.
- **Convention**: Test files are co-located with source files (e.g., `duty.service.test.ts` next to `duty.service.ts`).
- **Pattern**: Mock infrastructure via domain ports/interfaces. Use constructor injection to pass mocks.
- Run non-interactively: `npm run test -- --run`

For full testing docs, see `docs/quality/testing.md`.

### Skill: Commit Messages

**When to use**: Every commit.

Format: `type(scope): description`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:

```text
feat(housing): add ad-hoc point request flow
fix(auth): resolve infinite redirect loop on login
docs(spec): update architecture contract
test(ledger): add points service edge case coverage
chore(deps): update next to 16.1.6
```

---

## Documentation Maintenance

When making changes to the codebase, update documentation as needed:

| What changed | Update |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| Architecture or patterns | Update `spec/architecture.md` |
| Housing behavior or lifecycle | Update `spec/behavior.md` |
| Platform or hosting changes | Update `spec/platform.md` |
| New feature or module (user-facing) | Update `spec/product.md` |
| Tech stack (new dependency, framework upgrade) | Update `spec/tech-stack.md` |
| Deployment or CI/CD | Update `docs/deployment/` |
| Testing conventions or coverage | Update `docs/quality/testing.md` |
| UI/UX guidelines | Update `spec/product.md` |

## Branch Workflow

Use **`main`** as the integration branch and **`production`** as the protected release branch (see `docs/deployment/`).

1. If currently on **`main`** or **`production`** and beginning a new task, create a feature branch: `c/<short-topic>` or `feature/<descriptive-name>`.
2. If already on a feature branch for the current task, continue working on that branch.
3. Open pull requests from feature branches into **`main`**; promote **`main` → `production`** after QA.
4. Do not commit directly to **`production`** without following team policy (and never bypass required checks).

---

## Cursor Cloud-specific instructions

### Environment & Secrets

The **default** agent profile receives staging and read-only credentials only. Production write access and full-repo GitHub access require explicit elevation (see Elevation below).

| Variable | Available by default | Notes |
| --------------------------------- | -------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | Yes | Points to the Appwrite instance |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | Yes | Project ID |
| `APPWRITE_API_KEY` | Yes | Server-side API key (staging when used) |
| `APPWRITE_STAGING_API_KEY` | Yes | Staging project API key |
| `APPWRITE_PRODUCTION_API_KEY` | No (elevated) | Production project API key — elevation only |
| `AWS_*` | Yes | S3 credentials for library storage |
| `DISCORD_*` | Yes | Full Discord bot credentials and role IDs |
| `CRON_SECRET` | Yes | Cron endpoint auth |
| `GITHUB_READONLY_TOKEN` | Yes | Read-only GitHub PAT (if configured) |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | No (elevated) | Full repo access PAT — elevation only |

By default the agent has access to the **staging** Appwrite project and, if provided, a read-only GitHub token. Use staging for all testing; never delete production data.

To create a working `.env.local` from the default injected secrets (staging only):

```bash
cat > .env.local << EOF
NEXT_PUBLIC_APPWRITE_ENDPOINT=$NEXT_PUBLIC_APPWRITE_ENDPOINT
NEXT_PUBLIC_APPWRITE_PROJECT_ID=$NEXT_PUBLIC_APPWRITE_PROJECT_ID
APPWRITE_API_KEY=$APPWRITE_STAGING_API_KEY
AWS_REGION=$AWS_REGION
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY
AWS_BUCKET_NAME=$AWS_BUCKET_NAME
DISCORD_APP_ID=$DISCORD_APP_ID
DISCORD_PUBLIC_KEY=$DISCORD_PUBLIC_KEY
DISCORD_BOT_TOKEN=$DISCORD_BOT_TOKEN
DISCORD_GUILD_ID=$DISCORD_GUILD_ID
DISCORD_HOUSING_CHANNEL_ID=$DISCORD_HOUSING_CHANNEL_ID
DISCORD_ROLE_ID_BROTHER=$DISCORD_ROLE_ID_BROTHER
DISCORD_ROLE_ID_CABINET=$DISCORD_ROLE_ID_CABINET
DISCORD_ROLE_ID_HOUSING_CHAIR=$DISCORD_ROLE_ID_HOUSING_CHAIR
CRON_SECRET=$CRON_SECRET
EOF
```

#### Elevation

Production write and full-repo GitHub access are **not** in the default profile. To use them:

- **`APPWRITE_PRODUCTION_API_KEY`** and **`GITHUB_PERSONAL_ACCESS_TOKEN`** must be explicitly authorized (e.g. via an elevated profile or manual approval workflow).
- Only request or apply these variables when the task explicitly requires production writes or full repo access, and after approval.
- Do not add them to the default `.env.local` snippet above; use a separate, documented elevation path (e.g. one-off injection or elevated Cursor profile) when authorized.

If real credentials are not needed (e.g., for lint/test/build only), set `SKIP_ENV_VALIDATION=true` in `.env.local` with placeholder values.

### Running the app

- **Dev server**: `npm run dev` (port 3000)
- **Build**: `SKIP_ENV_VALIDATION=true npm run build`
- The root `/` route redirects (307) to `/login` — this is expected behavior.
- Authentication is Discord OAuth via Appwrite. Without valid credentials, the login page renders but the OAuth flow requires a real Appwrite project and Discord app.

### Gotchas

- The env validation in `lib/infrastructure/config/env.ts` uses `server-only` and will throw at build/dev time unless `SKIP_ENV_VALIDATION=true` is set when real credentials are absent.
- Tests mock `server-only` in `vitest.setup.ts` so they run without any external services.
- ESLint uses flat config (`eslint.config.mjs`). All rules are warnings — lint passes with 0 errors.
- The `scripts/` directory is excluded from both ESLint and TypeScript compilation.
- Ad-hoc debug outputs (API dumps, probe JSON, temporary logs) must be written outside the repository root (prefer Cursor workspace/temp paths). Do not commit debug artifacts.
