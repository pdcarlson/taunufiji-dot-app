"use server";

import { actionWrapper } from "@/lib/presentation/utils/action-handler";

export async function getMyTasksAction(jwt: string) {
  const result = await actionWrapper(
    async ({ container, userId }) => {
      // 3. Resolve Profile for Discord ID
      const profile = await container.authService.getProfile(userId);
      if (!profile) return { documents: [], total: 0 };

      // 4. Fetch Tasks
      const tasks = await container.dutyService.getMyTasks(profile.discord_id);

      // Serialization for Client
      return JSON.parse(JSON.stringify(tasks));
    },
    { jwt },
  );

  if (result.success && result.data) return result.data;
  return { documents: [], total: 0 };
}
