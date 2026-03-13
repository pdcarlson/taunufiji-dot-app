import { COMMANDS } from "../lib/infrastructure/messaging/discord-api/commands";
import { env } from "../lib/infrastructure/config/env";

const APP_ID = env.DISCORD_APP_ID;
const BOT_TOKEN = env.DISCORD_BOT_TOKEN;
const GUILD_ID = env.DISCORD_GUILD_ID;

async function registerCommands() {
  console.log("🛠️ Starting Discord Command Synchronization...");

  if (!APP_ID || !BOT_TOKEN || !GUILD_ID) {
    console.error(
      "❌ Missing required environment variables (DISCORD_APP_ID, DISCORD_BOT_TOKEN, or DISCORD_GUILD_ID)",
    );
    process.exit(1);
  }

  const url = `https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`;

  console.log(
    `📡 Sending ${COMMANDS.length} commands to Discord Guild ${GUILD_ID}...`,
  );

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

    interface DiscordCommandResponse {
      name: string;
    }
    const data = (await response.json()) as DiscordCommandResponse[];
    console.log(`✅ Successfully synchronized ${data.length} commands.`);
    console.log(
      "📝 Active commands:",
      data.map((c) => `/${c.name}`).join(", "),
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ Fatal Error during Discord command sync:", message);
    process.exit(1);
  }
}

registerCommands();
