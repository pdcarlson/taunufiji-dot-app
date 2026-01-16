
export const COMMANDS = [
  {
    name: "ping",
    description: "Replies with Pong!",
    type: 1, // CHAT_INPUT
  },
  {
    name: "stats",
    description: "Get library and housing stats",
    type: 1,
  },
];

export async function handleCommand(commandName: string, options: any) {
  switch (commandName) {
    case "ping":
      return {
        type: 4,
        data: { content: "Pong! 🏓" },
      };
    case "stats":
      // Fetch stats (mocked for now, integrate service later)
      return {
        type: 4,
        data: { content: "📊 **Stats**\nLibrary Files: 0\nOpen Tasks: 0" },
      };
    default:
      return {
        type: 4,
        data: { content: "Unknown command" },
      };
  }
}
