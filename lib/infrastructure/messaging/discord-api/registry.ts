import { SlashCommand, DiscordInteraction } from "./types";
import { COMMANDS } from "./commands";
import * as core from "./handlers/core";
import * as admin from "./handlers/admin";
import { HOUSING_ADMIN_ROLES } from "../../config/roles";
import { createEphemeralResponse } from "./utils";

// map handler functions to command names
const HANDLERS: Record<string, Function> = {
  leaderboard: core.leaderboard,
  // admin commands
  duty: admin.duty,
  schedule: admin.schedule,
  bounty: admin.bounty,
};

// map permissions
const ADMIN_COMMANDS = new Set(["duty", "schedule", "bounty"]);

export const REGISTRY: Record<string, SlashCommand> = {};

// initialize registry based on COMMANDS definition
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
    console.warn(`⚠️ No handler found for command: ${def.name}`);
  }
});

/**
 * main entry point for dispatching commands
 */
export async function dispatchCommand(interaction: DiscordInteraction) {
  const { name, options } = interaction.data || { name: "", options: [] };
  const command = REGISTRY[name];

  if (!command) {
    return createEphemeralResponse(`Unknown command: ${name}`);
  }

  // permission check
  if (command.requiresAdmin) {
    const roles = interaction.member?.roles || [];
    const isAdmin = roles.some((r) =>
      (HOUSING_ADMIN_ROLES as unknown as string[]).includes(r),
    );

    if (!isAdmin) {
      return createEphemeralResponse(
        "⛔ You do not have permission to use this command.",
      );
    }
  }

  // parse options into key-value map for easier handling
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
