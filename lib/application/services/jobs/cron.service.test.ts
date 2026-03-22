import { describe, expect, it, vi, beforeEach } from "vitest";

const hoisted = vi.hoisted(() => {
  return {
    runFromContainer: vi.fn(),
  };
});

vi.mock("./housing-time-driven.pipeline", () => ({
  HousingTimeDrivenPipeline: {
    runFromContainer: hoisted.runFromContainer,
  },
}));

import { CronService } from "./cron.service";

describe("CronService.runHourly", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.runFromContainer.mockResolvedValue({
      unlocked: 2,
      urgent: 1,
      expired_notified: 1,
      skipped_unassigned: 0,
      errors: [],
    });
  });

  it("delegates to HousingTimeDrivenPipeline and returns its stats", async () => {
    const result = await CronService.runHourly();

    expect(result).toEqual({
      unlocked: 2,
      urgent: 1,
      expired_notified: 1,
      skipped_unassigned: 0,
      errors: [],
    });
    expect(hoisted.runFromContainer).toHaveBeenCalledTimes(1);
  });
});
