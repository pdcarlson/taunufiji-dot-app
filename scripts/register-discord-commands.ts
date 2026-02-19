import { COMMANDS } from "../lib/infrastructure/messaging/discord-api/commands";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const APP_ID = process.env.DISCORD_APP_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

async function registerCommands() {
  if (!APP_ID || !BOT_TOKEN || !GUILD_ID) {
    console.error("❌ Missing Discord environment variables (APP_ID, BOT_TOKEN, or GUILD_ID)");
    process.exit(1);
  }

  const url = `https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`;

  console.log(`🚀 Registering ${COMMANDS.length} commands to Guild ${GUILD_ID}...`);

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
      const error = await response.text();
      throw new Error(`Discord API Error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    console.log("✅ Successfully registered commands:", data.map((c: any) => c.name).join(", "));
  } catch (err) {
    console.error("❌ Failed to register commands:", err);
    process.exit(1);
  }
}

registerCommands();
