import { describe, expect, it, vi, beforeEach } from "vitest";
import { CronService } from "./cron.service";
import { HousingTimeDrivenPipeline } from "./housing-time-driven.pipeline";
import { MockFactory } from "@/lib/test/mock-factory";
import type { IPointsService } from "@/lib/domain/ports/services/points.service.port";
import type { IScheduleService } from "@/lib/domain/ports/services/schedule.service.port";

describe("CronService.runHourly", () => {
  const taskRepository = MockFactory.createTaskRepository();
  const ledgerRepository = MockFactory.createLedgerRepository();
  const pointsService = {
    awardPoints: vi.fn(),
  } as unknown as IPointsService;
  const scheduleService = {
    triggerNextInstance: vi.fn(),
  } as unknown as IScheduleService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(HousingTimeDrivenPipeline, "runFullHourlyCycle").mockResolvedValue({
      unlocked: 1,
      recurring_notified: 1,
      urgent: 1,
      expired_notified: 1,
      skipped_unassigned: 0,
      errors: [],
    });
  });

  it("delegates to HousingTimeDrivenPipeline.runFullHourlyCycle and returns its stats", async () => {
    const cronService = new CronService(
      HousingTimeDrivenPipeline,
      taskRepository,
      pointsService,
      scheduleService,
      ledgerRepository,
    );

    const result = await cronService.runHourly();

    expect(result).toEqual({
      unlocked: 1,
      recurring_notified: 1,
      urgent: 1,
      expired_notified: 1,
      skipped_unassigned: 0,
      errors: [],
    });
    expect(HousingTimeDrivenPipeline.runFullHourlyCycle).toHaveBeenCalledWith(
      taskRepository,
      pointsService,
      scheduleService,
      ledgerRepository,
    );
  });
});
