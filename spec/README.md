# Specification (Canonical Contracts)

This directory contains the **canonical, authoritative** documents that define what Tau Nu Fiji is, how it is built, and where it runs. These are the project's source of truth — all other documentation references back to these files.

> Release history is tracked in git (`git log`); there is no separate changelog file.

## Spec vs Docs

| Directory | Purpose | Example |
|-----------|---------|---------|
| **`spec/`** | Contracts and product truth — architecture, behavior, platform, product definition, tech stack | "The app is hosted on Vercel" |
| **`docs/`** | Granular, topic-organized operational documentation — deployment runbooks, testing guides, style guides | "How to configure branch protection rulesets" |

Every document under `docs/<topic>/` links upward to the relevant `spec/` file(s) it elaborates on.

## Contents

| Document | Description |
|----------|-------------|
| [Architecture](architecture.md) | Clean Architecture layers, patterns, authentication flow, deployment architecture |
| [Behavior](behavior.md) | Housing module lifecycle, state transitions, edge-case matrix, mutation rules |
| [Platform](platform.md) | Vercel vs Appwrite vs GitHub vs AWS vs Discord — canonical platform split |
| [Product](product.md) | Product definition, target audience, core modules, UX guidelines |
| [Tech Stack](tech-stack.md) | Frameworks, services, tooling, and integration details |

## Granular Documentation

For topic-organized operational docs (deployment, testing, style guides), see [`docs/README.md`](../docs/README.md).
