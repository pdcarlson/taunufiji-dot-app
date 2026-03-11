# Spec: QA Audit and Staging Hardening

## Status

in-progress

## Problem

Staging currently passes basic CI checks but still allows high-risk runtime blind spots:

- task creation failures are difficult to diagnose,
- housing mutation actions do not enforce strict housing-admin roles server-side,
- automated testing lacks coverage reporting, integration checks, and e2e smoke paths,
- behavioral expectations are scattered and not captured in a durable reference.

Before promoting staging to production, we need a stronger quality system and clearer operational diagnostics.

## Requirements

### Functional

- [ ] Add a runtime diagnostics mechanism that verifies staging-critical dependencies (Appwrite + Discord role verification path)
- [ ] Enforce housing-admin authorization on housing mutation server actions
- [ ] Improve task-creation UX error handling so failures are categorized and actionable
- [ ] Add coverage tooling to Vitest and emit coverage reports in CI
- [ ] Add integration tests for auth wrapper + housing mutation actions
- [ ] Add e2e smoke tests for deployment-critical routes and auth redirects
- [ ] Create a durable behavior reference for housing lifecycle and edge cases in `docs/`

### Non-Functional

- [ ] Diagnostics must not leak secret values
- [ ] New tests should be deterministic and runnable in CI
- [ ] Keep architecture boundaries intact (presentation → application → domain)
- [ ] Coverage thresholds should start strict on touched critical modules and ratchet toward global 90%

## Acceptance Criteria

- [ ] Running the diagnostics command clearly reports pass/fail for Appwrite DB connectivity and Discord verification dependencies
- [ ] Non-admin users cannot execute housing mutation actions (create/update/delete/schedule/review)
- [ ] Create-task modals show specific user-facing failure classes (auth, permission, validation, infrastructure)
- [ ] `npm run test -- --run --coverage` succeeds and generates a report
- [ ] Integration tests validate RBAC and action wrapper behavior in mutation paths
- [ ] E2E smoke tests run in CI for critical route/auth checks
- [ ] Documentation clearly separates living implementation specs (`spec/`) from durable behavior/runbooks (`docs/`)

## Technical Approach

1. **Spec + docs first**
   - update staging spec with runtime-readiness criteria,
   - add this implementation spec,
   - add housing behavior reference docs.

2. **Diagnostics + environment hardening**
   - improve env validation messages and guidance,
   - add a diagnostics script for runtime dependency checks,
   - document staging troubleshooting and env matrix.

3. **Mutation-path reliability**
   - enforce `HOUSING_ADMIN_ROLES` in relevant server actions,
   - map backend error classes to clearer client messages in task-creation modals.

4. **Testing system upgrade**
   - install `@vitest/coverage-v8`,
   - configure coverage in Vitest and CI,
   - add integration tests for action wrapper + housing actions,
   - add Playwright smoke suite and wire to CI.

## Out of Scope

- Replacing Appwrite/Discord integrations
- Full end-to-end Discord OAuth automation for every e2e scenario
- One-shot repo-wide migration to global 90% line coverage if it blocks critical staging hardening

## Dependencies

- Existing staging setup work: [staging-environment-setup.md](staging-environment-setup.md)
- Deployment pipeline reference: [docs/deployment.md](../docs/deployment.md)
- Architecture constraints: [docs/architecture.md](../docs/architecture.md)

## References

- Related completed specs:
  - [Centralize Env Config](completed/centralize-env-config.md)
  - [Quality Gate Fixes](completed/quality-gate-fixes.md)
  - [Infra Logic Hardening](completed/infra-logic-hardening.md)
