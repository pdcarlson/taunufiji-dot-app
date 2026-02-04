"use server";

import { actionWrapper } from "@/lib/presentation/utils/action-handler";

export async function claimTaskAction(
  taskId: string,
  _unsafeUserId: string,
  jwt: string,
) {
  return await actionWrapper(
    async ({ container, userId }) => {
      // 3. Resolve Profile
      const profile = await container.authService.getProfile(userId);
      if (!profile) throw new Error("Profile not found");

      // 4. Exec
      return await container.dutyService.claimTask(taskId, profile.discord_id);
    },
    { jwt },
  );
}

export async function unclaimTaskAction(taskId: string, jwt: string) {
  return await actionWrapper(
    async ({ container, userId }) => {
      const profile = await container.authService.getProfile(userId);
      if (!profile) throw new Error("Profile not found");

      return await container.dutyService.unclaimTask(
        taskId,
        profile.discord_id,
      );
    },
    { jwt },
  );
}

export async function submitProofAction(formData: FormData, jwt: string) {
  return await actionWrapper(
    async ({ container, userId }) => {
      const taskId = formData.get("taskId") as string;
      const file = formData.get("file") as File;

      if (!taskId || !file) throw new Error("Missing data");

      const profile = await container.authService.getProfile(userId);
      if (!profile) throw new Error("Profile not found");

      // Upload
      const buffer = Buffer.from(await file.arrayBuffer());
      const key = `proofs/${taskId}_${file.name}`;
      await container.storageService.uploadFile(buffer, key, file.type);

      // Submit
      return await container.dutyService.submitProof(
        taskId,
        profile.discord_id,
        key,
      );
    },
    { jwt },
  );
}
