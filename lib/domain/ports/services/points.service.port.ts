import { LedgerEntry } from "@/lib/domain/entities";

export interface PointsTransaction {
  amount: number;
  reason: string;
  category: "task" | "fine" | "event" | "manual";
  /**
   * When set with `category: "fine"`, `awardPoints` no-ops if a ledger row for this
   * user/category already carries the same missed-duty marker (see housing fine flow).
   */
  fineTaskId?: string;
}

export interface IPointsService {
  awardPoints(discordUserId: string, tx: PointsTransaction): Promise<boolean>;
  getHistory(
    userId: string,
    category?: string | string[],
  ): Promise<LedgerEntry[]>;
  getLeaderboard(limit?: number): Promise<
    {
      id: string;
      name: string;
      points: number;
      rank: number;
    }[]
  >;
  getUserRank(userId: string): Promise<{ rank: number; points: number } | null>;
}
