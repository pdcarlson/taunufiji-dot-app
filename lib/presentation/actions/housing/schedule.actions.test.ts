import { beforeEach, describe, expect, it, vi } from "vitest";
import { HOUSING_ADMIN_ROLES } from "@/lib/infrastructure/config/roles";

const hoisted = vi.hoisted(() => {
  const mockContainer = {
    scheduleService: {
      createSchedule: vi.fn(),
      getSchedule: vi.fn(),
      updateSchedule: vi.fn(),
      getSchedules: vi.fn(),
    },
  };

  const mockActionWrapper = vi.fn(
    async (
      action: (ctx: {
        container: typeof mockContainer;
        userId: string;
        account: null;
      }) => Promise<unknown>,
      options: unknown,
    ): Promise<Record<string, unknown>> => {
      const data = await action({
        container: mockContainer,
        userId: "auth_admin",
        account: null,
      });
      return { success: true, data, options };
    },
  );

  return {
    mockContainer,
    mockActionWrapper,
  };
});

vi.mock("@/lib/presentation/utils/action-handler", () => ({
  actionWrapper: hoisted.mockActionWrapper,
}));

import {
  createScheduleAction,
  getScheduleAction,
  getSchedulesAction,
  updateScheduleLeadTimeAction,
} from "./schedule.actions";

describe("housing schedule actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.mockContainer.scheduleService.createSchedule.mockResolvedValue({
      id: "schedule-1",
    });
    hoisted.mockContainer.scheduleService.getSchedule.mockResolvedValue({
      id: "schedule-1",
    });
    hoisted.mockContainer.scheduleService.updateSchedule.mockResolvedValue({
      id: "schedule-1",
      lead_time_hours: 48,
    });
    hoisted.mockContainer.scheduleService.getSchedules.mockResolvedValue([
      { id: "schedule-1" },
    ]);
  });

  it("enforces housing admin roles for create schedule action", async () => {
    await createScheduleAction(
      {
        title: "Kitchen",
        description: "Clean kitchen",
        recurrence_rule: "FREQ=WEEKLY;BYDAY=FR",
        points_value: 0,
        active: true,
      },
      "jwt-token",
    );

    expect(hoisted.mockActionWrapper).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        jwt: "jwt-token",
        allowedRoles: HOUSING_ADMIN_ROLES,
        actionName: "housing.createSchedule",
      }),
    );
  });

  it("enforces housing admin roles for get schedule action", async () => {
    await getScheduleAction("schedule-1", "jwt-token");

    expect(hoisted.mockActionWrapper).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        jwt: "jwt-token",
        allowedRoles: HOUSING_ADMIN_ROLES,
        actionName: "housing.getSchedule",
      }),
    );
  });

  it("passes lead time update and housing admin roles", async () => {
    await updateScheduleLeadTimeAction("schedule-1", 48, "jwt-token");

    expect(
      hoisted.mockContainer.scheduleService.updateSchedule,
    ).toHaveBeenCalledWith(
      "schedule-1",
      {
        lead_time_hours: 48,
      },
      undefined,
    );
    expect(hoisted.mockActionWrapper).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        jwt: "jwt-token",
        allowedRoles: HOUSING_ADMIN_ROLES,
        actionName: "housing.updateScheduleLeadTime",
      }),
    );
  });

  it("forwards recurring scope options when updating lead time", async () => {
    await updateScheduleLeadTimeAction("schedule-1", 48, "jwt-token", {
      scope: "this_and_future",
      effectiveFromDueAt: "2026-03-10T03:59:00.000Z",
    });

    expect(
      hoisted.mockContainer.scheduleService.updateSchedule,
    ).toHaveBeenCalledWith(
      "schedule-1",
      { lead_time_hours: 48 },
      {
        scope: "this_and_future",
        effectiveFromDueAt: "2026-03-10T03:59:00.000Z",
      },
    );
  });

  it("enforces housing admin roles for list schedules action", async () => {
    await getSchedulesAction("jwt-token");

    expect(hoisted.mockActionWrapper).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        jwt: "jwt-token",
        allowedRoles: HOUSING_ADMIN_ROLES,
        actionName: "housing.getSchedules",
      }),
    );
  });

  it("returns empty array when schedule list action fails", async () => {
    hoisted.mockActionWrapper.mockResolvedValueOnce({
      success: false,
      error: "boom",
      errorCode: "UNKNOWN_ERROR",
    });

    const result = await getSchedulesAction("jwt-token");
    expect(hoisted.mockActionWrapper).toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});
