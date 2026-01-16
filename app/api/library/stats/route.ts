
import { NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth.service";
import { LibraryService } from "@/lib/services/library.service";
import { createSessionClient, createJWTClient } from "@/lib/server/appwrite";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // 1. Authenticate
    let account: any;
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const client = createJWTClient(authHeader.split(' ')[1]);
        account = client.account;
    } else {
        const client = await createSessionClient();
        account = client.account;
    }

    const user = await account.get();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 2. Verify Access
    const isBrother = await AuthService.verifyBrother(user.$id);
    if (!isBrother) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // 3. Get Stats (using Discord ID)
    const profile = await AuthService.getProfile(user.$id);
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const stats = await LibraryService.getStats(profile.$id);
    
    return NextResponse.json(stats);

  } catch (e: any) {
    console.error("Library Stats Error:", e.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
