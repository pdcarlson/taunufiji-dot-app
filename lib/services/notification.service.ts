import { env } from "../config/env";

const DISCORD_API = "https://discord.com/api/v10";
const BASE_URL = "https://taunufiji.app"; // Or env.NEXT_PUBLIC_APP_URL

// Notification Types matching the Matrix
export type NotificationType =
  | "unlocked"
  | "urgent"
  | "assigned"
  | "updated"
  | "approved"
  | "rejected"
  | "unassigned"
  | "submitted" // Channel only
  | "expired"; // User DM when task expires

export const NotificationService = {
  /**
   * Main entry point for User Notifications
   */
  async sendNotification(
    userId: string,
    type: NotificationType,
    payload: {
      title: string;
      taskId?: string;
      points?: number;
      reason?: string;
    },
  ) {
    try {
      const { message, link } = this.formatMessage(type, payload);
      const finalContent = link ? `${message} \n[View Task](${link})` : message;
      return await this.notifyUser(userId, finalContent);
    } catch (e) {
      // Fail Safe: Don't block business logic if Discord is down
      console.error("Notification Failed silently:", e);
      return false;
    }
  },

  /**
   * Post to Admin Channel (e.g. for Proof Submission)
   */
  async notifyAdmins(message: string, payload?: { taskId?: string }) {
    if (!env.DISCORD_HOUSING_CHANNEL_ID) return false;

    let content = message;
    if (payload?.taskId) {
      const link = `${BASE_URL}/dashboard/housing?taskId=${payload.taskId}`;
      content += `\n[Review Proof](${link})`;
    }

    return await this.notifyChannel(env.DISCORD_HOUSING_CHANNEL_ID, content);
  },

  /**
   * Formats the standard message string based on type
   */
  formatMessage(
    type: NotificationType,
    payload: {
      title: string;
      taskId?: string;
      points?: number;
      reason?: string;
    },
  ) {
    const { title, taskId, points, reason } = payload;
    const link = taskId
      ? `${BASE_URL}/dashboard/housing?taskId=${taskId}`
      : undefined;

    let message = "";

    switch (type) {
      case "unlocked":
        message = `Task available: ${title}`;
        break;
      case "urgent":
        message = `Urgent: ${title} due in <12 hours`;
        break;
      case "assigned":
        message = `Assigned to you: ${title}`;
        break;
      case "updated":
        message = `Task updated: ${title}`;
        break;
      case "unassigned":
        message = `Removed from task: ${title}`;
        break;
      case "approved":
        message = `Task approved: ${title} (+${points || 0} pts)`;
        break;
      case "rejected":
        message = `Task rejected: ${title}${reason ? `. Reason: ${reason}` : ""}`;
        break;
      case "expired":
        message = `Task expired: ${title}. A fine of -50 points has been applied.`;
        break;
      default:
        message = `Notification: ${title}`;
    }

    return { message, link };
  },

  // --- Low Level Methods ---

  async notifyUser(discordUserId: string, message: string) {
    if (!env.DISCORD_BOT_TOKEN) return false;

    try {
      const dmRes = await fetch(`${DISCORD_API}/users/@me/channels`, {
        method: "POST",
        headers: {
          Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recipient_id: discordUserId }),
      });

      if (!dmRes.ok) {
        console.error(
          `Failed to open DM with ${discordUserId}: ${dmRes.status}`,
        );
        return false;
      }

      const channel = await dmRes.json();
      return await this.sendMessage(channel.id, message);
    } catch (e) {
      console.error("NotificationService.notifyUser Failed", e);
      return false;
    }
  },

  async notifyChannel(channelId: string, message: string) {
    return await this.sendMessage(channelId, message);
  },

  async sendMessage(channelId: string, content: string) {
    if (!env.DISCORD_BOT_TOKEN) {
      throw new Error("DISCORD_BOT_TOKEN not set in environment");
    }

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
        throw new Error(`Discord API Error (${res.status}): ${err}`);
      }
      return true;
    } catch (e) {
      if (e instanceof Error) {
        throw e; // Re-throw with full details
      }
      throw new Error(`Unknown error in sendMessage: ${String(e)}`);
    }
  },
};
