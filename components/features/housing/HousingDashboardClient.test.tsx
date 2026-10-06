import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { HousingTask, Member } from "@/lib/domain/entities";

const hoisted = vi.hoisted(() => ({
  claimTaskAction: vi.fn(),
  getAllActiveTasksAction: vi.fn(),
  getAllMembersAction: vi.fn(),
}));

vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: () => ({
    user: { $id: "auth_1", name: "Brother" },
    getToken: vi.fn().mockResolvedValue("jwt"),
    isHousingAdmin: false,
  }),
}));

vi.mock("@/lib/presentation/actions/housing/duty.actions", () => ({
  claimTaskAction: hoisted.claimTaskAction,
  unclaimTaskAction: vi.fn(),
  submitProofAction: vi.fn(),
}));

vi.mock("@/lib/presentation/actions/housing/query.actions", () => ({
  getAllActiveTasksAction: hoisted.getAllActiveTasksAction,
  getAllMembersAction: hoisted.getAllMembersAction,
}));

vi.mock("./DutyRoster", () => ({ DutyRoster: () => null }));
vi.mock("./ProofReviewModal", () => ({ default: () => null }));
vi.mock("./EditTaskModal", () => ({ EditTaskModal: () => null }));
vi.mock("./CreateBountyModal", () => ({ default: () => null }));
vi.mock("./CreateScheduleModal", () => ({ default: () => null }));
vi.mock("./CreateOneOffModal", () => ({ default: () => null }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

import { HousingDashboardClient } from "./HousingDashboardClient";

const now = new Date().toISOString();
const bounty: HousingTask = {
  id: "b1",
  createdAt: now,
  updatedAt: now,
  title: "Mow the lawn",
  description: "Front yard",
  type: "bounty",
  status: "open",
  points_value: 20,
};
const member = { discord_id: "discord_1", auth_id: "auth_1" } as Member;

describe("HousingDashboardClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Background reconcile returns nothing new, so the UI must update from the claim result alone.
    hoisted.getAllActiveTasksAction.mockResolvedValue(null);
    hoisted.getAllMembersAction.mockResolvedValue(null);
  });

  it("moves a claimed bounty into My Duties without a page reload", async () => {
    hoisted.claimTaskAction.mockResolvedValue({
      success: true,
      data: { ...bounty, status: "pending", assigned_to: "discord_1" },
    });

    render(
      <HousingDashboardClient initialTasks={[bounty]} initialMembers={[member]} />,
    );

    const bounties = screen
      .getByRole("heading", { name: "Available Bounties" })
      .closest("section") as HTMLElement;
    fireEvent.click(within(bounties).getByRole("button", { name: /claim/i }));

    await waitFor(() =>
      expect(within(bounties).getByText("No active bounties")).toBeInTheDocument(),
    );
    expect(screen.queryByText("No active duties assigned.")).not.toBeInTheDocument();
    expect(screen.getByText("Mow the lawn")).toBeInTheDocument();
    expect(await screen.findByText(/upload proof/i)).toBeInTheDocument();
  });
});
