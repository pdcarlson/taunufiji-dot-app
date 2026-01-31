/**
 * History Item
 *
 * Represents a points transaction for housing/library activities.
 */
export interface HistoryItem {
  id: string;
  reason: string;
  amount: number;
  category: string;
  timestamp: string;
}

/**
 * Dashboard Stats
 *
 * Data structure for the main dashboard page.
 */
export interface DashboardStats {
  points: number;
  activeTasks: number;
  pendingReviews: number;
  fullName: string;
  housingHistory?: HistoryItem[];
  libraryHistory?: HistoryItem[];
}
