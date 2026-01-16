
import { NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth.service";
import { createSessionClient, createJWTClient } from "@/lib/server/appwrite";
import { DB_ID, COLLECTIONS } from "@/lib/types/schema";
import { Query } from "node-appwrite";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // 1. Authenticate
    let account: any, databases: any;
    const authHeader = req.headers.get('Authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const client = createJWTClient(authHeader.split(' ')[1]);
        account = client.account;
        databases = client.databases;
    } else {
        const client = await createSessionClient();
        account = client.account;
        databases = client.databases;
    }

    const user = await account.get();
    
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isBrother = await AuthService.verifyBrother(user.$id);
    if (!isBrother) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // 2. Fetch Data
    // We need unique professors and courses. 
    // Ideally these are separate collections (which they are!).
    
    const [profDocs, courseDocs] = await Promise.all([
        databases.listDocuments(DB_ID, COLLECTIONS.PROFESSORS, [Query.limit(100), Query.orderAsc("name")]),
        databases.listDocuments(DB_ID, COLLECTIONS.COURSES, [Query.limit(100), Query.orderAsc("department"), Query.orderAsc("course_number")])
    ]);

    // 3. Format for Frontend
    const professors = profDocs.documents.map((p: any) => p.name);
    
    // Format: { "CSCI": [{ number: "1200", name: "Data Structures" }] }
    const courses: Record<string, { number: string; name: string }[]> = {};
    
    courseDocs.documents.forEach((c: any) => {
        if (!courses[c.department]) {
            courses[c.department] = [];
        }
        courses[c.department].push({ number: c.course_number, name: c.course_name });
    });

    return NextResponse.json({ professors, courses });

  } catch (e: any) {
    console.error("Library Metadata Error:", e.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
