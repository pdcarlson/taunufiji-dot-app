import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import TaskCard from "./TaskCard";
import { HousingTask } from "@/lib/domain/entities";

// Mock dependencies
vi.mock("@/lib/infrastructure/persistence/appwrite.web", () => ({
  account: {
    createJWT: vi.fn().mockResolvedValue({ jwt: "mock_jwt" }),
  },
}));

vi.mock("@/lib/presentation/actions/housing.actions", () => ({
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

// Mock Lucide Icons (Optional, but good practice if they crash Jest/Vitest)
// Usually Lucide React works fine in Jest environment.

describe("TaskCard", () => {
  const mockUser = { $id: "u1", name: "Tester" };

  it("renders a Bounty correctly", () => {
    const task = {
      $id: "t1",
      title: "Fix Door",
      description: "The handle is broken",
      type: "bounty",
      status: "open",
      points_value: 100,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    } as unknown as HousingTask;

    render(
      <TaskCard
        task={task}
        userId="u1"
        userName="Tester"
        isAdmin={false}
        onRefresh={vi.fn()}
      />,
    );

    expect(screen.getByText("Fix Door")).toBeDefined();
    expect(screen.getByText("Bounty")).toBeDefined();
    expect(screen.getByText("100 PTS")).toBeDefined();
  });

  it("renders a Locked Recurring Duty", () => {
    const task = {
      $id: "t2",
      title: "Weekly Clean",
      type: "duty",
      status: "locked",
      unlock_at: new Date(Date.now() + 86400000).toISOString(), // Future
    } as unknown as HousingTask;

    render(
      <TaskCard
        task={task}
        userId="u1"
        userName="Tester"
        isAdmin={false}
        onRefresh={vi.fn()}
      />,
    );

    expect(screen.getByText("Weekly Clean")).toBeDefined();
    expect(screen.getByText(/Opens:/)).toBeDefined();
    // We look for partial match because TimeDisplay renders dynamic text.
  });

  it("renders an Active Duty for Me", () => {
    const task = {
      $id: "t3",
      title: "Trash",
      type: "duty",
      status: "open",
      assigned_to: "p1", // Assigned to me
      due_at: new Date(Date.now() + 86400000).toISOString(),
    } as unknown as HousingTask;

    render(
      <TaskCard
        task={task}
        userId="u1"
        profileId="p1"
        userName="Tester"
        isAdmin={false}
        onRefresh={vi.fn()}
      />,
    );

    expect(screen.getByText("Trash")).toBeDefined();
    // "Sign Up" is gone. Now we upload proof if assigned.
    expect(screen.getByText("Upload Proof")).toBeDefined();
  });
});
