import { getContainer } from "@/lib/infrastructure/container";
import { env } from "@/lib/infrastructure/config/env";
import { NotificationResult } from "@/lib/domain/ports/notification.provider";
import { BASE_URL, HOUSING_CONSTANTS } from "@/lib/constants";

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
  ): Promise<NotificationResult> {
    try {
      const { notificationProvider } = getContainer();
      const { message, link } = this.formatMessage(type, payload);
      const finalContent = link ? `${message} \n[View Task](${link})` : message;
      return await notificationProvider.sendDM(userId, finalContent);
    } catch (e) {
      const error = `Notification to ${userId} (${type}) failed: ${e instanceof Error ? e.message : String(e)}`;
      console.error(`[NotificationService] ${error}`);
      return { success: false, error };
    }
  },

  /**
   * Post to Admin Channel (e.g. for Proof Submission)
   */
  async notifyAdmins(
    message: string,
    payload?: { taskId?: string },
  ): Promise<NotificationResult> {
    if (!env.DISCORD_HOUSING_CHANNEL_ID) {
      return {
        success: false,
        error: "DISCORD_HOUSING_CHANNEL_ID not configured",
      };
    }

    const { notificationProvider } = getContainer();
    let content = message;
    if (payload?.taskId) {
      const link = `${BASE_URL}/dashboard/housing?taskId=${payload.taskId}`;
      content += `\n[Review Proof](${link})`;
    }

    return await notificationProvider.sendToChannel(
      env.DISCORD_HOUSING_CHANNEL_ID,
      content,
    );
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
        message = `Task expired: ${title}. A fine of -${Math.abs(HOUSING_CONSTANTS.FINE_MISSING_DUTY)} points has been applied.`;
        break;
      default:
        message = `Notification: ${title}`;
    }

    return { message, link };
  },
};
