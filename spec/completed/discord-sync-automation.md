# Spec: Discord Command Sync Automation

## Status

complete

## Problem

Discord Slash Commands needed to be registered/updated manually. Automating this within the CI/CD pipeline would ensure the bot's interface stays consistent across environments.

## Requirements

### Functional

- [x] Script hardened for env overrides and error reporting
- [x] Bulk overwrite global/guild application commands via Discord API
- [x] Required IDs validated before execution
- [x] 4xx errors from Discord block the process

### Non-Functional

- [x] Safe for CI/CD integration

## Acceptance Criteria

- [x] Script can sync commands to any environment
- [x] Errors in command definitions are surfaced clearly
- [x] No manual `npm run discord:register` required for standard deploys

## Technical Approach

Used Discord's "Bulk Overwrite Guild Commands" endpoint via PUT request. Script at `scripts/register-discord-commands.ts`.

**Note**: With the deploy strategy update (moving to Appwrite/GitHub integration), the CI/CD integration point for this script is no longer the GitHub Actions deploy workflows. Manual registration is currently the primary method: `npm run discord:register`.

## References

- Original track: Archived (`discord_sync_automation_20260219`, conductor tree removed)
