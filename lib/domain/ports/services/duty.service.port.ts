import { HousingTask } from "@/lib/domain/entities";

export interface IDutyService {
  claimTask(taskId: string, profileId: string): Promise<HousingTask>;
  submitProof(
    taskId: string,
    profileId: string,
    s3Key: string,
  ): Promise<HousingTask>;
  unclaimTask(taskId: string, profileId: string): Promise<HousingTask>;
  getMyTasks(
    userId: string,
  ): Promise<{ documents: HousingTask[]; total: number }>;
}
