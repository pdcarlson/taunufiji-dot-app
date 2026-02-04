"use server";

import { actionWrapper } from "@/lib/presentation/utils/action-handler";

export async function getAllActiveTasksAction(jwt: string) {
  const result = await actionWrapper(
    async ({ container }) => {
      return await container.queryService.getAllActiveTasks();
    },
    { jwt },
  );

  if (result.success && result.data)
    return JSON.parse(JSON.stringify(result.data));
  return [];
}

export async function getAllMembersAction(jwt: string) {
  const result = await actionWrapper(
    async ({ container }) => {
      return await container.queryService.getMembers();
    },
    { jwt },
  );

  if (result.success && result.data)
    return JSON.parse(JSON.stringify(result.data));
  return [];
}

export async function getReviewDetailsAction(taskId: string, jwt: string) {
  return await actionWrapper(
    async ({ container }) => {
      // Fetch Task
      const task = await container.queryService.getTask(taskId);
      if (!task) throw new Error("Task not found");

      let submitterName = "Unknown";
      let proofUrl = "";

      // Resolve Submitter
      if (task.assigned_to) {
        const submitter = await container.queryService.getUserProfile(
          task.assigned_to,
        );
        if (submitter) {
          submitterName = submitter.full_name || submitter.discord_handle;
        }
      }

      // Resolve Proof URL (S3 Signed URL)
      if (task.proof_s3_key) {
        proofUrl = await container.storageService.getReadUrl(task.proof_s3_key);
      }

      return {
        submitterName,
        proofUrl,
      };
    },
    { jwt },
  );
}
