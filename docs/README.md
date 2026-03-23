# Documentation

Project documentation for Tau Nu Fiji — The Digital Chapter.

## Contents

| Document                                  | Description                                                                  |
| ----------------------------------------- | ---------------------------------------------------------------------------- |
| [**Platform map**](platform-map.md)       | **Vercel vs Appwrite vs GitHub** — canonical split so hosting is not confused with backend |
| [Product Definition](product.md)          | What the product does, who it's for, key modules                             |
| [Tech Stack](tech-stack.md)               | Frameworks, services, and tooling                                            |
| [Architecture](architecture.md)           | Clean Architecture layers, patterns, authentication flow                     |
| [Deployment](deployment.md)               | CI/CD pipeline, staging/production workflow, secret management               |
| [Housing Behavior Reference](behavior.md) | Canonical housing lifecycle, edge-case matrix, and expected runtime behavior |
| [Changelog](changelog.md)                 | Historical log of all major changes                                          |

## Specs

Spec-driven development workflow and active specifications live in [`docs/spec/current/`](spec/current/). Completed specs are archived in [`docs/spec/archive/`](spec/archive/README.md).

| Active Spec                                                            | Status      |
| ---------------------------------------------------------------------- | ----------- |
| [Staging Environment Setup](spec/current/staging-environment-setup.md) | In Progress |

| Archived Completed Spec        | Location                                                                                              |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Deploy Strategy Update         | [docs/spec/archive/deploy-strategy-update.md](spec/archive/deploy-strategy-update.md)                 |
| Discord Sync Automation        | [docs/spec/archive/discord-sync-automation.md](spec/archive/discord-sync-automation.md)               |
| Centralize Env Config          | [docs/spec/archive/centralize-env-config.md](spec/archive/centralize-env-config.md)                   |
| Quality Gate Fixes             | [docs/spec/archive/quality-gate-fixes.md](spec/archive/quality-gate-fixes.md)                         |
| Infrastructure Logic Hardening | [docs/spec/archive/infra-logic-hardening.md](spec/archive/infra-logic-hardening.md)                   |
| QA Audit and Staging Hardening | [docs/spec/archive/qa-audit-and-staging-hardening.md](spec/archive/qa-audit-and-staging-hardening.md) |
| Recurring Task Update Scopes   | [docs/spec/archive/recurring-task-update-scopes.md](spec/archive/recurring-task-update-scopes.md)     |

> Rule of thumb: `docs/spec/current/` tracks planned/in-flight implementation work; `docs/` captures durable references; `docs/spec/archive/` stores completed specs.

## Style Guides

| Guide                                   | Description                     |
| --------------------------------------- | ------------------------------- |
| [General](style-guide/general.md)       | Cross-language principles       |
| [TypeScript](style-guide/typescript.md) | TypeScript rules (Google style) |
| [JavaScript](style-guide/javascript.md) | JavaScript rules (Google style) |
| [HTML/CSS](style-guide/html-css.md)     | Markup and styling rules        |
