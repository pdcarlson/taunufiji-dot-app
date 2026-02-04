import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import TaskCard from "./TaskCard";
import { HousingTask } from "@/lib/domain/entities";

// Mock dependencies
vi.mock("@/hooks/useJWT", () => ({
  useJWT: () => ({
    getJWT: vi.fn().mockResolvedValue("mock_jwt"),
  }),
}));

vi.mock("@/lib/presentation/actions/housing/duty.actions", () => ({
  claimTaskAction: vi.fn(),
  unclaimTaskAction: vi.fn(),
  submitProofAction: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock getJWT function for props
const mockGetJWT = vi.fn().mockResolvedValue("mock_jwt");

describe("TaskCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a Bounty correctly", () => {
    const task: HousingTask = {
      id: "t1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      title: "Fix Door",
      description: "The handle is broken",
      type: "bounty",
      status: "open",
      points_value: 100,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    };

    render(
      <TaskCard
        task={task}
        userId="u1"
        userName="Tester"
        isAdmin={false}
        getJWT={mockGetJWT}
      />,
    );

    expect(screen.getByText("Fix Door")).toBeDefined();
    expect(screen.getByText("Bounty")).toBeDefined();
    expect(screen.getByText("100 PTS")).toBeDefined();
  });

  it("renders a Locked Recurring Duty", () => {
    const task: HousingTask = {
      id: "t2",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      title: "Weekly Clean",
      description: "Clean the common areas",
      type: "duty",
      status: "locked",
      points_value: 0,
      unlock_at: new Date(Date.now() + 86400000).toISOString(), // Future
    };

    render(
      <TaskCard
        task={task}
        userId="u1"
        userName="Tester"
        isAdmin={false}
        getJWT={mockGetJWT}
      />,
    );

    expect(screen.getByText("Weekly Clean")).toBeDefined();
    expect(screen.getByText(/Opens:/)).toBeDefined();
    // We look for partial match because TimeDisplay renders dynamic text.
  });

  it("renders an Active Duty for Me", () => {
    const task: HousingTask = {
      id: "t3",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      title: "Trash",
      description: "Take out the trash",
      type: "duty",
      status: "open",
      points_value: 0,
      assigned_to: "p1", // Assigned to me
      due_at: new Date(Date.now() + 86400000).toISOString(),
    };

    render(
      <TaskCard
        task={task}
        userId="p1"
        profileId="p1"
        userName="Tester"
        isAdmin={false}
        getJWT={mockGetJWT}
      />,
    );

    expect(screen.getByText("Trash")).toBeDefined();
    // "Sign Up" is gone. Now we upload proof if assigned.
    expect(screen.getByText("Upload Proof")).toBeDefined();
  });
});
