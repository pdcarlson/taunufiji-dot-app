import {
  INotificationProvider,
  NotificationResult,
} from "@/lib/domain/ports/notification.provider";
import { env } from "@/lib/infrastructure/config/env";

const DISCORD_API = "https://discord.com/api/v10";

export class DiscordProvider implements INotificationProvider {
  /**
   * Send a direct message to a user
   */
  async sendDM(userId: string, content: string): Promise<NotificationResult> {
    if (!env.DISCORD_BOT_TOKEN)
      return { success: false, error: "DISCORD_BOT_TOKEN not configured" };

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
        const errBody = await dmRes.text();
        const error = `Failed to open DM with ${userId}: ${dmRes.status} ${errBody}`;
        console.error(`[DiscordAdapter] ${error}`);
        return { success: false, error };
      }

      const channel = await dmRes.json();

      // 2. Send Message
      return await this.sendToChannel(channel.id, content);
    } catch (e) {
      const error = `sendDM exception: ${e instanceof Error ? e.message : String(e)}`;
      console.error(`[DiscordAdapter] ${error}`);
      return { success: false, error };
    }
  }

  /**
   * Send a message to a specific channel
   */
  async sendToChannel(
    channelId: string,
    content: string,
  ): Promise<NotificationResult> {
    if (!env.DISCORD_BOT_TOKEN)
      return { success: false, error: "DISCORD_BOT_TOKEN not configured" };

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
        const errBody = await res.text();
        const error = `Failed to send to channel ${channelId}: ${res.status} ${errBody}`;
        console.error(`[DiscordAdapter] ${error}`);
        return { success: false, error };
      }
      return { success: true };
    } catch (e) {
      const error = `sendToChannel exception: ${e instanceof Error ? e.message : String(e)}`;
      console.error(`[DiscordAdapter] ${error}`);
      return { success: false, error };
    }
  }
}
