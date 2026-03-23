import { describe, expect, it, vi, beforeEach } from "vitest";
import type { IPointsService } from "@/lib/domain/ports/services/points.service.port";
import type { IScheduleService } from "@/lib/domain/ports/services/schedule.service.port";

const hoisted = vi.hoisted(() => ({
  unlockRun: vi.fn(),
  recurringRun: vi.fn(),
  urgentRun: vi.fn(),
  expireRun: vi.fn(),
  pendingFinesRun: vi.fn(),
  notifyExpiredRun: vi.fn(),
  ensureFutureRun: vi.fn(),
}));

vi.mock("./handlers/unlock-tasks.job", () => ({
  UnlockTasksJob: { run: hoisted.unlockRun },
}));

vi.mock("./handlers/notify-recurring.job", () => ({
  NotifyRecurringJob: { run: hoisted.recurringRun },
}));

vi.mock("./handlers/notify-urgent.job", () => ({
  NotifyUrgentJob: { run: hoisted.urgentRun },
}));

vi.mock("./handlers/expire-duties.job", () => ({
  expireDutiesJob: hoisted.expireRun,
}));

vi.mock("./handlers/pending-fines.job", () => ({
  pendingFinesJob: hoisted.pendingFinesRun,
}));

vi.mock("./handlers/notify-expired.job", () => ({
  NotifyExpiredJob: { run: hoisted.notifyExpiredRun },
}));

vi.mock("./handlers/ensure-future-tasks.job", () => ({
  ensureFutureTasksJob: hoisted.ensureFutureRun,
}));

import { HousingTimeDrivenPipeline } from "./housing-time-driven.pipeline";
import { MockFactory } from "@/lib/test/mock-factory";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("HousingTimeDrivenPipeline.runFullHourlyCycle", () => {
  const taskRepository = MockFactory.createTaskRepository();
  const pointsService = {
    awardPoints: vi.fn(),
  } as unknown as IPointsService;
  const scheduleService = {
    triggerNextInstance: vi.fn(),
  } as unknown as IScheduleService;

  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.unlockRun.mockResolvedValue({ unlocked: 1, errors: [] });
    hoisted.recurringRun.mockResolvedValue({ notified: 1, errors: [] });
    hoisted.urgentRun.mockResolvedValue({ urgent: 1, errors: [] });
    hoisted.expireRun.mockResolvedValue({ errors: [] });
    hoisted.pendingFinesRun.mockResolvedValue({ errors: [] });
    hoisted.notifyExpiredRun.mockResolvedValue({
      expired_notified: 1,
      skipped_unassigned: 0,
      errors: [],
    });
    hoisted.ensureFutureRun.mockResolvedValue(undefined);
  });

  it("aggregates unlock vs recurring counts and runs steps sequentially", async () => {
    const d1 = deferred<void>();
    const d2 = deferred<void>();
    const d3 = deferred<void>();
    const d4 = deferred<void>();
    const d5 = deferred<void>();
    const d6 = deferred<void>();
    const d7 = deferred<void>();

    hoisted.unlockRun.mockReturnValue(
      d1.promise.then(() => ({ unlocked: 1, errors: [] })),
    );
    hoisted.recurringRun.mockReturnValue(
      d2.promise.then(() => ({ notified: 2, errors: [] })),
    );
    hoisted.urgentRun.mockReturnValue(
      d3.promise.then(() => ({ urgent: 1, errors: [] })),
    );
    hoisted.expireRun.mockReturnValue(
      d4.promise.then(() => ({ errors: [] })),
    );
    hoisted.pendingFinesRun.mockReturnValue(
      d5.promise.then(() => ({ errors: [] })),
    );
    hoisted.notifyExpiredRun.mockReturnValue(
      d6.promise.then(() => ({
        expired_notified: 1,
        skipped_unassigned: 0,
        errors: [],
      })),
    );
    hoisted.ensureFutureRun.mockReturnValue(d7.promise.then(() => undefined));

    const pipelinePromise = HousingTimeDrivenPipeline.runFullHourlyCycle(
      taskRepository,
      pointsService,
      scheduleService,
    );

    await vi.waitFor(() => expect(hoisted.unlockRun).toHaveBeenCalled());
    expect(hoisted.recurringRun).not.toHaveBeenCalled();
    d1.resolve();

    await vi.waitFor(() => expect(hoisted.recurringRun).toHaveBeenCalled());
    expect(hoisted.urgentRun).not.toHaveBeenCalled();
    d2.resolve();

    await vi.waitFor(() => expect(hoisted.urgentRun).toHaveBeenCalled());
    expect(hoisted.expireRun).not.toHaveBeenCalled();
    d3.resolve();

    await vi.waitFor(() => expect(hoisted.expireRun).toHaveBeenCalled());
    expect(hoisted.pendingFinesRun).not.toHaveBeenCalled();
    d4.resolve();

    await vi.waitFor(() => expect(hoisted.pendingFinesRun).toHaveBeenCalled());
    expect(hoisted.notifyExpiredRun).not.toHaveBeenCalled();
    d5.resolve();

    await vi.waitFor(() => expect(hoisted.notifyExpiredRun).toHaveBeenCalled());
    expect(hoisted.ensureFutureRun).not.toHaveBeenCalled();
    d6.resolve();

    await vi.waitFor(() => expect(hoisted.ensureFutureRun).toHaveBeenCalled());
    d7.resolve();

    const result = await pipelinePromise;

    expect(result).toEqual({
      unlocked: 1,
      recurring_notified: 2,
      urgent: 1,
      expired_notified: 1,
      skipped_unassigned: 0,
      errors: [],
    });
  });
});
