import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// Mock missing env vars to bypass strict validation in lib/config/env.ts
process.env.AWS_REGION = process.env.AWS_REGION || "us-east-1";
process.env.AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME || "mock-bucket";
process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "mock-project";

// Mock Data
const MOCK_USER_ID = "750151182395244584"; // Replace with your Discord ID
const MOCK_ROLES = ["750151182395244584", "1148288953745686538"]; // Brother + Cabinet (Admin)

async function simulate(commandName: string, options: any[] = []) {
  // Dynamic Import to ensure Env Vars are set BEFORE lib/config/env.ts runs
  const { dispatchCommand } = await import("@/lib/infrastructure/discord/registry");
  const { InteractionType } = await import("@/lib/infrastructure/discord/types");

  console.log(`\n🤖 Simulating: /${commandName}`, options);

  const interaction: any = {
    id: "mock_interaction_id",
    application_id: "mock_app_id",
    type: InteractionType.APPLICATION_COMMAND,
    token: "mock_token",
    data: {
      id: "mock_command_id",
      name: commandName,
      type: 1,
      options: options,
    },
    member: {
      user: {
        id: MOCK_USER_ID,
        username: "developer",
        discriminator: "0000",
      },
      roles: MOCK_ROLES,
      joined_at: new Date().toISOString(),
    },
    version: 1,
  };

  const response = await dispatchCommand(interaction);
  console.log("📨 Response:", JSON.stringify(response, null, 2));
}

// Scenarios to Test
async function run() {
  await simulate("ping");
  await simulate("profile");
  await simulate("bounties");
}

run();
