/**
 * Discord Command Audit & Cleanup Script
 *
 * Purpose:
 * - Lists all registered commands (both guild and global)
 * - Provides option to delete all global commands
 * - Ensures only guild commands remain
 *
 * Usage: npx tsx scripts/audit-discord-commands.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// mock missing env vars
process.env.AWS_REGION = process.env.AWS_REGION || "us-east-1";
process.env.AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME || "mock-bucket";
process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "mock-project";

async function main() {
  const { env } = await import("@/lib/config/env");

  if (!env.DISCORD_APP_ID || !env.DISCORD_BOT_TOKEN) {
    console.error("❌ Missing Discord credentials");
    return;
  }

  const appId = env.DISCORD_APP_ID;
  const guildId = process.env.DISCORD_GUILD_ID;
  const headers = {
    Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
    "Content-Type": "application/json",
  };

  console.log("🔍 Discord Command Audit\n");

  // 1. fetch global commands
  console.log("=== GLOBAL COMMANDS ===");
  const globalUrl = `https://discord.com/api/v10/applications/${appId}/commands`;
  try {
    const globalRes = await fetch(globalUrl, { headers });
    if (globalRes.ok) {
      const globalCommands = await globalRes.json();
      console.log(`Found ${globalCommands.length} global commands:`);
      globalCommands.forEach((cmd: any) => {
        console.log(`  - ${cmd.name} (ID: ${cmd.id})`);
      });

      if (globalCommands.length > 0) {
        console.log("\n⚠️ WARNING: You have global commands registered!");
        console.log("Global commands take up to 1 hour to propagate.");
        console.log(
          "Recommended: Delete all global commands and use guild commands only.\n",
        );
      }
    } else {
      console.error(`Failed to fetch global commands: ${globalRes.status}`);
    }
  } catch (e) {
    console.error("Error fetching global commands:", e);
  }

  // 2. fetch guild commands
  if (guildId) {
    console.log("\n=== GUILD COMMANDS ===");
    const guildUrl = `https://discord.com/api/v10/applications/${appId}/guilds/${guildId}/commands`;
    try {
      const guildRes = await fetch(guildUrl, { headers });
      if (guildRes.ok) {
        const guildCommands = await guildRes.json();
        console.log(`Found ${guildCommands.length} guild commands:`);
        guildCommands.forEach((cmd: any) => {
          console.log(`  - ${cmd.name} (ID: ${cmd.id})`);
        });
      } else {
        console.error(`Failed to fetch guild commands: ${guildRes.status}`);
      }
    } catch (e) {
      console.error("Error fetching guild commands:", e);
    }
  } else {
    console.log("\n⚠️ DISCORD_GUILD_ID not set. Skipping guild command check.");
  }

  // 3. offer cleanup
  console.log("\n=== CLEANUP OPTIONS ===");
  console.log("To delete ALL global commands, run:");
  console.log(`  npx tsx scripts/delete-global-commands.ts\n`);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
