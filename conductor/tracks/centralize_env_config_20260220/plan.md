# Implementation Plan: centralize_env_config

## Phase 1: Set Up Central Environment Configuration
- [~] Task: Update `lib/infrastructure/config/env.ts`
    - [ ] Import `server-only` to protect server-side variables
    - [ ] Update the Zod schema for environment variables (based on existing variables and .env* cleanups)
    - [ ] Export the validated environment variables
    - [ ] Separate constants that will never be in `.env` into a distinct config file (e.g. `lib/infrastructure/config/constants.ts`) if necessary, or keep them structured separately within the config logic.
- [ ] Task: Update tests for `lib/infrastructure/config/env.test.ts` validation logic
    - [ ] Ensure Zod parsing tests cover valid/invalid scenarios based on the new schema
- [ ] Task: Conductor - User Manual Verification 'Set Up Central Environment Configuration' (Protocol in workflow.md)

## Phase 2: Refactor Codebase to use Central Configuration
- [ ] Task: Replace any direct `process.env` usages with the validated exports from `lib/infrastructure/config/env.ts` or `clientEnv`
- [ ] Task: Update the codebase to handle removed or renamed variables (e.g., removing 'dev role' usages, ensuring 'DISCORD_ROLE_ID_' prefixes are respected)
- [ ] Task: Conductor - User Manual Verification 'Refactor Codebase to use Central Configuration' (Protocol in workflow.md)

## Phase 3: Clean Up
- [ ] Task: Remove the root `/env.ts`, `/client-env.ts` and `/env.test.ts` files created in the previous attempt
- [ ] Task: Delete any other obsolete or duplicate environment configuration logic
- [ ] Task: Conductor - User Manual Verification 'Clean Up' (Protocol in workflow.md)