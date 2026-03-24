# Documentation

Granular, topic-organized documentation for Tau Nu Fiji — The Digital Chapter.

For canonical contracts (architecture, behavior, platform, product, tech stack), see [`spec/README.md`](../spec/README.md).

> Release history is tracked in git (`git log`); there is no separate changelog file.

## Contributing and local setup

| Resource                                | Description                                                     |
| --------------------------------------- | --------------------------------------------------------------- |
| [`CONTRIBUTING.md`](../CONTRIBUTING.md) | Branch workflow, PR workflow, local quality gate, bug reports   |
| [`.env.example`](../.env.example)       | Template for `.env.local` (copy and fill; never commit secrets) |
| [`AGENTS.md`](../AGENTS.md)             | AI/automation runbook, quality gates, Cursor Cloud env notes    |

## Topics

### Deployment

Step-by-step deployment procedures, CI configuration, environment management, and troubleshooting.

| Document                                             | Description                                                 |
| ---------------------------------------------------- | ----------------------------------------------------------- |
| [Deployment Overview](deployment/)                   | Pipeline overview, branch model                             |
| [CI Quality Gates](deployment/ci.md)                 | GitHub Actions workflow and required status checks          |
| [Environments](deployment/environments.md)           | Staging, production, secrets, env matrix, runtime checklist |
| [Cron Jobs](deployment/cron.md)                      | Vercel Cron configuration, HOUSING_BATCH pipeline           |
| [Troubleshooting](deployment/troubleshooting.md)     | Staging diagnostics, failure runbook                        |
| [Branch Protection](deployment/branch-protection.md) | Git branch model, rulesets, GitHub settings                 |

### Quality

Testing conventions, coverage tooling, and diagnostics.

| Document                      | Description                                           |
| ----------------------------- | ----------------------------------------------------- |
| [Testing](quality/testing.md) | Vitest, Playwright, coverage, co-location conventions |

### Style Guides

Code style rules enforced across the project.

| Guide                                   | Description                     |
| --------------------------------------- | ------------------------------- |
| [General](style-guide/general.md)       | Cross-language principles       |
| [TypeScript](style-guide/typescript.md) | TypeScript rules (Google style) |
| [JavaScript](style-guide/javascript.md) | JavaScript rules (Google style) |
| [HTML/CSS](style-guide/html-css.md)     | Markup and styling rules        |

## Adding New Topics

New topic directories are welcome under `docs/` when a subject area grows beyond a single file. Each topic document should link upward to the relevant `spec/` file(s) it elaborates on (architecture, behavior, platform, product, or tech-stack).
