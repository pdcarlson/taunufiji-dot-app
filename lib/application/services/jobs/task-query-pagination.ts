import { HousingTask } from "@/lib/domain/types/task";
import {
  ITaskRepository,
  TaskQueryOptions,
} from "@/lib/domain/ports/task.repository";

/** Appwrite listDocuments page size for housing cron scans (stay within query limits, drain via offset). */
export const HOUSING_CRON_TASK_PAGE_SIZE = 100;

/**
 * Loads all tasks matching `base` by paging with a stable `orderBy` until a page returns fewer than `pageSize` rows.
 * Prevents silent truncation when more than one Appwrite page of rows match.
 */
export async function fetchAllTaskPages(
  taskRepository: ITaskRepository,
  base: Omit<TaskQueryOptions, "offset" | "limit">,
  pageSize: number,
): Promise<HousingTask[]> {
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new Error(
      `fetchAllTaskPages: pageSize must be a positive integer (got ${String(pageSize)})`,
    );
  }
  const all: HousingTask[] = [];
  let offset = 0;
  let batch: HousingTask[];
  do {
    batch = await taskRepository.findMany({
      ...base,
      limit: pageSize,
      offset,
    });
    all.push(...batch);
    offset += pageSize;
  } while (batch.length === pageSize);
  return all;
}
