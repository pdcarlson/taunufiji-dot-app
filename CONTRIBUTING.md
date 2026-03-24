# Contributing

Thank you for helping improve this project. This document is for **human** contributors. Automation and AI agents should also follow [AGENTS.md](AGENTS.md), which is the detailed runbook for tools and coding standards.

## What to read first

| Resource                               | Purpose                                                                                                          |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| [AGENTS.md](AGENTS.md)                 | Quality gates, branch names, commit format, where specs live                                                     |
| [`.env.example`](.env.example)         | All env keys for local dev (copy to `.env.local`; see below)                                                     |
| [spec/README.md](spec/README.md)       | Canonical product and architecture contracts                                                                     |
| [docs/README.md](docs/README.md)       | Operational docs (deployment, testing, style); [contributing links](docs/README.md#contributing-and-local-setup) |
| [docs/style-guide/](docs/style-guide/) | TypeScript, HTML/CSS conventions                                                                                 |

## Local environment

1. Copy [`.env.example`](.env.example) to **`.env.local`** (Next.js loads it automatically).
2. Fill in values from your Appwrite project, AWS credentials, Discord app, and bucket. Variable names and shape match [`lib/infrastructure/config/server-env-schema.ts`](lib/infrastructure/config/server-env-schema.ts).
3. If you only need **lint, unit tests, or a production build** without real services, set **`SKIP_ENV_VALIDATION=true`** (see [AGENTS.md](AGENTS.md)); OAuth and full flows still need real configuration.

## Branch workflow

- **`main`** — Integration branch; open pull requests here first. See [docs/deployment/README.md](docs/deployment/README.md).
- **`production`** — Release branch (production deploy). Promotions are for maintainers after QA; do not target this branch for feature work unless a maintainer asks.

Suggested feature branch names: `c/<short-topic>` or `feature/<descriptive-name>`.

## Before you open a PR

Use **Node.js 20** to match CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

Run the same checks CI runs (from [AGENTS.md](AGENTS.md)):

```bash
npm run lint
npx tsc --noEmit
npm run test -- --run
npm run test:coverage:critical
npx playwright install --with-deps chromium   # once per machine, if browsers missing
npm run test:e2e
SKIP_ENV_VALIDATION=true npm run build
```

Fix failures locally when possible so review focuses on the change, not on avoidable CI noise.

## Pull requests

- Base branch: **`main`** (unless a maintainer directs otherwise).
- Describe **what** changed and **why**; link related issues if any.
- Keep changes focused; large refactors are easier to land in smaller steps.

Reviews and branch rules are configured in GitHub ([docs/deployment/branch-protection.md](docs/deployment/branch-protection.md)).

## Bug reports and ideas

**Bugs:** open a [GitHub Issue](https://github.com/pdcarlson/taunufiji-dot-app/issues). Include what you expected, what happened, how to reproduce, and your environment (browser, OS) when relevant.

**Security issues:** do not use public issues for vulnerabilities; use the repository’s security reporting path if one is published, or contact maintainers privately.

**Feature ideas:** Issues are fine; use your judgment on whether a discussion thread fits better for early brainstorming.

## Commit messages

Use conventional-style messages when you can:

```text
type(scope): short description
```

Types include `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`. Examples are in [AGENTS.md](AGENTS.md).
