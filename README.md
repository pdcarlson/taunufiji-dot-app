# Internal OS - Tau Nu Fiji Chapter

**The secure internal dashboard for the Tau Nu Chapter of Phi Gamma Delta**

Built with Next.js 16, Appwrite Cloud, and Discord Authentication. A comprehensive platform for managing chapter operations, housing tasks, scholarship resources, and points tracking.

---

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure) - [Features](#-features)
- [Architecture](#-architecture)
- [Security Model](#-security-model)
- [Database Schema](#-database-schema)
- [Data Flow Patterns](#-data-flow-patterns)
- [Development](#-development)
- [Deployment](#-deployment)
- [Common Operations](#-common-operations)

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your credentials

# Start development server
npm run dev

# Open http://localhost:3000
```

**First-Time Setup**:

1. Configure Appwrite project (database + auth)
2. Set up Discord OAuth application
3. Configure AWS S3 bucket
4. Register Discord slash commands: `npm run register:commands`
5. Set up GitHub Actions for cron jobs

---

## ⚡ Technology Stack

| Layer           | Technology               | Version | Purpose                                     |
| --------------- | ------------------------ | ------- | ------------------------------------------- |
| **Framework**   | Next.js (App Router)     | 16.1.1  | Server-side rendering, API routes, React 19 |
| **Database**    | Appwrite Cloud           | Latest  | NoSQL document database (`v2_internal_ops`) |
| **Auth**        | Appwrite + Discord OAuth | -       | SSO via Discord, session management         |
| **Storage**     | AWS S3                   | -       | File storage for library PDFs               |
| **Styling**     | Tailwind CSS             | 4.0     | Utility-first CSS framework                 |
| **Icons**       | Lucide React             | Latest  | SVG icon library                            |
| **Forms**       | React Hook Form + Zod    | Latest  | Form state & runtime validation             |
| **Testing**     | Vitest + Testing Library | Latest  | Unit & integration tests                    |
| **Cron**        | GitHub Actions           | -       | Scheduled tasks (hourly)                    |
| **Recurrence**  | RRule                    | 2.8.1   | iCalendar recurrence patterns (RFC 5545)    |
| **Discord Bot** | Discord.js Types         | Latest  | Slash command integration                   |

---

## 📁 Project Structure

```
dot-app/
├── app/                    # Next.js App Router (routes & pages)
│   ├── api/                # API Route Handlers
│   ├── dashboard/          # Protected dashboard routes
│   ├── login/              # Authentication pages
│   └── unauthorized/       # Access denied page
├── components/             # React components
│   ├── auth/               # Authentication components
│   ├── dashboard/          # Feature components
│   │   ├── housing/        # Housing management UI
│   │   └── library/        # Scholarship library UI
│   ├── domain/             # Domain-specific shared components
│   └── ui/                 # Generic UI primitives
├── lib/                    # Core business logic
│   ├── actions/            # Next.js Server Actions (API wrappers)
│   ├── services/           # Pure business logic (Appwrite SDK)
│   ├── discord/            # Discord bot integration
│   ├── events/             # Domain events
│   ├── config/             # Configuration modules
│   ├── types/              # TypeScript definitions
│   ├── utils/              # Utility functions
│   ├── client/             # Client-side Appwrite SDK
│   └── server/             # Server-side Appwrite SDK
├── scripts/                # Administrative tools
│   ├── register-commands.ts   # Discord command registration
│   ├── test-cron-dry.ts      # Cron logic testing
│   └── archive/              # Historical scripts
├── public/                 # Static assets (images, fonts)
├── hooks/                  # Custom React hooks
└── .github/workflows/      # CI/CD & Cron jobs
    └── cron.yml            # Hourly task maintenance
```

---

## 💾 Database Collections

**Database ID**: `v2_internal_ops` (Appwrite Cloud)

| Collection          | Purpose                               | Est. Size   | Key Indexes                                |
| ------------------- | ------------------------------------- | ----------- | ------------------------------------------ |
| `users`             | User profiles, Discord sync, points   | ~50 docs    | `discord_id` (unique), `auth_id` (unique)  |
| `assignments`       | Housing tasks (all types)             | ~200 active | `status`, `assigned_to`, `due_at`          |
| `housing_schedules` | Recurring task templates              | ~15 docs    | `active`                                   |
| `library_resources` | Scholarship library metadata          | ~500 docs   | `department`, `course_number`, `professor` |
| `ledger`            | Immutable points transaction log      | ~2000 docs  | `user_id`, `timestamp`                     |
| `professors`        | Professor names for autocomplete      | ~100 docs   | `name`                                     |
| `courses`           | Course catalog (dept + number + name) | ~500 docs   | `department`, `course_number`              |

---

## 🎯 Features

### 🏠 Housing Management

**Purpose**: Manage house chores, recurring schedules, and optional bounties

**Task Types**:

1. **Recurring Duties**: Auto-spawning weekly tasks (e.g., "Trash - Mondays @ 11:59 PM")
2. **One-Off Duties**: Admin-assigned single tasks with deadline
3. **Bounties**: Optional tasks with point rewards (claimable by anyone)
4. **Projects**: Long-term multi-step initiatives

**Task State Machine**:

```
RECURRING DUTY:
  created → locked → (unlock) → open → (claim) → pending → (proof) → approved/expired

ONE-OFF DUTY:
  created → open/pending → (assign) → pending → (proof) → approved/rejected/expired

BOUNTY:
  created → open → (claim) → pending → (proof) → approved/rejected
```

**Key Features**:

- ✅ RRule-based recurring schedules (iCalendar standard)
- ✅ Smart deadline management (11:59 PM end-of-day)
- ✅ Lead time configuration (unlock X hours before deadline)
- ✅ Automatic fines for missed duties (-50 points)
- ✅ Proof upload & admin review queue
- ✅ Discord notifications (DMs + channel pings)
- ✅ Task rotation (next instance spawns after completion)

**User Flows**:

<details>
<summary><b>Brother Claims Bounty</b></summary>

1. Browse available bounties in TaskGrid
2. Click "Claim Bounty"
3. Task updates: `status: pending`, `assigned_to: user_id`
4. Complete task, upload proof photo
5. Admin reviews in ReviewQueue
6. **If approved**: Points awarded, `status: approved`
7. **If rejected**: `status: rejected`, user can resubmit

</details>

<details>
<summary><b>Admin Assigns One-Off Duty</b></summary>

1. Click "Create One-Off Duty"
2. Fill form:
   - **Assignee** (required): Select brother
   - **Title** (required): e.g., "Clean Kitchen"
   - **Due Date** (MM-DD format): Smart year detection
   - **Description** (required): Instructions
3. Submit → Creates task:
   - `type: one_off`
   - `points_value: 0` (duties don't reward points)
   - `due_at: <date>T23:59:00.000Z` (11:59 PM)
   - `status: pending` (already assigned)
4. **If missed**: Cron job expires task, deducts 50 points, notifies admin channel

</details>

<details>
<summary><b>Admin Creates Recurring Schedule</b></summary>

1. Click "Create Schedule"
2. Fill form:
   - **Title**: e.g., "Trash Duty"
   - **Day of Week**: Monday-Sunday
   - **Description**: Instructions/checklist
   - **Lead Time**: Hours before deadline to unlock (default: 24)
   - **Default Assignee**: Optional
3. System generates RRule: `FREQ=WEEKLY;BYDAY=MO;BYHOUR=23;BYMINUTE=59`
4. First instance spawns with:
   - `due_at`: Next occurrence
   - `unlock_at`: `due_at` - lead_time_hours
   - `status: locked` (if before unlock time)
5. Cron unlocks task when `unlock_at` passes
6. After completion/expiry, next instance auto-spawns

</details>

**Discord Integration**:

- `/duty` - Assign one-off duty (admin only)
- `/schedule` - Create recurring schedule (admin only)
- `/bounty` - Post new bounty (admin only)
- `/leaderboard` - View top 10 points leaders (public)

---

### 📚 Scholarship Library

**Purpose**: Searchable repository of past exams, notes, and study materials

**Features**:

- ✅ PDF storage in AWS S3 (up to 200MB per file)
- ✅ Metadata tracking in Appwrite
- ✅ Client-side PDF redaction (PdfRedactor component)
- ✅ Advanced filtering (department, course, professor)
- ✅ Presigned URL downloads (5min expiry)
- ✅ Points rewards for uploads (+10pts)
- ✅ Duplicate upload prevention (by dept/course/type/semester/year/version)
- ✅ Full-screen upload interface with PDF zoom controls

**Document Types**:

1. **Answer Keys**: Uploaded as-is
2. **Student Copies**: Requires redaction of personal info

**Upload Flow**:

1. Click "Upload Resource"
2. Drag & drop PDF or use file picker (max 200MB)
3. Select version: Answer Key or Student Copy
4. **If Student Copy**:
   - PdfRedactor loads PDF in browser with tight margins (10px padding)
   - Zoom controls: 50% to 300% (+ / - buttons)
   - Click and drag to redact name, ID, dates
   - Reload button available if rendering issues occur
   - Redacted PDF generated with pdf-lib (burns redactions permanently)
5. Fill metadata form:
   - Department (autocomplete): e.g., "CS", "MATH"
   - Course number: e.g., "1100"
   - Assessment type: e.g., "Exam 1", "Final", "Quiz 3"
   - Professor (autocomplete)
   - Semester: Fall/Spring/Summer
   - Year: 2024
6. **Duplicate Check**: System verifies no existing exam with same metadata
7. Submit → Server action (JWT auth):
   - Uploads to S3: `s3://bucket/library/<uuid>.pdf`
   - Creates `library_resources` document
   - Awards 10 points to uploader
8. File immediately searchable

**Search & Download**:

1. Enter keywords or use filters
2. Results update in real-time (client-side)
3. Click "Download" → Server generates presigned S3 URL
4. Browser downloads directly from S3 (5min expiry)

**UI Enhancements** (2026-01-26):

- **Full-Width Layout**: Upload page uses entire screen width (no max-width constraint)
- **Context-Aware Shell**: Dashboard detects `/library/upload` route and removes margins
- **24px Screen Margins**: Clean spacing without overflow
- **PDF Viewer Improvements**:
  - Discrete zoom levels (0.5x - 3.0x) with visual percentage display
  - Page navigation (left/right arrows, keyboard support)
  - Reload functionality for stuck renders
  - Tight canvas margins (10px) for maximum viewable area

**Technical Implementation**:

- **Redaction**: Uses `pdf-lib` to render pages as PNG, draw black rectangles, re-embed as PDF
- **Coordinate System**: Canvas rendered at effective scale (baseScale × zoomLevel), no CSS scaling
- **File Upload**: Next.js Server Actions with 200MB body size limit
- **Duplicate Prevention**: Server-side query by 6 dimensions before upload proceeds

---

### 📊 Points System

**Purpose**: Track brother contributions for housing selection priority

**Point Sources**:

- Library uploads: +10 points
- Bounty completion: +variable points (set by admin)
- Missed duties: -50 points (fine)
- Manual adjustments: +/- any amount (admin only)

**Point Types**:

- `details_points_current`: Current semester points (used for housing picks)
- `details_points_lifetime`: All-time cumulative points

**Ledger**:

- Immutable transaction log
- Categories: `task`, `fine`, `event`, `manual`
- Provides full audit trail

**Leaderboard**:

- Real-time top 10 ranking
- Displayed on dashboard widget
- Full leaderboard at `/dashboard/housing/leaderboard`

---

### 🔔 Notifications & Cron

**Notification Channels**:

1. **Discord DMs**: Personal task reminders
2. **Discord Channel**: Admin alerts (`DISCORD_HOUSING_CHANNEL_ID`)

**Cron Schedule** (GitHub Actions - Hourly):

```
0 * * * * → curl https://taunufiji.app/api/cron?key=<SECRET>
```

**Cron Actions**:

1. **Unlock Tasks**: `locked` → `open` (if `unlock_at` ≤ now)
2. **Halfway Reminders**: DM users when 50% time remaining
3. **Urgent Reminders**: DM users when <12h remaining
4. **Expire Bounties**: Unclaim overdue bounties
5. **Expire Duties**:
   - Update `status: expired`
   - Deduct 50 points
   - Notify admin channel
   - Trigger next instance (if scheduled)
6. **Send Summary**: Discord webhook with stats

---

## 🏗️ Architecture

### Service Layer Pattern

**Strict separation between framework and business logic**:

```
┌─────────────────────────────────────────────┐
│ Client Component (React)                    │
│ components/dashboard/housing/TaskCard.tsx   │
│ - "use client" directive                    │
│ - Uses hooks, state, effects                │
└───────────────┬─────────────────────────────┘
                │ onClick → calls server action
                ▼
┌─────────────────────────────────────────────┐
│ Server Action (Next.js)                     │
│ lib/actions/housing.actions.ts              │
│ - "use server" directive                    │
│ - Verifies JWT from client                  │
│ - Checks RBAC permissions                   │
│ - Calls service layer                       │
│ - Returns sanitized DTO                     │
└───────────────┬─────────────────────────────┘
                │ calls
                ▼
┌─────────────────────────────────────────────┐
│ Service (Pure Business Logic)               │
│ lib/services/tasks.service.ts               │
│ - No Next.js dependencies                   │
│ - Uses Node Appwrite SDK (+ API key)        │
│ - Contains business rules                   │
│ - Returns domain models                     │
│ - Testable with mocks                       │
└───────────────┬─────────────────────────────┘
                │ calls SDK
                ▼
┌─────────────────────────────────────────────┐
│ External Service (Appwrite, AWS)            │
│ db.createDocument(), s3.putObject()         │
└─────────────────────────────────────────────┘
```

**Why This Matters**:

- **Testability**: Services are pure functions → easy to unit test
- **Reusability**: Services called from actions, cron jobs, scripts
- **Security**: Actions enforce auth/authz before business logic
- **Separation**: Business rules independent of framework

---

## 🔒 Security Model

### 1. Zero-Permission Database

**Policy**: No Appwrite collection has `role:all` or `role:member` permissions [2](#-security-model)

**What This Means**:

- Client SDK **cannot** read/write database directly
- All data access goes through server actions
- Server actions use `APPWRITE_API_KEY` (admin access)

**Why**:

- Prevents client-side data access bypass
- Enables fine-grained authorization
- No accidental data leaks from client code

**Example**:

```typescript
// ❌ WRONG - This won't work (client has no permissions)
const client = new Client();
const db = new Databases(client);
await db.listDocuments(DB_ID, COLLECTIONS.USERS); // 403 Forbidden

// ✅ CORRECT - Call server action
const users = await getUsersAction(jwt); // Server action checks auth, uses API key
```

### 2. Role-Based Access Control (RBAC)

**Source of Truth**: Discord roles (live from Discord API)

**Configuration** (`lib/config/roles.ts`):

```typescript
export const ROLES = {
  BROTHER: "750151182395244584", // @Brothers role
  CABINET: "1148288953745686538", // @Cabinet
  HOUSING_CHAIR: "750354822452215880", // @Housing Manager
  SCHOLARSHIP_CHAIR: "1070412676716564581", // @Scholarship Chair
  DEV: "1452422469209161904", // @Dev Team
};

export const HOUSING_ADMIN_ROLES = [
  ROLES.HOUSING_CHAIR,
  ROLES.CABINET,
  ROLES.DEV,
];
```

**Verification Flow**:

```typescript
// Server action example
export async function createTaskAction(data, jwt) {
  // 1. Extract user ID from JWT
  const userId = await AuthService.getUserIdFromJWT(jwt);

  // 2. Check roles (live Discord API call)
  const isAdmin = await AuthService.verifyRole(userId, HOUSING_ADMIN_ROLES);

  // 3. Enforce authorization
  if (!isAdmin) {
    return { success: false, error: "Unauthorized" };
  }

  // 4. Proceed with business logic
  const task = await TasksService.createTask(data);
  return { success: true, data: task };
}
```

**Discord Command RBAC**:

```typescript
// lib/discord/registry.ts
if (interaction.data.name === "duty") {
  // Check if user has admin role
  if (!HOUSING_ADMIN_ROLES.includes(userRole)) {
    return createEphemeralResponse("❌ Admin only");
  }
  return await handlers.duty(interaction, options);
}
```

### 3. Authentication Flow

```
User clicks "Login with Discord"
  ↓
Next.js redirects to Discord OAuth
  ↓
Discord callback: /api/auth/callback?code=...
  ↓
Exchange code for Discord access token
  ↓
Fetch Discord user profile + guild member data
  ↓
AuthService.syncUser(discordProfile)
  ↓ Query: User exists with this discord_id?
  ├─ YES: Update profile (name, roles)
  └─ NO: Create new user document
  ↓
Create Appwrite session (30 day expiry)
  ↓
Set HTTP-only session cookie
  ↓
Redirect to /dashboard
```

**Session Management**:

- Cookies: HTTP-only, Secure, SameSite=Lax
- JWT tokens: Created per-request for server actions
- Expiry: 30 days (configurable in Appwrite)
- Logout: Destroys session + clears cookie

### 4. Data Architecture - ID Strategy

**Critical Design Decision**: `users.$id` ≠ `users.discord_id`

**Why**:

- **Ghost ID Bug**: If `$id` = Discord ID, conflicts occur on re-sync
- **Solution**: Use random UUID for `$id`, `discord_id` as indexed attribute

**Consequence**:

```typescript
// ❌ WRONG (assumes $id = Discord ID)
const user = await db.getDocument(DB_ID, COLLECTIONS.USERS, discordId);
// Error: Document not found

// ✅ CORRECT (query by discord_id attribute)
const users = await db.listDocuments(DB_ID, COLLECTIONS.USERS, [
  Query.equal("discord_id", discordId),
]);
const user = users.documents[0];
```

---

## 💾 Database Schema

### Users Collection

```typescript
interface UserSchema {
  $id: string; // Random UUID (Appwrite internal)
  discord_id: string; // Discord user ID snowflake (Unique Index)
  discord_handle: string; // username#0000
  full_name: string; // Display name
  position_key: string; // Chapter position (e.g., "president")
  details_points_current: number; // Current semester points
  details_points_lifetime: number; // All-time cumulative
  status: "active" | "alumni"; // Membership status
  auth_id: string; // Appwrite Auth user ID (Unique Index)
  $createdAt: string; // Auto-managed by Appwrite
  $updatedAt: string; // Auto-managed by Appwrite
}
```

**Indexes**:

- `discord_id`: Unique, for lookups
- `auth_id`: Unique, links to Appwrite Auth

**Query Examples**:

```typescript
// Get user by Discord ID
const user = await db.listDocuments(DB_ID, COLLECTIONS.USERS, [
  Query.equal("discord_id", "123456789"),
]);

// Get top 10 by points
const leaderboard = await db.listDocuments(DB_ID, COLLECTIONS.USERS, [
  Query.orderDesc("details_points_current"),
  Query.limit(10),
]);
```

### Assignments Collection

```typescript
interface AssignmentSchema {
  title: string; // Task name
  description: string; // Instructions/details
  status: "open" | "pending" | "approved" | "rejected" | "expired" | "locked";
  type: "duty" | "bounty" | "one_off" | "project";
  points_value: number; // Reward (0 for duties)
  assigned_to?: string; // Discord user ID (optional for bounties)
  due_at?: string; // ISO timestamp: YYYY-MM-DDTHH:MM:SS.sssZ
  unlock_at?: string; // ISO timestamp (for cooldowns)
  expires_at?: string; // ISO timestamp (bounty unclaim deadline)
  schedule_id?: string; // Link to parent housing_schedules doc
  proof_s3_key?: string; // S3 key: "proofs/<uuid>.jpg"
  initial_image_s3_key?: string; // "Before" photo (not currently used)
  notification_level?: "none" | "unlocked" | "halfway" | "urgent";
  execution_limit?: number; // Days to complete (bounties)
  is_fine?: boolean; // Whether fine was applied
}
```

**Status Transitions**:

```
open → pending → approved ✅
               → rejected → (resubmit) → approved
               → expired ❌
locked → open (via cron unlock)
```

**Due Date Convention**: All tasks due at **11:59 PM (23:59)** on selected date

### Schedules Collection

```typescript
interface ScheduleSchema {
  title: string; // e.g., "Trash Duty"
  description: string; // Instructions
  recurrence_rule: string; // RRule: "FREQ=WEEKLY;BYDAY=MO;BYHOUR=23;BYMINUTE=59"
  lead_time_hours: number; // Hours before deadline to unlock (default: 24)
  assigned_to?: string; // Default assignee (null = floating)
  points_value: number; // Usually 0 for duties
  active: boolean; // Master on/off switch
  last_generated_at?: string; // ISO timestamp of last task spawn
}
```

**RRule Examples**:

```
Every Monday at 11:59 PM:
FREQ=WEEKLY;BYDAY=MO;BYHOUR=23;BYMINUTE=59

Every Friday at 5 PM:
FREQ=WEEKLY;BYDAY=FR;BYHOUR=17;BYMINUTE=0

First of month at midnight:
FREQ=MONTHLY;BYMONTHDAY=1;BYHOUR=23;BYMINUTE=59
```

### Library Resources Collection

```typescript
interface LibraryResourceSchema {
  department: string; // e.g., "CS", "MATH"
  course_number: string; // e.g., "101"
  course_name: string; // e.g., "Intro to Programming"
  professor: string; // e.g., "Dr. Smith"
  semester: string; // "Fall", "Spring", "Summer"
  year: number; // 2024
  type: string; // "Answer Key" or "Student Copy"
  version: string; // "Midterm 1", "Final", etc.
  original_filename: string; // Original upload filename
  file_s3_key: string; // S3 key: "library/<uuid>.pdf"
  uploaded_by: string; // Discord user ID
}
```

### Ledger Collection

```typescript
interface LedgerSchema {
  user_id: string; // Discord user ID
  amount: number; // +/- points (can be negative)
  reason: string; // Human-readable description
  category: "task" | "fine" | "event" | "manual";
  timestamp: string; // ISO timestamp
}
```

**Immutability**: Ledger entries are never updated or deleted (audit trail)

---

## 🔄 Data Flow Patterns

### Pattern 1: UI Task Creation

```
User fills out CreateOneOffModal form
  ↓ clicks "Create"
  ↓ calls createTaskAction(data, jwt)
    ↓ (Next.js Server Action)
    ├─ verify JWT signature
    ├─ extract Discord user ID
    ├─ call AuthService.verifyRole(userId, HOUSING_ADMIN_ROLES)
    ├─ if unauthorized → return error
    ├─ call TasksService.createTask(data)
    │   ↓ (Business Logic Service)
    │   ├─ validate required fields
    │   ├─ format due_at as ISO string
    │   ├─ db.createDocument(COLLECTIONS.ASSIGNMENTS, {...})
    │   └─ return created task
    └─ return { success: true, data: task }
  ↓ Modal receives response
  ↓ Modal closes
  ↓ TaskGrid refreshes via onSuccess callback
```

### Pattern 2: Discord Slash Command

```
User types: /duty assigned_to:@John due_at:01-30 title:"Clean Kitchen" description:"..."
  ↓ Discord sends POST to /api/discord/interactions
    ↓ (Discord Webhook Handler)
    ├─ verify Ed25519 signature (Discord security)
    ├─ if invalid → return 401
    ├─ parse interaction (command name + options)
    ├─ call registry.dispatchCommand(interaction)
    │   ↓ (Command Dispatcher)
    │   ├─ lookup handler by command name
    │   ├─ check user roles via Discord API
    │   ├─ if unauthorized → return ephemeral "Admin only"
    │   └─ call handlers.duty(interaction, options)
    │       ↓ (Command Handler)
    │       ├─ parse MM-DD date string
    │       ├─ apply smart year logic (if past → +1 year)
    │       ├─ format as ISO: "<year>-<month>-<day>T23:59:00.000Z"
    │       ├─ call TasksService.createTask({...})
    │       └─ return createEphemeralResponse("✅ Duty assigned")
    └─ return Discord interaction response
  ↓ User sees ephemeral message in Discord
```

### Pattern 3: Hourly Cron Job

```
GitHub Actions cron trigger: 0 * * * *
  ↓ curl "https://taunufiji.app/api/cron?key=<CRON_SECRET>"
    ↓ (Cron API Route)
    ├─ verify secret key
    ├─ if invalid → return 401
    └─ call TasksService.runCron()
    ↓ (Cron Service Logic)
        ├─ 1. UNLOCK TASKS (status="locked" AND unlock_at <= now)
        │   ├─ for each → update status="open", send DM to user
        │   └─ "Task available: {title}"
        ├─ 2. NOTIFY UNINFORMED (status="open" AND notification_level="none")
        │   ├─ for each → send DM to user
        │   └─ "Task available: {title}"
        ├─ 3. URGENT NOTIFICATIONS (< 12h to due date)
        │   ├─ query: status="open" AND due_at within 12h
        │   ├─ for each → send DM to user
        │   └─ "Urgent: {title} due in <12 hours"
        ├─ 4. EXPIRE OVERDUE DUTIES
        │   ├─ query: status="open" AND due_at < now
        │   ├─ for each:
        │   │   ├─ update status="expired"
        │   │   ├─ fine user -50 points
        │   │   └─ trigger next recurring instance (if applicable)
        ├─ 5. NOTIFY EXPIRED TASKS
        │   ├─ query: status="expired" AND notification_level != "expired"
        │   ├─ for each:
        │   │   ├─ send Admin Channel Notification (🚨 MISSED TASK)
        │   │   ├─ send User DM ("Task expired: {title}...")
        │   │   └─ IF BOTH SUCCEED: update notification_level="expired"
        └─ return summary stats
  ↓ GitHub Action logs result
  ↓ (Optional) Send Discord webhook with summary
```

---

## 🧪 Testing

**Framework**: Vitest + React Testing Library  
**Coverage**: Services, components, utilities

**Commands**:

```bash
npm test                    # Run all tests
npm test auth.service       # Run specific file
npm test -- --coverage      # Generate coverage report
npm test -- --watch         # Watch mode for development
```

**Test Structure**:

```
lib/services/
├── auth.service.ts
└── auth.service.test.ts    # Co-located tests

components/dashboard/housing/
├── TaskCard.tsx
└── TaskCard.test.tsx
```

**Example Service Test**:

```typescript
// lib/services/auth.service.test.ts
import { describe, it, expect, vi } from "vitest";
import { AuthService } from "./auth.service";

describe("AuthService.syncUser", () => {
  it("creates new user if not exists", async () => {
    // Mock Appwrite SDK
    const mockDb = vi.fn().mockResolvedValue({ total: 0, documents: [] });

    // Test user creation
    const result = await AuthService.syncUser(mockDiscordProfile);

    expect(mockDb).toHaveBeenCalledWith(/* ... */);
    expect(result.discord_id).toBe(mockDiscordProfile.id);
  });
});
```

---

## 🚀 Deployment

**Platform**: Appwrite Functions, Vercel, or any Node.js host  
**Build Time**: ~2-3 minutes  
**Bundle Size**: ~1.5MB

### Environment Variables

**Required** (`.env.local` / `.env.production`):

```bash
# Appwrite
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=<project_id>
APPWRITE_API_KEY=<server_secret_key>

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<access_key>
AWS_SECRET_ACCESS_KEY=<secret_key>
AWS_BUCKET_NAME=<bucket_name>

# Discord
DISCORD_APP_ID=<application_id>
DISCORD_PUBLIC_KEY=<public_key>
DISCORD_BOT_TOKEN=<bot_token>
DISCORD_GUILD_ID=<guild_id>               # For instant command registration
DISCORD_HOUSING_CHANNEL_ID=<channel_id>   # Admin notifications

# App
NEXT_PUBLIC_APP_URL=https://taunufiji.app
CRON_SECRET=<random_secret_key>           # For securing cron endpoint
```

**Generate secrets**: Use `openssl rand -base64 32`

### Deployment Steps

1. **Build Application**:

   ```bash
   npm run build
   ```

2. **Register Discord Commands**:

   ```bash
   npx tsx scripts/register-commands.ts
   # Output: ✅ Successfully registered 4 commands!
   ```

3. **Set Discord Webhook URL**:
   - Discord Developer Portal → Applications → Your App → Interactions Endpoint URL
   - Enter: `https://taunufiji.app/api/discord/interactions`
   - Discord will send test request to verify

4. **Configure GitHub Actions**:
   - Repository → Settings → Secrets → New secret
   - Add `CRON_SECRET` (matches .env value)
   - Add `DISCORD_MONITORING_WEBHOOK` (optional, for failure alerts)

5. **Test Deployment**:

   ```bash
   # Test cron endpoint
   curl "https://taunufiji.app/api/cron?key=<CRON_SECRET>"

   # Expected output: {"success":true,"unlocked":X,"expired":Y,...}
   ```

6. **Verify Discord Commands**:
   - Open Discord
   - Type `/` in any channel
   - Verify commands appear: `/duty`, `/schedule`, `/bounty`, `/leaderboard`

---

## 📝 Development

### Commands

```bash
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Production build
npm run start            # Start production server
npm run lint             # ESLint code quality check
npm test                 # Run Vitest tests
npm run register:commands # Register Discord slash commands
```

### File Naming Conventions

| Type       | Convention              | Example              |
| ---------- | ----------------------- | -------------------- |
| Components | `PascalCase.tsx`        | `TaskCard.tsx`       |
| Services   | `kebab-case.service.ts` | `tasks.service.ts`   |
| Actions    | `kebab-case.actions.ts` | `housing.actions.ts` |
| Types      | `kebab-case.ts`         | `schema.ts`          |
| Tests      | `*.test.ts(x)`          | `TaskCard.test.tsx`  |

### Code Style

- **Comments**: Lowercase for inline (`// check if user exists`)
- **Imports**: Use `@` alias (`import { ... } from "@/lib/..."`)
- **Functions**: Explicit return types for public APIs
- **Async**: Always `async`/`await`, never `.then()`
- **Error Handling**: Try-catch with specific error messages

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/add-bounty-categories

# Make changes, commit with conventional commits
git commit -m "feat: add category field to bounties"

# Push and create PR
git push -u origin feature/add-bounty-categories

# Squash merge to main
```

**Commit Conventions**:

- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code restructuring
- `docs:` - Documentation
- `test:` - Test additions
- `chore:` - Maintenance tasks

---

## 🔧 Common Operations

### Add New Discord Command

1. **Define schema** in `lib/discord/commands.ts`:

```typescript
{
  name: "mycommand",
  description: "Does something cool",
  type: 1, // CHAT_INPUT
  options: [
    {
      name: "param1",
      description: "First parameter",
      type: 3, // STRING
      required: true,
    },
  ],
}
```

2. **Create handler** in `lib/discord/handlers/admin.ts`:

```typescript
export const mycommand: CommandHandler = async (interaction, options) => {
  const param1 = options.param1;

  // Your logic here

  return createResponse({ content: `Success! You said: ${param1}` });
};
```

3. **Register in dispatcher** (`lib/discord/registry.ts`):

```typescript
const HANDLERS = {
  leaderboard,
  duty,
  schedule,
  bounty,
  mycommand, // Add here
};
```

4. **Deploy commands**:

```bash
npx tsx scripts/register-commands.ts
```

5. **Test in Discord**: Type `/mycommand` and verify it works

### Add New Task Type

1. **Update schema** in `lib/types/schema.ts`:

```typescript
type: "duty" | "bounty" | "one_off" | "project" | "mynewtype";
```

2. **Update UI rendering** in `components/dashboard/housing/TaskCard.tsx`:

```typescript
if (task.type === "mynewtype") {
  return <MyNewTypeCard task={task} />;
}
```

3. **Update cron logic** (if needed) in `lib/services/tasks.service.ts`:

```typescript
if (task.type === "mynewtype") {
  // Custom expiry/unlock handling
}
```

4. **Add creation modal** in `components/dashboard/housing/CreateMyNewTypeModal.tsx`

### Add New Database Collection

1. **Create collection** in Appwrite Console
2. **Define schema** in `lib/types/schema.ts`:

```typescript
export const COLLECTIONS = {
  // ... existing
  MY_NEW_COLLECTION: "my_new_collection",
};

export interface MyNewSchema {
  field1: string;
  field2: number;
}
```

3. **Create service** in `lib/services/mynew.service.ts`
4. **Create actions** in `lib/actions/mynew.actions.ts`
5. **Build UI components** for viewing/editing

---

## 📚 Additional Resources

### External Documentation

- [Next.js App Router](https://nextjs.org/docs/app) - Framework docs
- [Appwrite Database](https://appwrite.io/docs/products/databases) - NoSQL database
- [Discord Developer Portal](https://discord.com/developers/docs) - Bot & OAuth
- [RRule RFC 5545](https://icalendar.org/iCalendar-RFC-5545/3-8-5-3-recurrence-rule.html) - Recurrence standard
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/) - Object storage

### Project-Specific Docs

- **Task Lifecycle**: See `/lib/services/tasks.service.ts` line 380-550
- **RRule Calculator**: See `/lib/utils/scheduler.ts`
- **Discord Integration**: See `/lib/discord/` folder
- **Cron Logic**: See `/app/api/cron/route.ts`

### Troubleshooting

**Discord commands not updating**:

- Run `npx tsx scripts/register-commands.ts`
- If using global commands, wait up to 1 hour
- Use `DISCORD_GUILD_ID` for instant updates

**Cron job not running**:

- Check GitHub Actions tab for workflow runs
- Verify `CRON_SECRET` matches in both .env and GitHub Secrets
- Test manually: `curl "https://your-domain.com/api/cron?key=<SECRET>"`

**Authentication failing**:

- Verify Discord OAuth redirect URLs match
- Check Appwrite project settings
- Clear cookies and try again

**Database queries slow**:

- Add indexes on frequently queried fields
- Use `Query.select()` to limit returned fields
- Consider pagination with `Query.limit()` + `Query.offset()`

---

**Last Updated**: January 22, 2026  
**Maintained By**: Tau Nu Fiji Development Team  
**Version**: 1.0.0
