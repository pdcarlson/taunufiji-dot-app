import { describe, expect, it, vi } from "vitest";
import { fetchAllTaskPages, HOUSING_CRON_TASK_PAGE_SIZE } from "./task-query-pagination";
import { MockFactory } from "@/lib/test/mock-factory";

describe("fetchAllTaskPages", () => {
  it("throws when pageSize is not a positive integer", async () => {
    const taskRepository = MockFactory.createTaskRepository();
    await expect(
      fetchAllTaskPages(
        taskRepository,
        { status: "open", orderBy: "due_at", orderDirection: "asc" },
        0,
      ),
    ).rejects.toThrow(/fetchAllTaskPages: pageSize must be a positive integer/);
  });

  it("pages until a short page and concatenates in order", async () => {
    const taskRepository = MockFactory.createTaskRepository();
    const pageSize = HOUSING_CRON_TASK_PAGE_SIZE;
    const first = Array.from({ length: pageSize }, (_, i) => ({
      id: `a-${i}`,
    }));
    const second = [{ id: "b-0" }];

    taskRepository.findMany = vi.fn().mockImplementation(async (opts) => {
      if (opts.offset === 0) return first;
      if (opts.offset === pageSize) return second;
      return [];
    });

    const all = await fetchAllTaskPages(
      taskRepository,
      { status: "open", orderBy: "due_at", orderDirection: "asc" },
      pageSize,
    );

    expect(all).toHaveLength(pageSize + 1);
    expect(all[0].id).toBe("a-0");
    expect(all[pageSize].id).toBe("b-0");
    expect(taskRepository.findMany).toHaveBeenCalledTimes(2);
  });
});
