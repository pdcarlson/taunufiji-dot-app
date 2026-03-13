# Spec: Discord Command Sync Automation

## Status

complete

## Problem

Discord Slash Commands needed to be registered/updated manually. Automating this within the CI/CD pipeline would ensure the bot's interface stays consistent across environments.

## Requirements

### Functional

- [x] Script hardened for env overrides and error reporting
- [x] Bulk overwrite guild application commands via Discord API
- [x] Required IDs validated before execution
- [x] 4xx errors from Discord block the process

### Non-Functional

- [x] Safe for CI/CD integration

## Acceptance Criteria

- [x] Script can sync commands to any environment
- [x] Errors in command definitions are surfaced clearly
- [x] ~~No manual `npm run discord:register` required for standard deploys~~ — **Revised**: the deploy strategy update removed the GitHub Actions deploy workflows that ran this script. Manual registration via `npm run discord:register` is now the primary method.

## Technical Approach

Used Discord's "Bulk Overwrite Guild Application Commands" endpoint (PUT to `/applications/{id}/guilds/{guild_id}/commands`) via `scripts/register-discord-commands.ts`.

The script was originally integrated into `deploy-staging.yml` and `deploy-prod.yml`. After the [Deploy Strategy Update](deploy-strategy-update.md) moved deployments to direct Appwrite/GitHub integration, those workflows were deleted. Command registration is now triggered manually: `npm run discord:register`.

## References

- Original track: Archived (`discord_sync_automation_20260219`, conductor tree removed)
