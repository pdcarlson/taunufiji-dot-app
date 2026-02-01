import { NextResponse } from "next/server";
import { getContainer } from "@/lib/infrastructure/container";
import {
  createSessionClient,
  createJWTClient,
} from "@/lib/presentation/server/appwrite";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // 1. Authenticate
    let account;
    const authHeader = req.headers.get("Authorization");

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const client = createJWTClient(authHeader.split(" ")[1]);
      account = client.account;
    } else {
      const client = await createSessionClient();
      account = client.account;
    }

    const user = await account.get();

    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { authService, libraryService } = getContainer();

    const isBrother = await authService.verifyBrother(user.$id);
    if (!isBrother)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // 2. Parse Params
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("id");

    if (!documentId)
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    // 3. Get Link
    const link = await libraryService.getDownloadLink(documentId);

    return NextResponse.json(link);
  } catch (e: any) {
    console.error("Library Download Error:", e.message);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
