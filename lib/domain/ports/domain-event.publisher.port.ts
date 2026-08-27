/**
 * Outbound domain events from application services (implementation lives in infrastructure).
 */
export interface LibraryUploadedNotification {
  userId: string;
  resourceId: string;
  fileName: string;
}

export interface IDomainEventPublisher {
  publishLibraryUploaded(payload: LibraryUploadedNotification): Promise<void>;
}
