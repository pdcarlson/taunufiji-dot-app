# AGENTS.md

## Project Overview

**Tau Nu Fiji** is a single Next.js 16 application (not a monorepo) serving as the operational platform for a fraternity chapter. It has three core modules — Housing (chore management), Ledger (scholarship points), and Library (academic resources) — all backed by external cloud services (Appwrite, Discord, AWS S3). There are no local databases or Docker containers.

For full product context, see `docs/product.md`. For architecture details, see `docs/architecture.md`.

---

## Skills

### Skill: Spec-Driven Development

**When to use**: Before implementing any non-trivial feature, refactor, or infrastructure change.

Read `docs/spec/README.md` for the full guide and template. Key rules:

1. **Always check for an existing spec** in `docs/spec/current/` before starting work. If one exists, follow it.
2. **Create a new spec** if none exists and the change is non-trivial (touches 3+ files or takes more than a few hours). Use the template in `docs/spec/README.md`.
3. **Update the spec** if requirements change during implementation.
4. **Move to `docs/spec/archive/`** when the work ships, with all acceptance criteria checked off.
5. **Reference the spec** in PR descriptions and commit messages.

### Skill: Code Style

**When to use**: When writing or reviewing any code in this project.

Full style guides are in `docs/style-guide/`. Key rules to always follow:

- **TypeScript**: No `any` (use `unknown`), no default exports, no `var`, no `#private` fields. Use `const` by default. Named exports only. Semicolons required.
- **Naming**: `UpperCamelCase` for types/classes, `lowerCamelCase` for variables/functions, `CONSTANT_CASE` for constants.
- **Comments**: Explain _why_, not _what_. Use JSDoc for public APIs. No redundant type annotations in JSDoc.
- **CSS**: This project uses Tailwind CSS. Custom CSS follows hyphenated class names, no ID selectors, no `!important`.

### Skill: Clean Architecture Enforcement

**When to use**: When modifying any code in `lib/`.

The codebase follows Clean Architecture (Onion) with strict layer boundaries. See `docs/architecture.md` for details.

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

### Skill: Commit Messages

**When to use**: Every commit.

Format: `type(scope): description`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:

```
feat(housing): add ad-hoc point request flow
fix(auth): resolve infinite redirect loop on login
docs(spec): add staging environment setup spec
test(ledger): add points service edge case coverage
chore(deps): update next to 16.1.6
```

---

## Documentation Maintenance

When making changes to the codebase, update documentation as needed:

| What changed                                   | Update                                                                       |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| New feature or module                          | Create spec in `docs/spec/current/`, update `docs/product.md` if user-facing |
| Architecture or patterns                       | Update `docs/architecture.md`                                                |
| Tech stack (new dependency, framework upgrade) | Update `docs/tech-stack.md`                                                  |
| Deployment or CI/CD                            | Update `docs/deployment.md`                                                  |
| Significant completed work                     | Add entry to `docs/changelog.md`                                             |
| UI/UX guidelines                               | Update `docs/product.md`                                                     |

## Branch Workflow

Use `staging` as the integration branch for all active development work.

1. If currently on `staging` and beginning a new task, create a feature branch: `feature/<descriptive-name>`.
2. If already on a feature branch for the current task, continue working on that branch.
3. Open pull requests from feature branches to `staging`.
4. Do not commit directly to `staging` or `main`.

---

## Cursor Cloud-specific instructions

### Environment & Secrets

The **default** agent profile receives staging and read-only credentials only. Production write access and full-repo GitHub access require explicit elevation (see Elevation below).

| Variable                          | Available by default | Notes                                       |
| --------------------------------- | -------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_APPWRITE_ENDPOINT`   | Yes                  | Points to the Appwrite instance             |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | Yes                  | Project ID                                  |
| `APPWRITE_API_KEY`                | Yes                  | Server-side API key (staging when used)     |
| `APPWRITE_STAGING_API_KEY`        | Yes                  | Staging project API key                     |
| `APPWRITE_PRODUCTION_API_KEY`     | No (elevated)        | Production project API key — elevation only |
| `AWS_*`                           | Yes                  | S3 credentials for library storage          |
| `DISCORD_*`                       | Yes                  | Full Discord bot credentials and role IDs   |
| `CRON_SECRET`                     | Yes                  | Cron endpoint auth                          |
| `GITHUB_READONLY_TOKEN`           | Yes                  | Read-only GitHub PAT (if configured)        |
| `GITHUB_PERSONAL_ACCESS_TOKEN`    | No (elevated)        | Full repo access PAT — elevation only       |

By default the agent has access to the **staging** Appwrite project and, if provided, a read-only GitHub token. Use staging for all testing; never delete production data.

To create a working `.env.local` from the default injected secrets (staging only):

```bash
cat > .env.local << 'EOF'
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
