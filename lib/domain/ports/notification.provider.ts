/** Structured result for notification operations */
export interface NotificationResult {
  success: boolean;
  error?: string;
}

export interface INotificationProvider {
  /**
   * Send a direct message to a user
   */
  sendDM(userId: string, content: string): Promise<NotificationResult>;

  /**
   * Send a message to a specific channel
   */
  sendToChannel(
    channelId: string,
    content: string,
  ): Promise<NotificationResult>;
}
