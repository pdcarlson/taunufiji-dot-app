import { PointsService } from "./points.service";
import { MockFactory } from "@/lib/test/mock-factory";
import { Member } from "@/lib/domain/entities";
import { missedDutyFineReason } from "@/lib/application/services/housing/missed-duty-fine";

// Mock Logger
vi.mock("@/lib/utils/logger", () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
  },
}));

describe("PointsService", () => {
  const mockUserRepo = MockFactory.createUserRepository();
  const mockLedgerRepo = MockFactory.createLedgerRepository();
  let service: PointsService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Instantiating without Redis for unit tests
    service = new PointsService(mockUserRepo, mockLedgerRepo);
  });

  describe("awardPoints", () => {
    it("should award points and create ledger entry", async () => {
      // 1. Setup User
      const mockUser = {
        $id: "user_doc_1",
        id: "user_doc_1",
        details_points_current: 50,
      } as unknown as Member;

      mockUserRepo.findByDiscordId = vi.fn().mockResolvedValue(mockUser);
      mockUserRepo.updatePoints = vi.fn().mockResolvedValue(true);
      mockLedgerRepo.create = vi.fn().mockResolvedValue({} as any);

      // 2. Execute
      await service.awardPoints("discord_123", {
        amount: 10,
        reason: "Test Award",
        category: "task",
      });

      // 3. Verify
      expect(mockUserRepo.findByDiscordId).toHaveBeenCalledWith("discord_123");
      expect(mockUserRepo.updatePoints).toHaveBeenCalledWith("user_doc_1", 10);
      expect(mockLedgerRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "discord_123",
          amount: 10,
          reason: "Test Award",
          category: "task",
          is_debit: false,
        }),
      );
    });

    it("should handle deductions (negative amount)", async () => {
      const mockUser = { $id: "u1", id: "u1" } as unknown as Member;
      mockUserRepo.findByDiscordId = vi.fn().mockResolvedValue(mockUser);

      await service.awardPoints("discord_123", {
        amount: -5,
        reason: "Fine",
        category: "fine",
      });

      expect(mockUserRepo.updatePoints).toHaveBeenCalledWith("u1", -5);
      expect(mockLedgerRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5, // Stored as positive
          category: "fine",
          is_debit: true, // Flagged as debit
        }),
      );
    });

    it("should throw if user not found", async () => {
      mockUserRepo.findByDiscordId = vi.fn().mockResolvedValue(null);

      await expect(
        service.awardPoints("unknown", {
          amount: 10,
          reason: "",
          category: "manual",
        }),
      ).rejects.toThrow("not found");
    });

    it("no-ops duplicate missed-duty fine when fineTaskId already in ledger", async () => {
      const mockUser = { $id: "u1", id: "u1" } as unknown as Member;
      mockUserRepo.findByDiscordId = vi.fn().mockResolvedValue(mockUser);
      mockLedgerRepo.findMany = vi.fn().mockResolvedValue([
        {
          id: "led-1",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          amount: 5,
          reason: missedDutyFineReason("Kitchen", "task-x"),
          category: "fine",
          timestamp: new Date().toISOString(),
          user_id: "discord_123",
          is_debit: true,
        },
      ]);

      await service.awardPoints("discord_123", {
        amount: -5,
        reason: missedDutyFineReason("Kitchen", "task-x"),
        category: "fine",
        fineTaskId: "task-x",
      });

      expect(mockUserRepo.updatePoints).not.toHaveBeenCalled();
      expect(mockLedgerRepo.create).not.toHaveBeenCalled();
    });
  });
});
