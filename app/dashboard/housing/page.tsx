import { Suspense } from "react";
import { createSessionClient } from "@/lib/presentation/server/appwrite";
import { getContainer } from "@/lib/infrastructure/container";
import { redirect } from "next/navigation";
import HousingDashboardClient from "@/components/features/housing/HousingDashboardClient";
import DashboardSkeleton from "@/components/features/housing/DashboardSkeleton";
import { Models } from "appwrite";

export default async function HousingPage() {
  // 1. Authenticate (Fast - Session Validation)
  let user: Models.User<Models.Preferences>;
  try {
    const { account } = await createSessionClient();
    user = await account.get();
  } catch (error) {
    redirect("/login");
  }

  // 2. Render Shell with Suspense
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <HousingContent user={user} />
    </Suspense>
  );
}

// 3. Data Fetching Component (Streams in)
async function HousingContent({
  user,
}: {
  user: Models.User<Models.Preferences>;
}) {
  const container = getContainer();

  // Fetch Profile (Required for "My Tasks" filtering)
  const profile = await container.userService.getByAuthId(user.$id);

  // Check if user is admin via labels
  const isAdmin = user.labels?.includes("admin") ?? false;

  // Fetch Data in Parallel
  const [tasks, members, schedules] = await Promise.all([
    container.queryService.getAllActiveTasks(),
    container.queryService.getMembers(),
    container.scheduleService.getSchedules(),
  ]);

  // Serialize for client
  const safeTasks = JSON.parse(JSON.stringify(tasks));
  const safeMembers = JSON.parse(JSON.stringify(members));
  const safeSchedules = JSON.parse(JSON.stringify(schedules));

  return (
    <HousingDashboardClient
      initialTasks={safeTasks}
      initialMembers={safeMembers}
      initialSchedules={safeSchedules}
      isAdmin={isAdmin}
      currentUser={user}
      currentProfile={profile}
    />
  );
}
