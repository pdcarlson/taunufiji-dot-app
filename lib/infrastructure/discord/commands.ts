export const COMMANDS = [
  // --- Core (Public) ---
  {
    name: "leaderboard",
    description: "View the points leaderboard",
    type: 1,
  },

  // --- Housing (Admin) ---
  {
    name: "duty",
    description: "[Admin] Assign a one-off duty to a brother",
    type: 1,
    options: [
      {
        name: "assigned_to",
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
        name: "due_at",
        description: "Due date (MM-DD, auto-fills year)",
        type: 3, // STRING
        required: true,
      },
      {
        name: "description",
        description: "Instructions / details",
        type: 3,
        required: true, // NOW REQUIRED
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
        name: "description",
        description: "Description of the task",
        type: 3, // STRING
        required: true, // NOW REQUIRED
      },
      {
        name: "assigned_to",
        description: "Default assignee (optional, leave blank for floating)",
        type: 6, // USER
        required: false,
      },
      {
        name: "lead_time_hours",
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
        name: "points_value",
        description: "Points reward",
        type: 4, // INTEGER
        required: true,
      },
      {
        name: "description",
        description: "Description of the bounty",
        type: 3,
        required: true, // NOW REQUIRED
      },
    ],
  },
];
