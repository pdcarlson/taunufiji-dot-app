import { SlashCommand, DiscordInteraction } from "./types";
import { COMMANDS } from "./commands";
import * as core from "./handlers/core";
import * as duties from "./handlers/duties";
import * as admin from "./handlers/admin";
import { HOUSING_ADMIN_ROLES } from "../config/roles";
import { createEphemeralResponse, getOptionValue } from "./utils";

// Map handler functions to command names
const HANDLERS: Record<string, Function> = {
  ping: core.ping,
  profile: core.profile,
  leaderboard: core.leaderboard,
  duties: duties.duties,
  bounties: duties.bounties,
  // Admin Commands
  duty: admin.duty,
  schedule: admin.schedule,
  bounty: admin.bounty,
};

// Map Permissions
const ADMIN_COMMANDS = new Set(["duty", "schedule", "bounty"]);

export const REGISTRY: Record<string, SlashCommand> = {};

// Initialize Registry based on COMMANDS definition
COMMANDS.forEach((def) => {
  const handler = HANDLERS[def.name];
  if (handler) {
    REGISTRY[def.name] = {
      name: def.name,
      description: def.description,
      execute: handler as any,
      requiresAdmin: ADMIN_COMMANDS.has(def.name),
    };
  } else {
    console.warn(`⚠️ No handler found for Valid Command: ${def.name}`);
  }
});

/**
 * Main Entry Point for Dispatching Commands
 */
export async function dispatchCommand(interaction: DiscordInteraction) {
  const { name, options } = interaction.data || { name: "", options: [] };
  const command = REGISTRY[name];

  if (!command) {
    return createEphemeralResponse(`Unknown command: ${name}`);
  }

  // Permission Check
  if (command.requiresAdmin) {
    const roles = interaction.member?.roles || [];
    const isAdmin = roles.some((r) =>
      (HOUSING_ADMIN_ROLES as unknown as string[]).includes(r),
    );

    if (!isAdmin) {
      // Also check if user is the specific "DEV" user if needed, but roles cover it.
      return createEphemeralResponse(
        "⛔ You do not have permission to use this command.",
      );
    }
  }

  // Parse Options into key-value map for easier handling
  const args: Record<string, any> = {};
  if (options) {
    options.forEach((o) => {
      args[o.name] = o.value;
    });
  }

  try {
    return await command.execute(interaction, args);
  } catch (e) {
    console.error(`Command Execution Failed: ${name}`, e);
    return createEphemeralResponse(
      "An internal error occurred while executing this command.",
    );
  }
}
