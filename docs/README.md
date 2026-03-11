# Documentation

Project documentation for Tau Nu Fiji — The Digital Chapter.

## Contents

| Document | Description |
|---|---|
| [Product Definition](product.md) | What the product does, who it's for, key modules |
| [Product Guidelines](product-guidelines.md) | Visual identity, prose style, UX principles |
| [Tech Stack](tech-stack.md) | Frameworks, services, and tooling |
| [Architecture](architecture.md) | Clean Architecture layers, patterns, authentication flow |
| [Deployment](deployment.md) | CI/CD pipeline, staging/production workflow, secret management |
| [Housing Behavior Reference](housing-behavior-reference.md) | Canonical housing lifecycle, edge-case matrix, and expected runtime behavior |
| [Changelog](changelog.md) | Historical log of all major changes |

## Specs

Spec-driven development workflow and all active/completed specifications live in [`spec/`](../spec/README.md).

| Spec | Status |
|---|---|
| [Staging Environment Setup](../spec/staging-environment-setup.md) | In Progress |
| [QA Audit and Staging Hardening](../spec/qa-audit-and-staging-hardening.md) | In Progress |
| [Deploy Strategy Update](../spec/completed/deploy-strategy-update.md) | Complete |
| [Discord Sync Automation](../spec/completed/discord-sync-automation.md) | Complete |
| [Centralize Env Config](../spec/completed/centralize-env-config.md) | Complete |
| [Quality Gate Fixes](../spec/completed/quality-gate-fixes.md) | Complete |
| [Infra Logic Hardening](../spec/completed/infra-logic-hardening.md) | Complete |

> Rule of thumb: `spec/` tracks planned or in-flight implementation work; `docs/` captures durable system behavior and operational references.

## Style Guides

| Guide | Description |
|---|---|
| [General](style-guide/general.md) | Cross-language principles |
| [TypeScript](style-guide/typescript.md) | TypeScript rules (Google style) |
| [JavaScript](style-guide/javascript.md) | JavaScript rules (Google style) |
| [HTML/CSS](style-guide/html-css.md) | Markup and styling rules |
