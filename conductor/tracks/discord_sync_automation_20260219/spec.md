# Track: Automated Discord Command Sync

## 🎯 Goal

Automate the registration and synchronization of Discord Slash Commands within the CI/CD pipeline to ensure the Bot's interface remains consistent across environments.

## 🏗️ Technical Approach

- **Mechanism**: Use Discord's "Bulk Overwrite Global Application Commands" or "Guild Commands" endpoint via a `PUT` request.
- **Trigger**: Integration into GitHub Actions deployment workflows (`deploy-staging.yml`, `deploy-prod.yml`).
- **Safety**: Script must validate that required IDs (`DISCORD_APP_ID`, `BOT_TOKEN`) are present and fail the deployment if Discord returns a 4xx error.

## ✅ Success Criteria

1. Deployment to Staging/Production automatically updates Slash Commands.
2. No manual `npm run discord:register` is required for infrastructure updates.
3. Errors in command definitions (e.g., character limits) block the deployment.
