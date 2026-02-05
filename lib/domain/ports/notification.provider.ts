export interface INotificationProvider {
  /**
   * Send a direct message to a user
   */
  sendDM(userId: string, content: string): Promise<boolean>;

  /**
   * Send a message to a specific channel
   */
  sendToChannel(channelId: string, content: string): Promise<boolean>;
}
