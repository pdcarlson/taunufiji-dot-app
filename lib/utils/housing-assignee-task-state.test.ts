import { describe, expect, it } from "vitest";
import { HousingTask } from "@/lib/domain/entities";
import {
  isAssigneeNotCompletable,
  isAwaitingExpiryTransition,
  isPastDueAt,
} from "./housing-assignee-task-state";

const baseTask: HousingTask = {
  id: "t1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  title: "Duty",
  description: "",
  status: "pending",
  type: "duty",
  points_value: 0,
};

describe("housing-assignee-task-state", () => {
  it("isPastDueAt respects due_at", () => {
    const past = "2020-01-01T12:00:00.000Z";
    expect(isPastDueAt(past, new Date("2025-01-01T00:00:00.000Z"))).toBe(true);
    expect(isPastDueAt(past, new Date("2019-01-01T00:00:00.000Z"))).toBe(false);
    expect(isPastDueAt(null)).toBe(false);
  });

  it("isAwaitingExpiryTransition is pending without proof and past due", () => {
    const task = {
      ...baseTask,
      due_at: "2020-01-01T12:00:00.000Z",
      proof_s3_key: null,
    };
    expect(isAwaitingExpiryTransition(task, new Date("2025-01-01T00:00:00.000Z"))).toBe(
      true,
    );
    expect(
      isAwaitingExpiryTransition(
        { ...task, proof_s3_key: "key" },
        new Date("2025-01-01T00:00:00.000Z"),
      ),
    ).toBe(false);
    expect(
      isAwaitingExpiryTransition(
        { ...task, status: "open" },
        new Date("2025-01-01T00:00:00.000Z"),
      ),
    ).toBe(false);
  });

  it("isAssigneeNotCompletable covers expired and awaiting transition", () => {
    expect(
      isAssigneeNotCompletable(
        { ...baseTask, status: "expired" },
        new Date(),
      ),
    ).toBe(true);
    expect(
      isAssigneeNotCompletable(
        {
          ...baseTask,
          due_at: "2020-01-01T12:00:00.000Z",
          proof_s3_key: null,
        },
        new Date("2025-01-01T00:00:00.000Z"),
      ),
    ).toBe(true);
    expect(
      isAssigneeNotCompletable(
        {
          ...baseTask,
          due_at: "2030-01-01T12:00:00.000Z",
          proof_s3_key: null,
        },
        new Date("2025-01-01T00:00:00.000Z"),
      ),
    ).toBe(false);
  });
});
