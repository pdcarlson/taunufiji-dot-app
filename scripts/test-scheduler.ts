import { calculateNextInstance } from "../lib/utils/scheduler";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

function testScheduler() {
  console.log("🧪 Testing Scheduler Logic...");

  const now = new Date();

  // Test 1: Legacy (7 Days)
  console.log("\n--- Test 1: Legacy Interval (7) ---");
  const resultLegacy = calculateNextInstance("7", now, 24);
  if (!resultLegacy) return assert(false, "Legacy result null");

  const diffDays =
    (resultLegacy.dueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  assert(Math.abs(diffDays - 7) < 0.01, "Legacy calculates 7 days ahead");

  // Test 2: RRule (Every Friday at 17:00)
  console.log("\n--- Test 2: RRule (Next Friday) ---");
  // FREQ=WEEKLY;BYDAY=FR;BYHOUR=17;BYMINUTE=0
  // We mock a date ensuring next Friday is calculable
  const mockNow = new Date("2025-01-01T23:59:00Z"); // Wed Jan 1st 2025. Next Friday is Jan 3rd.

  const rrule = "FREQ=WEEKLY;BYDAY=FR;BYHOUR=17;BYMINUTE=0";
  const resultRRule = calculateNextInstance(rrule, mockNow, 24);

  if (!resultRRule) return assert(false, "RRule result null");

  console.log(`Input: ${mockNow.toISOString()}`);
  console.log(`Due:   ${resultRRule.dueAt.toISOString()}`);

  // Check Day of Week (5 = Friday)
  assert(
    resultRRule.dueAt.getUTCDay() === 5 || resultRRule.dueAt.getDay() === 5,
    "Due date is a Friday",
  );
  // Timezone diffs might match local if rrule follows local, rrule usually implies local unless Z specified.
  // By default rrule uses local time if string doesn't specify.
  // let's just check it's AFTER mockNow.
  assert(
    resultRRule.dueAt.getTime() > mockNow.getTime(),
    "Due date is in future",
  );

  // Test 3: Lead Time
  console.log("\n--- Test 3: Lead Time (Unlock logic) ---");
  // Unlock should be Due - 24h
  const unlockDiff =
    (resultRRule.dueAt.getTime() - resultRRule.unlockAt.getTime()) /
    (1000 * 60 * 60);
  assert(Math.abs(unlockDiff - 24) < 0.01, "Unlock is exactly 24h before Due");

  // Test 4: Daily Recurrence
  console.log("\n--- Test 4: Daily Recurrence (Every Day at 09:00) ---");
  const rruleDaily = "FREQ=DAILY;BYHOUR=9;BYMINUTE=0";
  // Mock: Today at 08:00
  const mockMorning = new Date("2025-01-01T08:00:00Z");
  const resultDaily = calculateNextInstance(rruleDaily, mockMorning, 2);

  if (!resultDaily) return assert(false, "Daily result null");

  // Should be Today at 09:00 (since 08:00 is before 09:00)
  // Wait, rrule.after(dt) returns > dt.
  // If dt = 08:00, next is 09:00 same day.
  console.log(`Input: ${mockMorning.toISOString()}`);
  console.log(`Due:   ${resultDaily.dueAt.toISOString()}`);

  const diffHours =
    (resultDaily.dueAt.getTime() - mockMorning.getTime()) / (1000 * 60 * 60);
  assert(Math.abs(diffHours - 1) < 0.01, "Daily task is 1 hour later today");

  // Test 5: Monthly Recurrence
  console.log("\n--- Test 5: Monthly Recurrence (1st of Month) ---");
  const rruleMonthly = "FREQ=MONTHLY;BYMONTHDAY=1";
  // Mock: Jan 2nd
  const mockJan2 = new Date("2025-01-02T23:59:00Z");
  const resultMonthly = calculateNextInstance(rruleMonthly, mockJan2, 24);

  if (!resultMonthly) return assert(false, "Monthly result null");

  console.log(`Input: ${mockJan2.toISOString()}`);
  console.log(`Due:   ${resultMonthly.dueAt.toISOString()}`);

  // Should be Feb 1st
  assert(
    resultMonthly.dueAt.getUTCMonth() === 1,
    "Month is February (Index 1)",
  ); // 0=Jan, 1=Feb
  assert(resultMonthly.dueAt.getUTCDate() === 1, "Date is 1st");

  // Test 6: Invalid Rule Handling
  console.log("\n--- Test 6: Invalid Rule Graceful Failure ---");
  const resultInvalid = calculateNextInstance("BANANA=TRUE", now, 24);
  assert(resultInvalid === null, "Invalid rule returns null");

  console.log("\nTests Complete.");
}

testScheduler();
