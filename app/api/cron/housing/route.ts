import { CronService } from "@/lib/application/services/jobs/cron.service";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // Optional: Check CRON_SECRET header if configured
    const result = await CronService.runHourly();
    console.log("Housing Cron Result:", JSON.stringify(result));
    return NextResponse.json({ success: true, result });
  } catch (e: unknown) {
    console.error("Housing Cron Failed", e);
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
