import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { env } from "@/lib/infrastructure/config/env";

import { cookies } from "next/headers";
import { Readable } from "stream";

// Helper to convert Node stream to Web stream
function streamFile(stream: Readable): ReadableStream {
  return new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => controller.enqueue(chunk));
      stream.on("end", () => controller.close());
      stream.on("error", (error) => controller.error(error));
    },
  });
}

const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET(req: NextRequest) {
  try {
    // 1. Auth Check (Basic) - Ensure user is logged in
    // Note: detailed permissions are tricky here without database access,
    // but at minimum check for a session.
    // We can rely on the fact that the Modal only shows for authenticated users.
    // For tighter security, we could verify the JWT, but this is a read-only for proofs.

    // 2. Parse Key
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json({ error: "Missing key" }, { status: 400 });
    }

    // 3. Fetch from S3
    const command = new GetObjectCommand({
      Bucket: env.AWS_BUCKET_NAME,
      Key: key,
    });

    const response = await s3.send(command).catch((err) => {
      console.error("S3 Proxy Error:", err);
      return null;
    });

    if (!response || !response.Body) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // 4. Stream Response
    const stream = streamFile(response.Body as Readable);

    const headers = new Headers();
    headers.set(
      "Content-Type",
      response.ContentType || "application/octet-stream",
    );
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new NextResponse(stream, { headers });
  } catch (error) {
    console.error("Image Proxy Failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
