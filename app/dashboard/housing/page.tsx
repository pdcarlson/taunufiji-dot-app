import HousingDashboardClient from "@/components/features/housing/HousingDashboardClient";
import {
  fetchAllTasks,
  fetchAllMembers,
  fetchAllSchedules,
} from "@/lib/presentation/queries/housing.queries";

export default async function HousingPage() {
  // Parallel Prefetch using Service Role (Admin Client)
  // This allows us to resolve data instantly without waiting for client-side auth
  const [tasks, members, schedules] = await Promise.all([
    fetchAllTasks(),
    fetchAllMembers(),
    fetchAllSchedules(),
  ]);

  return (
    <HousingDashboardClient
      initialTasks={tasks}
      initialMembers={members}
      initialSchedules={schedules}
    />
  );
}
