import { describe, expect, it } from "vitest";
import { HousingTask } from "@/lib/domain/entities";
import { shouldSendMissedTaskNotification } from "./housing-expired-notification-eligibility";

const base: HousingTask = {
  id: "t1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  title: "Duty",
  description: "",
  status: "expired",
  type: "duty",
  points_value: 0,
  proof_s3_key: null,
};

describe("shouldSendMissedTaskNotification", () => {
  it("is false when not expired", () => {
    expect(
      shouldSendMissedTaskNotification({
        ...base,
        status: "pending",
        proof_s3_key: null,
      }),
    ).toBe(false);
  });

  it("is false when expired but proof exists (stale miss path)", () => {
    expect(
      shouldSendMissedTaskNotification({
        ...base,
        proof_s3_key: "proof-key",
      }),
    ).toBe(false);
  });

  it("is true when expired with no proof", () => {
    expect(
      shouldSendMissedTaskNotification({
        ...base,
        proof_s3_key: null,
      }),
    ).toBe(true);
  });
});
