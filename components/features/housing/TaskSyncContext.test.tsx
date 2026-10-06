import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { HousingTask } from "@/lib/domain/entities";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

import {
  TaskSyncProvider,
  applyTaskChange,
  useTaskChanged,
} from "./TaskSyncContext";

const task = (id: string, extra: Partial<HousingTask> = {}) =>
  ({ id, status: "open", ...extra }) as HousingTask;

describe("applyTaskChange", () => {
  it("replaces the changed task in place", () => {
    const list = [task("a"), task("b"), task("c")];
    const updated = task("b", { status: "pending" });

    expect(applyTaskChange(list, "b", updated)).toEqual([
      list[0],
      updated,
      list[2],
    ]);
  });

  it("drops the task when it no longer belongs in the list", () => {
    const list = [task("a", { assigned_to: "me" })];
    const unclaimed = task("a", { assigned_to: null });

    expect(
      applyTaskChange(list, "a", unclaimed, (t) => !!t.assigned_to),
    ).toEqual([]);
  });

  it("leaves the list alone when there is no replacement row", () => {
    const list = [task("a")];
    expect(applyTaskChange(list, "a", null)).toBe(list);
  });
});

describe("useTaskChanged", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls the provider's handler", () => {
    const handler = vi.fn();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <TaskSyncProvider onTaskChanged={handler}>{children}</TaskSyncProvider>
    );
    const { result } = renderHook(() => useTaskChanged(), { wrapper });

    result.current("a", task("a"));

    expect(handler).toHaveBeenCalledWith("a", task("a"));
    expect(refresh).not.toHaveBeenCalled();
  });

  it("falls back to a router refresh without a provider", () => {
    const { result } = renderHook(() => useTaskChanged());

    result.current("a", null);

    expect(refresh).toHaveBeenCalled();
  });
});
