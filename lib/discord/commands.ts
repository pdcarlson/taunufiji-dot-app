export const COMMANDS = [
  // --- Core ---
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
  {
    name: "claim",
    description: "Claim a bounty or open task",
    type: 1,
    options: [
      {
        name: "task_id",
        description: "The ID of the task to claim",
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: "submit",
    description: "Submit proof for a task",
    type: 1,
    options: [
      {
        name: "task_id",
        description: "The ID of the task you are submitting",
        type: 3, // STRING
        required: true,
      },
      {
        name: "proof",
        description: "Image or file proof of completion",
        type: 11, // ATTACHMENT
        required: true,
      },
    ],
  },

  // --- Housing (Admin) ---
  {
    name: "assign",
    description: "[Admin] Create and assign a one-off duty",
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
        name: "points",
        description: "Points value (negative for fine, default 0)",
        type: 4, // INTEGER
        required: false,
      },
    ],
  },
  {
    name: "approve",
    description: "[Admin] Approve a submitted task",
    type: 1,
    options: [
      {
        name: "task_id",
        description: "The ID of the task to approve",
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: "reject",
    description: "[Admin] Reject a submitted task",
    type: 1,
    options: [
      {
        name: "task_id",
        description: "The ID of the task to reject",
        type: 3, // STRING
        required: true,
      },
      {
        name: "reason",
        description: "Reason for rejection",
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: "reassign",
    description: "[Admin] Reassign a task to another brother",
    type: 1,
    options: [
      {
        name: "task_id",
        description: "The ID of the task",
        type: 3, // STRING
        required: true,
      },
      {
        name: "user",
        description: "The new brother to assign to",
        type: 6, // USER
        required: true,
      },
    ],
  },
];
