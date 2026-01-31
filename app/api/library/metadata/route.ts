import { NextResponse } from "next/server";
import { AuthService } from "@/lib/application/services/auth.service";
import { LibraryService } from "@/lib/application/services/library.service";
import {
  createSessionClient,
  createJWTClient,
} from "@/lib/presentation/server/appwrite";
import { DB_ID, COLLECTIONS } from "@/lib/domain/entities/schema";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // 1. Authenticate & Authorize
    console.log("[API] Metadata: Checkpoint 1 - Start");

    let account: any;
    const authHeader = req.headers.get("Authorization");

    if (authHeader && authHeader.startsWith("Bearer ")) {
      console.log("[API] Metadata: Using JWT Client");
      const client = createJWTClient(authHeader.split(" ")[1]);
      account = client.account;
    } else {
      console.log("[API] Metadata: Using Session Client");
      const client = await createSessionClient();
      account = client.account;
    }

    console.log("[API] Metadata: Checkpoint 2 - Fetching User");
    const user = await account.get();

    if (!user) {
      console.log("[API] Metadata: No User Returned");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(
      `[API] Metadata: Checkpoint 3 - User ${user.$id} Found. Verifying Brother Status...`,
    );
    const isBrother = await AuthService.verifyBrother(user.$id);
    if (!isBrother) {
      console.log(`[API] Metadata: User ${user.$id} is not a brother.`);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log("[API] Metadata: Checkpoint 4 - Calling Service");

    // 2. Fetch Data using Service (Admin Privileges)
    const metadata = await LibraryService.getSearchMetadata();

    console.log("[API] Metadata: Checkpoint 5 - Success");
    return NextResponse.json(metadata);
  } catch (e: any) {
    console.error("Library Metadata Error:", e.message);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
