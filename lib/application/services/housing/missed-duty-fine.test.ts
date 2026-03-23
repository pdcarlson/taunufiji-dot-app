import { describe, expect, it } from "vitest";
import {
  missedDutyFineReason,
  missedDutyFineReasonContainsTaskId,
} from "./missed-duty-fine";

describe("missedDutyFineReasonContainsTaskId", () => {
  it("matches only when the task marker is the trailing suffix", () => {
    const id = "abc";
    expect(
      missedDutyFineReasonContainsTaskId(missedDutyFineReason("T", id), id),
    ).toBe(true);
    expect(
      missedDutyFineReasonContainsTaskId(
        `Missed Duty: [task:${id}] oops [task:other]`,
        id,
      ),
    ).toBe(false);
    expect(
      missedDutyFineReasonContainsTaskId(
        `Something [task:${id}] not at end`,
        id,
      ),
    ).toBe(false);
  });
});
