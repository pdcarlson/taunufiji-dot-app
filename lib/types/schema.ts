export const DB_ID = "v2_internal_ops";

export const COLLECTIONS = {
  USERS: "users",
  LIBRARY: "library_resources",
  ASSIGNMENTS: "assignments",
  SCHEDULES: "housing_schedules",
  LEDGER: "ledger",
  PROFESSORS: "professors",
  COURSES: "courses",
} as const;

export interface UserSchema {
  discord_id: string; // Attribute (Unique Index) - Stable ID
  discord_handle: string;
  full_name: string;
  position_key: string;
  details_points_current: number;
  details_points_lifetime: number;
  status: "active" | "alumni";
  auth_id: string; // Link to Auth (Unique Index)
}

export interface LibraryResourceSchema {
  department: string;
  course_number: string;
  course_name: string;
  professor: string;
  semester: string;
  year: number;
  type: string;
  version: string;
  original_filename: string;
  file_s3_key: string;
  uploaded_by: string; // User ID
}

export interface ScheduleSchema {
  title: string;
  description: string;
  recurrence_rule: string; // e.g., "7" (days) or "FREQ=WEEKLY;BYDAY=MO"
  assigned_to?: string; // Default Assignee (Optional)
  points_value: number;
  active: boolean;
  last_generated_at?: string; // ISO, to track when we last spawned a task
}

export interface AssignmentSchema {
  title: string;
  description: string;
  status: "open" | "pending" | "approved" | "rejected" | "expired" | "locked";
  type: "duty" | "bounty" | "project" | "one_off";
  points_value: number;
  schedule_id?: string; // Link to parent schedule
  initial_image_s3_key?: string; // "Before" photo
  proof_s3_key?: string; // "After" photo
  assigned_to?: string; // User ID
  due_at?: string; // ISO
  expires_at?: string; // ISO (For Bounties)
  unlock_at?: string; // ISO (For Recurring Tasks Cooldown)
  is_fine?: boolean;
  notification_level?: "none" | "unlocked" | "urgent" | "expired"; // Track notification stage
  execution_limit?: number; // Hours to complete once claimed
}

export interface LedgerSchema {
  amount: number;
  reason: string;
  category: "task" | "fine" | "event" | "manual";
  timestamp: string;
  user_id: string; // User ID
  is_debit?: boolean; // True if amount is a deduction (because amount must be positive in DB)
}

export interface ProfessorSchema {
  name: string;
}

export interface CourseSchema {
  department: string;
  course_number: string;
  course_name: string;
}
