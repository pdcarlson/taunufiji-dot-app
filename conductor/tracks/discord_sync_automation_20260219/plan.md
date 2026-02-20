# Implementation Plan - Discord Sync Automation

## Phase 1: Script Hardening

- [x] Refactor `scripts/register-discord-commands.ts` to support environment variable overrides from CI (not just `.env.local`).
- [x] Add robust error reporting to show exactly which command failed validation.

## Phase 2: CI/CD Integration

- [x] Update `deploy-staging.yml` to include a `Sync Discord Commands` step.
- [x] Update `deploy-prod.yml` to include a `Sync Discord Commands` step.
- [x] Ensure `DISCORD_APP_ID` and `DISCORD_BOT_TOKEN` are available in the deployment environment.

## Phase 3: Verification

- [x] Run a test execution of the script locally to simulate CI environment.
- [x] Verify that commands are updated in the target Guild.
