export const COMMANDS = [
  // --- Core (Public) ---
  {
    name: "ping",
    description: "Health check",
    type: 1,
  },
  {
    name: "profile",
    description: "View your points and server status",
    type: 1,
  },
  {
    name: "leaderboard",
    description: "View the points leaderboard",
    type: 1,
  },

  // --- Housing (Brothers) ---
  {
    name: "duties",
    description: "View your currently assigned duties",
    type: 1,
  },
  {
    name: "bounties",
    description: "View available bounties to claim",
    type: 1,
  },

  // --- Housing (Admin) ---
  {
    name: "duty",
    description: "[Admin] Assign a one-off duty to a brother",
    type: 1,
    options: [
      {
        name: "user",
        description: "The brother to assign to",
        type: 6, // USER
        required: true,
      },
      {
        name: "title",
        description: "Task title",
        type: 3, // STRING
        required: true,
      },
      {
        name: "due_date",
        description: "Due date (e.g. '2026-01-25 17:00' or 'tomorrow 5pm')",
        type: 3, // STRING
        required: true,
      },
      {
        name: "description",
        description: "Instructions / details",
        type: 3,
        required: false,
      },
    ],
  },
  {
    name: "schedule",
    description: "[Admin] Create a recurring weekly task",
    type: 1,
    options: [
      {
        name: "title",
        description: "Task title",
        type: 3, // STRING
        required: true,
      },
      {
        name: "day",
        description: "Day of week",
        type: 3, // STRING
        required: true,
        choices: [
          { name: "Monday", value: "MO" },
          { name: "Tuesday", value: "TU" },
          { name: "Wednesday", value: "WE" },
          { name: "Thursday", value: "TH" },
          { name: "Friday", value: "FR" },
          { name: "Saturday", value: "SA" },
          { name: "Sunday", value: "SU" },
        ],
      },
      {
        name: "time",
        description: "Deadline time (e.g. 17:00)",
        type: 3, // STRING
        required: true,
      },
      {
        name: "user",
        description: "Default assignee (optional, leave blank for floating)",
        type: 6, // USER
        required: false,
      },
      {
        name: "lead_time",
        description: "Hours before deadline to unlock (default: 24)",
        type: 4, // INTEGER
        required: false,
      },
    ],
  },
  {
    name: "bounty",
    description: "[Admin] Create a new bounty (claimable by anyone)",
    type: 1,
    options: [
      {
        name: "title",
        description: "Bounty title",
        type: 3, // STRING
        required: true,
      },
      {
        name: "points",
        description: "Points reward",
        type: 4, // INTEGER
        required: true,
      },
      {
        name: "description",
        description: "Description of the bounty",
        type: 3,
        required: false,
      },
    ],
  },
];
