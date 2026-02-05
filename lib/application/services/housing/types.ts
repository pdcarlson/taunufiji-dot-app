export interface CreateAssignmentDTO {
  title: string;
  description: string;
  points_value: number;
  type: "duty" | "bounty" | "project" | "one_off";
  schedule_id?: string;
  initial_image_s3_key?: string;
  assigned_to?: string;
  due_at?: string;
  expires_at?: string;
  unlock_at?: string;
  status?: "open" | "pending" | "locked";
  is_fine?: boolean;
  execution_limit?: number;
}

export interface CreateScheduleDTO {
  title: string;
  description: string;
  points_value: number;
  recurrence_rule: string;
  assigned_to?: string;
  lead_time_hours?: number;
}
