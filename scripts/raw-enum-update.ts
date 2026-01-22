import { config } from "dotenv";

config({ path: ".env.local" });

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const API_KEY = process.env.APPWRITE_API_KEY!;
const DB_ID = "v2_internal_ops";
const COLLECTION_ID = "assignments";
const ATTR_KEY = "status";

async function main() {
  console.log("🛠️ Starting NATIVE FETCH Enum Update...");

  const elements = [
    "open",
    "pending",
    "approved",
    "rejected",
    "claimed",
    "pending_review",
    "locked",
    "expired",
  ];

  const url = `${ENDPOINT}/databases/${DB_ID}/collections/${COLLECTION_ID}/attributes/enum/${ATTR_KEY}`;

  const payload = {
    elements: elements,
    required: false,
    default: "open",
  };

  try {
    console.log(`FETCH PATCH ${url}`);

    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Appwrite-Project": PROJECT_ID,
        "X-Appwrite-Key": API_KEY,
        "X-Appwrite-Response-Format": "1.0.0", // Ensure JSON error responses
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(JSON.stringify(data, null, 2));
    }

    console.log("✅ FETCH Update Success:", JSON.stringify(data, null, 2));
  } catch (e: any) {
    console.error("❌ FETCH Failed:", e.message);

    // Fallback: Try xdefault if the first one complains about it
    if (e.message.includes("xdefault")) {
      console.log("🔄 Retrying with 'xdefault'...");
      try {
        const payloadX = { ...payload, xdefault: "open" };
        delete (payloadX as any).default;

        const res2 = await fetch(url, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-Appwrite-Project": PROJECT_ID,
            "X-Appwrite-Key": API_KEY,
          },
          body: JSON.stringify(payloadX),
        });
        const data2 = await res2.json();
        if (!res2.ok) throw new Error(JSON.stringify(data2));
        console.log("✅ FETCH (xdefault) Success:", data2);
      } catch (ex: any) {
        console.error("❌ Retry Failed:", ex.message);
      }
    }
  }
}

main();
