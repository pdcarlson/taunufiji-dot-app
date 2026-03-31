/**
 * In-process counters for NotifyExpiredJob observability (cron / Vercel logs).
 * Reset each `NotifyExpiredJob.run` invocation; use log summary for monitoring.
 */
export type NotifyExpiredJobCounters = {
  refetchFirstAttempt: number;
  refetchFirstHit: number;
  refetchFirstMiss: number;
  skipIneligible: number;
  missingAfterAdminStep: number;
  skipAlreadyFullyNotified: number;
  notifiedSuccess: number;
  channelFailed: number;
  dmFailed: number;
};

export function createNotifyExpiredJobCounters(): NotifyExpiredJobCounters {
  return {
    refetchFirstAttempt: 0,
    refetchFirstHit: 0,
    refetchFirstMiss: 0,
    skipIneligible: 0,
    missingAfterAdminStep: 0,
    skipAlreadyFullyNotified: 0,
    notifiedSuccess: 0,
    channelFailed: 0,
    dmFailed: 0,
  };
}
