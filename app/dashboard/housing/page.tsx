import HousingDashboardClient from "@/components/features/housing/HousingDashboardClient";

// ⚠️ FORCE DYNAMIC: This page MUST fetch fresh data on every request.
// This fixes the "Ghost Entry" bug where deleted tasks persist due to Next.js static caching.
export const dynamic = "force-dynamic";

import {
  fetchAllTasks,
  fetchAllMembers,
} from "@/lib/presentation/queries/housing.queries";

export default async function HousingPage() {
  // Parallel Prefetch using Service Role (Admin Client)
  // This allows us to resolve data instantly without waiting for client-side auth
  const [tasks, members] = await Promise.all([
    fetchAllTasks(),
    fetchAllMembers(),
  ]);

  return (
    <HousingDashboardClient
      initialTasks={tasks}
      initialMembers={members}
    />
  );
}
