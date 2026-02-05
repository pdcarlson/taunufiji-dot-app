import nacl from "tweetnacl";
import { InteractionResponseType, InteractionResponseFlags } from "./types";
import { env } from "@/lib/infrastructure/config/env";

/**
 * Validates the Ed25519 signature of an incoming Discord interaction.
 */
export function verifyInteractionSignature(
  req: Request,
  body: string,
): boolean {
  const signature = req.headers.get("x-signature-ed25519");
  const timestamp = req.headers.get("x-signature-timestamp");
  const publicKey = env.DISCORD_PUBLIC_KEY;

  if (!signature || !timestamp || !publicKey) return false;

  try {
    return nacl.sign.detached.verify(
      Buffer.from(timestamp + body),
      Buffer.from(signature, "hex"),
      Buffer.from(publicKey, "hex"),
    );
  } catch (e) {
    console.error("Signature verification failed:", e);
    return false;
  }
}

/**
 * Helper to create a JSON response for Discord.
 */
export function createResponse(data: {
  type?: number;
  content?: string;
  flags?: number;
  embeds?: any[];
}) {
  return {
    type: data.type ?? InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: data.content,
      flags: data.flags,
      embeds: data.embeds,
    },
  };
}

/**
 * Helper to create an ephemeral (hidden) response.
 */
export function createEphemeralResponse(content: string) {
  return createResponse({
    content,
    flags: InteractionResponseFlags.EPHEMERAL,
  });
}

/**
 * Extract an option value from the interaction options array.
 */
export function getOptionValue(options: any[] | undefined, name: string): any {
  if (!options) return undefined;
  const option = options.find((o) => o.name === name);
  return option?.value;
}
