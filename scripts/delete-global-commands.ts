/**
 * Delete All Global Discord Commands
 *
 * Purpose: Removes all globally registered Discord commands
 * Use this when you only want guild-specific commands (instant updates)
 *
 * Usage: npx tsx scripts/delete-global-commands.ts
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

async function deleteGlobalCommands() {
  const { env } = await import("@/lib/config/env");

  if (!env.DISCORD_APP_ID || !env.DISCORD_BOT_TOKEN) {
    console.error("❌ Missing Discord credentials");
    return;
  }

  const url = `https://discord.com/api/v10/applications/${env.DISCORD_APP_ID}/commands`;
  const headers = {
    Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
    "Content-Type": "application/json",
  };

  console.log("🗑️ Deleting all global Discord commands...\n");

  try {
    // use PUT with empty array to delete all global commands
    const response = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify([]),
    });

    if (response.ok) {
      console.log("✅ Successfully deleted all global commands!");
      console.log("\n📝 Note: This takes effect immediately.");
      console.log("Your guild commands will still work instantly.\n");
    } else {
      console.error("❌ Failed to delete global commands");
      const errorText = await response.text();
      console.error("Response:", errorText);
    }
  } catch (e) {
    console.error("❌ Network error:", e);
  }
}

deleteGlobalCommands();
