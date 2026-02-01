import { LedgerEntry } from "@/lib/domain/entities";

export interface PointsTransaction {
  amount: number;
  reason: string;
  category: "task" | "fine" | "event" | "manual";
}

export interface IPointsService {
  awardPoints(discordUserId: string, tx: PointsTransaction): Promise<boolean>;
  getHistory(userId: string): Promise<LedgerEntry[]>;
  getLeaderboard(limit?: number): Promise<
    {
      id: string;
      name: string;
      points: number;
      rank: number;
    }[]
  >;
}
