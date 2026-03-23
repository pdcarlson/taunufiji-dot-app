# CI Quality Gates

> **Parent specs:** [Tech Stack](../../spec/tech-stack.md) · [Platform](../../spec/platform.md)

## Overview

Quality gates run via GitHub Actions (`.github/workflows/ci.yml`). This workflow does **not** handle deployment. It serves strictly as a quality gate.

**Trigger**: Pushes and pull requests targeting **`main`**, **`production`**, or **`staging`** (see `push` / `pull_request` `branches` in `.github/workflows/ci.yml`). Including **`production`** ensures required status checks run for PRs into the release branch and on direct pushes that the branch ruleset allows.

## Jobs

| Job | Command | Purpose |
|-----|---------|---------|
| `lint` | `npm run lint` | ESLint — must have 0 errors (warnings OK) |
| `typecheck` | `npx tsc --noEmit` | TypeScript strict mode — must pass |
| `test` | `npm run test -- --run` | Vitest — all tests must pass |
| `coverage-critical` | `npm run test:coverage:critical` | Coverage thresholds on critical modules |
| `e2e-smoke` | `npm run test:e2e` | Playwright smoke tests for deployment-critical routes |
| `build` | `npm run build` | Next.js build with CI placeholder env vars |
| `quality-gate` | Aggregate check | Fails if any required job above is not `success` |

All jobs run `npm ci` with `actions/setup-node` npm cache independently (no shared `node_modules` artifact — zip round-trip breaks `.bin` symlinks).

## Build Environment

The `build` job provides a complete placeholder env matrix so the build runs without `SKIP_ENV_VALIDATION=true`:

- Appwrite, Discord, AWS, and Cron env vars are set to mock/placeholder values
- Real secrets from GitHub Secrets are used when available (e.g., `APPWRITE_API_KEY`)
- `SKIP_ENV_VALIDATION=true` is still set as a safety net

## Required Status Checks

For branch rulesets (see [Branch Protection](branch-protection.md)), these job IDs must pass:

`lint`, `typecheck`, `test`, `coverage-critical`, `e2e-smoke`, `build`, `quality-gate`

**Strict** policy: the merge head must be up to date with the base branch.

## Running Locally

Match CI by running these commands before pushing:

```bash
npm run lint              # ESLint — must have 0 errors (warnings OK)
npx tsc --noEmit          # TypeScript strict mode — must pass
npm run test -- --run     # Vitest — all tests must pass
SKIP_ENV_VALIDATION=true npm run build  # Next.js build — must succeed
```
