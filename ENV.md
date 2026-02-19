# Environment & Infrastructure Setup

This document details the requirements for setting up a new environment (Local, Staging, or Production) for the Tau Nu Fiji App.

## 1. Discord Application Setup

To enable authentication and notifications, you must create a Discord Application in the [Discord Developer Portal](https://discord.com/developers/applications).

### Application Settings
- **Name**: Use a descriptive name (e.g., `Gamma-Staging` or `Gamma-Prod`).
- **OAuth2**: 
    - Add Redirect URIs: `https://appwrite.taunufiji.app/v1/account/sessions/oauth2/callback/discord/<PROJECT_ID>`
    - Replace `<PROJECT_ID>` with your Appwrite Project ID.

### Bot Settings
- **Privileged Gateway Intents**: You **MUST** enable **Server Members Intent**. Without this, the app cannot verify member roles or nicknames.
- **Permissions**: The bot requires `Manage Roles`, `Send Messages`, and `Read Message History`.

## 2. Appwrite Configuration

Each environment requires its own Appwrite Project.

### Authentication
- Enable the **Discord** OAuth2 provider.
- Paste the **Client ID** and **Client Secret** from the Discord Developer Portal.

### Platforms
- Add a **Web Platform**.
- For local dev, add `localhost`.
- For staging/prod, add the specific domain (e.g., `staging.taunufiji.app`).

## 3. Environment Variables (.env.local)

The application uses Zod to validate these on startup.

### Appwrite
- `NEXT_PUBLIC_APPWRITE_ENDPOINT`: `https://appwrite.taunufiji.app/v1`
- `NEXT_PUBLIC_APPWRITE_PROJECT_ID`: Your Appwrite project ID.
- `APPWRITE_API_KEY`: A secret API key with full access (Server-side only).

### Discord
- `DISCORD_APP_ID`: From Discord Portal.
- `DISCORD_BOT_TOKEN`: From Discord Portal (Bot section).
- `DISCORD_GUILD_ID`: The Snowflake ID of the Discord Server.
- `DISCORD_HOUSING_CHANNEL_ID`: The Snowflake ID of the channel for housing pings.

### Discord Role Snowflakes
Copy these from your Discord Server settings:
- `ROLE_ID_BROTHER`: Base member access.
- `ROLE_ID_CABINET`: Executive admin access.
- `ROLE_ID_HOUSING_CHAIR`: Specific housing management access.
- `ROLE_ID_DEV`: Personal developer access.

### AWS S3
- `AWS_REGION`: e.g., `us-east-1`
- `AWS_ACCESS_KEY_ID`: IAM user with S3 Put/Get permissions.
- `AWS_SECRET_ACCESS_KEY`: IAM secret.
- `AWS_BUCKET_NAME`: Name of the bucket for proofs.

## 4. Troubleshooting 'invalid_client'
If login fails with `invalid_client`:
1. Verify the **Client Secret** in the Appwrite Console matches Discord.
2. Verify the **Redirect URI** in Discord matches your project ID.
3. Ensure **Server Members Intent** is toggled ON in the Discord portal.
