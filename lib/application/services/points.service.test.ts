import { describe, it, expect, vi, beforeEach } from "vitest";
import { PointsService } from "./points.service";
import { MockFactory } from "@/lib/test/mock-factory";
import { setContainer, resetContainer } from "@/lib/infrastructure/container";
import { Member } from "@/lib/domain/entities";

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

  beforeEach(() => {
    vi.clearAllMocks();
    resetContainer();
    setContainer({
      userRepository: mockUserRepo,
      ledgerRepository: mockLedgerRepo,
    });
  });

  describe("awardPoints", () => {
    it("should award points and create ledger entry", async () => {
      // 1. Setup User
      const mockUser = {
        $id: "user_doc_1",
        details_points_current: 50,
      } as Member;

      mockUserRepo.findByDiscordId = vi.fn().mockResolvedValue(mockUser);
      mockUserRepo.updatePoints = vi.fn().mockResolvedValue(true);
      mockLedgerRepo.create = vi.fn().mockResolvedValue({} as any);

      // 2. Execute
      await PointsService.awardPoints("discord_123", {
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
          is_debit: false,
        }),
      );
    });

    it("should handle deductions (negative amount)", async () => {
      const mockUser = { $id: "u1" } as Member;
      mockUserRepo.findByDiscordId = vi.fn().mockResolvedValue(mockUser);

      await PointsService.awardPoints("discord_123", {
        amount: -5,
        reason: "Fine",
        category: "fine",
      });

      expect(mockUserRepo.updatePoints).toHaveBeenCalledWith("u1", -5);
      expect(mockLedgerRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5, // Stored as positive
          is_debit: true, // Flagged as debit
        }),
      );
    });

    it("should throw if user not found", async () => {
      mockUserRepo.findByDiscordId = vi.fn().mockResolvedValue(null);

      await expect(
        PointsService.awardPoints("unknown", {
          amount: 10,
          reason: "",
          category: "manual",
        }),
      ).rejects.toThrow("not found");
    });
  });
});
