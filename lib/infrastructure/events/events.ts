export enum DomainEvents {
  LIBRARY_UPLOADED = "library.uploaded",
  TASK_APPROVED = "task.approved",
  // Future: TASK_COMPLETED, USER_CREATED, etc.
}

export interface LibraryUploadedEvent {
  userId: string; // The user who uploaded (Discord ID)
  resourceId: string;
  fileName: string;
}

export interface TaskApprovedEvent {
  userId: string; // The user who did the task (Discord ID)
  taskId: string;
  title: string;
  points: number;
}
