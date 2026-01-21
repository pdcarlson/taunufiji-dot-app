export const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
  APPLICATION_COMMAND_AUTOCOMPLETE: 4,
  MODAL_SUBMIT: 5,
} as const;

export const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  DEFERRED_UPDATE_MESSAGE: 6,
  UPDATE_MESSAGE: 7,
  APPLICATION_COMMAND_AUTOCOMPLETE_RESULT: 8,
  MODAL: 9,
} as const;

export const InteractionResponseFlags = {
  EPHEMERAL: 64,
} as const;

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  bot?: boolean;
}

export interface DiscordMember {
  user: DiscordUser;
  roles: string[];
  nick?: string;
  joined_at: string;
}

export interface DiscordInteractionDataOption {
  name: string;
  type: number;
  value?: string | number | boolean;
  options?: DiscordInteractionDataOption[];
  focused?: boolean;
}

export interface DiscordInteractionData {
  id: string;
  name: string;
  type: number;
  options?: DiscordInteractionDataOption[];
  custom_id?: string; // For components
  component_type?: number;
}

export interface DiscordInteraction {
  id: string;
  application_id: string;
  type: number;
  data?: DiscordInteractionData;
  guild_id?: string;
  channel_id?: string;
  member?: DiscordMember; // Present in guilds
  user?: DiscordUser; // Present in DMs
  token: string;
  version: number;
}

export interface InteractionResponse {
  type: number;
  data?: {
    tts?: boolean;
    content?: string;
    embeds?: any[];
    allowed_mentions?: any;
    flags?: number;
    components?: any[];
  };
}

export type CommandHandler = (
  interaction: DiscordInteraction,
  options: Record<string, any>,
) => Promise<InteractionResponse>;

export interface SlashCommand {
  name: string;
  description: string;
  options?: any[]; // Discord API Command Options
  execute: CommandHandler;
  requiresAdmin?: boolean; // Internal flag for our middleware
}
