import DashboardView from "@/components/features/dashboard/DashboardView";
import { fetchLeaderboard } from "@/lib/presentation/queries/dashboard.queries";

export default async function DashboardPage() {
  const leaderboard = await fetchLeaderboard();

  return <DashboardView initialLeaderboard={leaderboard} />;
}
