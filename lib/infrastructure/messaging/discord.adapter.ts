import { INotificationProvider } from "@/lib/domain/ports/notification.provider";
import { env } from "@/lib/infrastructure/config/env";

const DISCORD_API = "https://discord.com/api/v10";

export class DiscordAdapter implements INotificationProvider {
  /**
   * Send a direct message to a user
   */
  async sendDM(userId: string, content: string): Promise<boolean> {
    if (!env.DISCORD_BOT_TOKEN) return false;

    try {
      // 1. Create DM Channel
      const dmRes = await fetch(`${DISCORD_API}/users/@me/channels`, {
        method: "POST",
        headers: {
          Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recipient_id: userId }),
      });

      if (!dmRes.ok) {
        console.error(
          `[DiscordAdapter] Failed to open DM with ${userId}: ${dmRes.status}`,
        );
        return false;
      }

      const channel = await dmRes.json();

      // 2. Send Message
      return await this.sendToChannel(channel.id, content);
    } catch (e) {
      console.error("[DiscordAdapter] sendDM failed", e);
      return false;
    }
  }

  /**
   * Send a message to a specific channel
   */
  async sendToChannel(channelId: string, content: string): Promise<boolean> {
    if (!env.DISCORD_BOT_TOKEN) return false;

    try {
      const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error(
          `[DiscordAdapter] Failed to send to channel ${channelId}: ${res.status} ${err}`,
        );
        return false;
      }
      return true;
    } catch (e) {
      console.error("[DiscordAdapter] sendToChannel failed", e);
      return false;
    }
  }
}
