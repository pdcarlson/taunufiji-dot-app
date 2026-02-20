import { COMMANDS } from "../lib/infrastructure/messaging/discord-api/commands";
import dotenv from "dotenv";

// Only load .env.local if not in CI (GitHub Actions sets env vars directly)
if (!process.env.GITHUB_ACTIONS) {
  dotenv.config({ path: ".env.local" });
}

const APP_ID = process.env.DISCORD_APP_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

async function registerCommands() {
  console.log("🛠️ Starting Discord Command Synchronization...");

  if (!APP_ID || !BOT_TOKEN || !GUILD_ID) {
    console.error("❌ Missing required environment variables (DISCORD_APP_ID, DISCORD_BOT_TOKEN, or DISCORD_GUILD_ID)");
    process.exit(1);
  }

  const url = `https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`;

  console.log(`📡 Sending ${COMMANDS.length} commands to Discord Guild ${GUILD_ID}...`);

  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(COMMANDS),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = errorText;
      }

      console.error("❌ Discord API Registration Failed:");
      console.error(JSON.stringify(errorData, null, 2));
      process.exit(1);
    }

    const data = await response.json() as any[];
    console.log(`✅ Successfully synchronized ${data.length} commands.`);
    console.log("📝 Active commands:", data.map((c) => `/${c.name}`).join(", "));
    
  } catch (err) {
    console.error("❌ Fatal Error during Discord command sync:", err);
    process.exit(1);
  }
}

registerCommands();
