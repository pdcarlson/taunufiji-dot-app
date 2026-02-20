# Specification: Establish Staging Environment & Infrastructure Audit

## Overview

This track focuses on stabilizing the `feat/staging-env` branch. The goal is to ensure the staging environment is fully functional, the CI/CD pipeline correctly handles GitHub environments, and the codebase is audited for common infrastructure failures and hardcoded configurations.

## Scope

- **CI/CD Stabilization**: Finalize `.github/workflows/deploy-staging.yml` and verify it correctly uses GitHub environment secrets.
- **Environment Audit**: Refine `lib/infrastructure/config/env.ts` to be more robust across Local/Staging/Production contexts.
- **Bug Fixes**: Address specific errors identified during the current PR review (Code Rabbit feedback).
- **Cleanup**: Consolidate roles and hardcoded constants into the infrastructure config layer.

## Requirements

- The staging environment must deploy automatically upon a push to the `staging` branch (once merged).
- Local development must remain isolated using the staging database and specific Discord channels.
- Environment variable validation must be strict but helpful (providing clear error messages for missing keys).
- No production secrets should be present in the repository or local logs.

## Success Criteria

- [ ] `npm run build` succeeds using staging environment variables.
- [ ] `deploy-staging.yml` quality gates (lint, type check, test) pass.
- [ ] The `env.ts` file correctly differentiates between required and optional keys based on context.
- [ ] A clean `staging` deployment is verified (manually or via logs).
