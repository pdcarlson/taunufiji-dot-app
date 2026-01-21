import { NextResponse } from "next/server";
import {
  verifyInteractionSignature,
  createResponse,
} from "@/lib/discord/utils";
import { dispatchCommand } from "@/lib/discord/registry";
import { InteractionType, InteractionResponseType } from "@/lib/discord/types";

export const maxDuration = 60; // Allow longer execution if needed (vercel)

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();

    // 1. Verify Signature
    if (!verifyInteractionSignature(req, bodyText)) {
      return NextResponse.json(
        { error: "Invalid request signature" },
        { status: 401 },
      );
    }

    const interaction = JSON.parse(bodyText);

    // 2. Handle PING
    if (interaction.type === InteractionType.PING) {
      return NextResponse.json({ type: InteractionResponseType.PONG });
    }

    // 3. Handle Application Commands
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      const response = await dispatchCommand(interaction);
      return NextResponse.json(response);
    }

    // 4. Handle Unknown Type
    return NextResponse.json(
      { error: "Unknown Interaction Type" },
      { status: 400 },
    );
  } catch (e) {
    console.error("Interaction Error", e);
    // Return Generic Error Response handled by Discord
    return NextResponse.json(
      createResponse({
        content: "🚨 An internal server error occurred.",
        flags: 64, // Ephemeral
      }),
    );
  }
}
