import DashboardWidgets from "./_components/DashboardWidgets";
import { fetchLeaderboard } from "@/lib/presentation/queries/dashboard.queries";

export default async function DashboardPage() {
  const leaderboard = await fetchLeaderboard();

  return <DashboardWidgets initialLeaderboard={leaderboard} />;
}
