
import { NextResponse } from "next/server";
import { AuthService } from "@/lib/application/services/auth.service";
import { LibraryService, LibrarySearchFilters } from "@/lib/application/services/library.service";
import { createSessionClient, createJWTClient } from "@/lib/presentation/server/appwrite";


import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // 1. Authenticate
    let user;

    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const { account } = createJWTClient(authHeader.split(' ')[1]);
        user = await account.get();
    } else {
        const { account } = await createSessionClient();
        user = await account.get();
    }

    if (!user) {
      logger.error("Library Search: No session user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.log(`Library Search: User ${user.$id} attempting search. Roles: ${user.labels}`);

    const isBrother = await AuthService.verifyBrother(user.$id);
    
    logger.log(`Library Search: verifyBrother result for ${user.$id}: ${isBrother}`);

    if (!isBrother) {
      logger.error(`Library Search: User ${user.$id} failed brother verification.`);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Parse Body
    const body = await req.json();
    const filters: LibrarySearchFilters = body.filters || {};

    // 3. Execute Search
    const result = await LibraryService.search(filters);
    
    return NextResponse.json(result);

  } catch (e: unknown) {
    const err = e as Error;
    console.error("Library Search Error:", err.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
