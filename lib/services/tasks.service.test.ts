import { describe, it, expect, vi, beforeEach } from "vitest";
import { TasksService } from "./tasks.service";
import { HousingTask } from "@/lib/types/models";

const mocks = vi.hoisted(() => ({
  mockUpdateDocument: vi.fn(),
  mockCreateDocument: vi.fn(),
  mockListDocuments: vi.fn(),
  mockGetDocument: vi.fn(),
}));

vi.mock("node-appwrite", () => {
  return {
    Client: class {
      setEndpoint = vi.fn().mockReturnThis();
      setProject = vi.fn().mockReturnThis();
      setKey = vi.fn().mockReturnThis();
    },
    Databases: class {
      updateDocument = mocks.mockUpdateDocument;
      createDocument = mocks.mockCreateDocument;
      listDocuments = mocks.mockListDocuments;
      getDocument = mocks.mockGetDocument;
    },
    Query: {
      equal: vi.fn(),
      orderDesc: vi.fn(),
      lessThanEqual: vi.fn(),
    },
    ID: {
      unique: vi.fn().mockReturnValue("unique_id"),
    },
  };
});

// Mock Dynamic Service Imports
vi.mock("./user.service", () => ({
  UserService: {
    getByDiscordId: vi
      .fn()
      .mockResolvedValue({ discord_id: "u1", $id: "doc_1" }),
  },
}));

vi.mock("./notification.service", () => ({
  NotificationService: {
    notifyUser: vi.fn().mockResolvedValue(true),
    notifyChannel: vi.fn().mockResolvedValue(true),
  },
}));

describe("TasksService Recurrence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should calculate next instance correctly (On Time)", async () => {
    // Mock Schedule: 7 days
    mocks.mockGetDocument.mockResolvedValue({
      $id: "sched1",
      active: true,
      recurrence_rule: "7",
      title: "Clean",
      points_value: 10,
    });

    const now = new Date();
    const dueAt = new Date(now.getTime() - 1000 * 60 * 60); // Due 1 hour ago
    // Completed NOW.

    // ...

    await TasksService.triggerNextInstance("sched1", {
      $updatedAt: now.toISOString(),
      due_at: dueAt.toISOString(),
      assigned_to: "user1",
    } as unknown as HousingTask);

    // Current Due: T. Next Due: T+7.
    // Completed: T (+1hr).
    // Unlock: MAX(T+7 - 7, T(+1hr) + 3.5).
    // Unlock: MAX(T, T+3.5) -> T+3.5.
    // Expect Status: LOCKED.

    expect(mocks.mockCreateDocument).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        status: "locked",
      }),
    );
  });
});
