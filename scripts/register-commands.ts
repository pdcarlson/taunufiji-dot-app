
import { COMMANDS } from "@/lib/discord/commands";
import { env } from "@/lib/config/env";

async function registerCommands() {
  const url = `https://discord.com/api/v10/applications/${env.DISCORD_CLIENT_ID}/commands`;

  console.log("Registering commands to:", url);

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bot ${env.DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(COMMANDS),
  });

  if (response.ok) {
    console.log("✅ Commands registered successfully!");
    const data = await response.json();
    console.log(`Registered ${data.length} commands.`);
  } else {
    console.error("❌ Failed to register commands.");
    const errorText = await response.text();
    console.error(errorText);
  }
}

registerCommands();
