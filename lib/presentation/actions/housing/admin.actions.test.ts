import { beforeEach, describe, expect, it, vi } from "vitest";
import { HOUSING_ADMIN_ROLES } from "@/lib/infrastructure/config/roles";

const hoisted = vi.hoisted(() => {
  const mockContainer = {
    adminService: {
      createTask: vi.fn(),
      updateTask: vi.fn(),
      deleteTask: vi.fn(),
      verifyTask: vi.fn(),
      rejectTask: vi.fn(),
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
    ) => {
      try {
        const data = await action({
          container: mockContainer,
          userId: "auth_admin",
          account: null,
        });
        return { success: true, data, options };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          options,
        };
      }
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
  approveTaskAction,
  createTaskAction,
  deleteTaskAction,
  rejectTaskAction,
  updateTaskAction,
} from "./admin.actions";

describe("housing admin actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.mockContainer.adminService.createTask.mockResolvedValue({
      id: "task-1",
    });
    hoisted.mockContainer.adminService.updateTask.mockResolvedValue({
      id: "task-1",
    });
    hoisted.mockContainer.adminService.deleteTask.mockResolvedValue(undefined);
    hoisted.mockContainer.adminService.verifyTask.mockResolvedValue(true);
    hoisted.mockContainer.adminService.rejectTask.mockResolvedValue(true);
  });

  it("passes housing admin roles for create task action", async () => {
    await createTaskAction({ title: "Test Task" }, "jwt-token");

    expect(hoisted.mockActionWrapper).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        jwt: "jwt-token",
        allowedRoles: HOUSING_ADMIN_ROLES,
        actionName: "housing.createTask",
      }),
    );
  });

  it("passes housing admin roles for update task action", async () => {
    await updateTaskAction("task-1", { description: "updated" }, "jwt-token");

    expect(hoisted.mockActionWrapper).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        jwt: "jwt-token",
        allowedRoles: HOUSING_ADMIN_ROLES,
        actionName: "housing.updateTask",
      }),
    );
  });

  it("passes housing admin roles for delete task action", async () => {
    await deleteTaskAction("task-1", "jwt-token");

    expect(hoisted.mockActionWrapper).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        jwt: "jwt-token",
        allowedRoles: HOUSING_ADMIN_ROLES,
        actionName: "housing.deleteTask",
      }),
    );
  });

  it("passes acting user id to verifyTask on approve", async () => {
    await approveTaskAction("task-1", "jwt-token", 25);

    expect(hoisted.mockContainer.adminService.verifyTask).toHaveBeenCalledWith(
      "task-1",
      "auth_admin",
      25,
    );
    expect(hoisted.mockActionWrapper).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        allowedRoles: HOUSING_ADMIN_ROLES,
        actionName: "housing.approveTask",
      }),
    );
  });

  it("passes housing admin roles for reject action", async () => {
    await rejectTaskAction("task-1", "Need clearer proof", "jwt-token");

    expect(hoisted.mockActionWrapper).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        jwt: "jwt-token",
        allowedRoles: HOUSING_ADMIN_ROLES,
        actionName: "housing.rejectTask",
      }),
    );
  });
});
