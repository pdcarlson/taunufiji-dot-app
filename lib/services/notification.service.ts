import { env } from "../config/env";

const DISCORD_API = "https://discord.com/api/v10";

// Hardcoded for now, or move to Env/DB
const CHANNELS = {
    HOUSING: process.env.DISCORD_HOUSING_CHANNEL_ID || "" // Fallback?
};

export const NotificationService = {
  /**
   * Send a direct message to a user.
   * requires: DISCORD_BOT_TOKEN
   */
  async notifyUser(discordUserId: string, message: string) {
    if (!env.DISCORD_BOT_TOKEN) return false;

    try {
        // 1. Create DM Channel
        const dmRes = await fetch(`${DISCORD_API}/users/@me/channels`, {
            method: "POST",
            headers: {
                "Authorization": `Bot ${env.DISCORD_BOT_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ recipient_id: discordUserId })
        });

        if (!dmRes.ok) {
            console.error(`Failed to open DM with ${discordUserId}: ${dmRes.status}`);
            return false;
        }

        const channel = await dmRes.json();
        
        // 2. Send Message
        return await this.sendMessage(channel.id, message);
    } catch (e) {
        console.error("NotificationService.notifyUser Failed", e);
        return false;
    }
  },

  /**
   * Post to a public channel
   */
  async notifyChannel(channelId: string, message: string) {
      return await this.sendMessage(channelId, message);
  },

  /**
   * Internal Helper to send message to ID
   */
  async sendMessage(channelId: string, content: string) {
      if (!env.DISCORD_BOT_TOKEN) return false;

      try {
          const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
              method: "POST",
              headers: {
                  "Authorization": `Bot ${env.DISCORD_BOT_TOKEN}`,
                  "Content-Type": "application/json"
              },
              body: JSON.stringify({ content })
          });

          if (!res.ok) {
              const err = await res.text();
              console.error(`Failed to send Discord Msg to ${channelId}:`, err);
              return false;
          }
          return true;
      } catch (e) {
          console.error("NotificationService.sendMessage Failed", e);
          return false;
      }
  }
};
