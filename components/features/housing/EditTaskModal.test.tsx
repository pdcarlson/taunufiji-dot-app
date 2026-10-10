import { render, screen } from "@testing-library/react";
import { EditTaskModal } from "./EditTaskModal";
import type { HousingTask } from "@/lib/domain/entities";
import { easternDateInputToIso } from "@/lib/utils/eastern-time";

vi.mock("@/hooks/useJWT", () => ({
  useJWT: () => ({ getJWT: vi.fn().mockResolvedValue("mock_jwt") }),
}));

vi.mock("@/lib/presentation/actions/housing/schedule.actions", () => ({
  getScheduleAction: vi.fn(),
}));

vi.mock("@/lib/presentation/actions/housing/admin.actions", () => ({
  updateTaskAction: vi.fn(),
  deleteTaskAction: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

function oneOffTask(): HousingTask {
  return {
    id: "task-1",
    createdAt: "2026-10-08T01:17:00.000Z",
    updatedAt: "2026-10-08T01:17:00.000Z",
    title: "Clean library",
    description: "Sweep.",
    points_value: 0,
    assigned_to: "user-a",
    due_at: easternDateInputToIso("2026-10-12"),
    unlock_at: null,
    status: "open",
    notification_level: "unlocked",
    type: "one_off",
    schedule_id: null,
    initial_image_s3_key: null,
    proof_s3_key: null,
    expires_at: null,
    is_fine: null,
    execution_limit: null,
    completed_at: null,
  } as HousingTask;
}

describe("EditTaskModal due time label", () => {
  it("labels the due date with the time it is actually saved at, not noon", () => {
    render(
      <EditTaskModal
        task={oneOffTask()}
        members={[]}
        onClose={vi.fn()}
        onRefresh={vi.fn()}
        onSuccessClose={vi.fn()}
      />,
    );

    expect(screen.getByText("11:59 PM ET")).toBeInTheDocument();
    expect(screen.queryByText("12:00 PM")).not.toBeInTheDocument();
  });
});
