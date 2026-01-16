import { NextResponse } from "next/server";
import { TasksService } from "@/lib/services/tasks.service";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        // Optional: Check CRON_SECRET header if configured
        const result = await TasksService.runCron();
        return NextResponse.json({ success: true, result });
    } catch (e: any) {
        console.error("Housing Cron Failed", e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
