import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// Mock missing env vars to bypass strict validation in lib/config/env.ts
// These aren't needed for Registration, but env.ts checks them.
process.env.AWS_REGION = process.env.AWS_REGION || "us-east-1";
process.env.AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME || "mock-bucket";
process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "mock-project";

async function registerCommands() {
  // Dynamic imports to ensure env vars (and mocks) are set BEFORE lib/config/env runs
  const { COMMANDS } = await import("@/lib/infrastructure/discord/commands");
  const { env } = await import("@/lib/infrastructure/config/env");

  if (!env.DISCORD_APP_ID || !env.DISCORD_BOT_TOKEN) {
    console.error(
      "❌ Missing Discord Environment Variables (DISCORD_APP_ID or DISCORD_BOT_TOKEN).",
    );
    return;
  }

  // Guild commands are instant; global commands take up to 1 hour
  const guildId = process.env.DISCORD_GUILD_ID;
  const url = guildId
    ? `https://discord.com/api/v10/applications/${env.DISCORD_APP_ID}/guilds/${guildId}/commands`
    : `https://discord.com/api/v10/applications/${env.DISCORD_APP_ID}/commands`;

  console.log(
    guildId
      ? "🏠 Registering GUILD commands (instant)"
      : "🌐 Registering GLOBAL commands (up to 1h delay)",
  );
  console.log("🚀 URL:", url);
  console.log("📋 Command List:", COMMANDS.map((c) => c.name).join(", "));

  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(COMMANDS),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Successfully registered ${data.length} commands!`);
    } else {
      console.error("❌ Failed to register commands.");
      const errorText = await response.text();
      try {
        console.error(JSON.stringify(JSON.parse(errorText), null, 2));
      } catch {
        console.error(errorText);
      }
    }
  } catch (e) {
    console.error("❌ Network Error during registration:", e);
  }
}

registerCommands();
