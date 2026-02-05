import { calculateNextInstance } from "@/lib/utils/scheduler";

/* 
  REPRODUCTION SCRIPT
  Run this with: `npx tsx scripts/debug-scheduler.ts`
*/

const TEST_CASES = [
  {
    name: "Legacy Weekly (7 days)",
    rule: "7",
    lastCompleted: new Date("2026-02-01T12:00:00Z"), // The date user mentioned
    leadTime: 24,
  },
  {
    name: "RRule Weekly (Every Friday)",
    rule: "FREQ=WEEKLY;BYDAY=FR",
    lastCompleted: new Date("2026-02-01T12:00:00Z"), // Feb 1 is a Sunday
    leadTime: 24,
  },
  {
    name: "RRule Monthly (1st of Month)",
    rule: "FREQ=MONTHLY;BYMONTHDAY=1",
    lastCompleted: new Date("2026-02-01T12:00:00Z"),
    leadTime: 24,
  },
];

console.log("🔍 Running Scheduler Diagnostics...");

TEST_CASES.forEach(({ name, rule, lastCompleted, leadTime }) => {
  console.log(`\n--- Testing: ${name} ---`);
  console.log(`Input Rule: "${rule}"`);
  console.log(`Base Date: ${lastCompleted.toISOString()}`);

  try {
    const result = calculateNextInstance(rule, lastCompleted, leadTime);
    if (!result) {
      console.error(`❌ FAILED: returned null`);
    } else {
      console.log(`✅ Success:`);
      console.log(`   Due At:    ${result.dueAt.toISOString()}`);
      console.log(`   Unlock At: ${result.unlockAt.toISOString()}`);

      const diffDays =
        (result.dueAt.getTime() - lastCompleted.getTime()) /
        (1000 * 60 * 60 * 24);
      console.log(`   Delta:     ${diffDays.toFixed(2)} days`);
    }
  } catch (e) {
    console.error(`🚨 EXCEPTION:`, e);
  }
});
