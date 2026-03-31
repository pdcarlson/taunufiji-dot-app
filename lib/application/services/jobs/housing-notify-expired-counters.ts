/**
 * In-process counters for NotifyExpiredJob observability (cron / Vercel logs).
 * Reset each `NotifyExpiredJob.run` invocation; use log summary for monitoring.
 */
export type NotifyExpiredJobCounters = {
  refetch_first_attempt: number;
  refetch_first_hit: number;
  refetch_first_miss: number;
  skip_ineligible: number;
  missing_after_admin_step: number;
  skip_already_fully_notified: number;
  notified_success: number;
  channel_failed: number;
  dm_failed: number;
};

export function createNotifyExpiredJobCounters(): NotifyExpiredJobCounters {
  return {
    refetch_first_attempt: 0,
    refetch_first_hit: 0,
    refetch_first_miss: 0,
    skip_ineligible: 0,
    missing_after_admin_step: 0,
    skip_already_fully_notified: 0,
    notified_success: 0,
    channel_failed: 0,
    dm_failed: 0,
  };
}
