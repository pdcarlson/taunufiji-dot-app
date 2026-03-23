# Product Definition

## Overview

**Tau Nu Fiji (The Digital Chapter)** is a purpose-built operational platform for the Phi Gamma Delta (Tau Nu Chapter) fraternity. It centralizes chapter logistics, gamifies accountability through a points-based ledger, and secures academic institutional memory.

## Target Audience & Roles

Access is strictly managed via Discord Role verification.

- **Brothers**: Base users who view duties, submit proof of completion, track their "Scholarship Points," and access the chapter library.
- **Admins (Cabinet & Housing Chair)**:
  - **Cabinet**: Chapter executive board with full administrative oversight.
  - **Housing Chair**: Responsible for the assignment and verification of chapter chores (Housing Duties).
  - **Dev**: Technical administrators with full system access.
- **Scholarship Chair**: Specific access for managing academic resources in the Library.

## Core Value Proposition

- **Gamified Accountability**: Scholarship Points (Ledger) drive engagement and accountability without being tied to actual finances.
- **Operational Efficiency**: Automates the chore lifecycle from scheduling to approval/rejection.
- **Secure Academic Archive**: A metadata-driven library (Professor, Course, Semester) protected by RBAC, ensuring academic resources stay within the chapter.
- **Deep Discord Integration**: Real-time role verification and automated notifications (DMs and channel alerts) keep members informed.

## Key Modules

### Housing (The Recurring Engine)

- **Lifecycle**: `Scheduled` → `Open` → `Pending Review` → `Approved/Rejected`.
- **Assignment**: Automated round-robin scheduling for recurring chores.
- **Ad-Hoc Requests**: Supports one-off tasks and bounties.

### Ledger (Scholarship Points)

- **Purely Non-Monetary**: Tracks member engagement and performance.
- **Categories**: Tasks, Fines (point deductions), Events, and Manual adjustments.
- **Persistence**: Double-entry ledger records (`LedgerEntry`) linked to user profiles for auditability and leaderboard ranking.

### Library (Secure Archives)

- **Indexing**: Resources are tagged by Course Number, Professor, and Semester.
- **Security**: RBAC-protected downloads with short-lived signed URLs.

### Discord Integration

- **Identity**: Uses Discord Snowflakes for user identification and role-based access control.
- **Messaging**: Automated DMs for duty reminders and channel messages for system-wide updates.
- **Slash Commands**: `/duty`, `/schedule`, `/bounty`, `/leaderboard` for quick operations.

## Technical Goals

- **Staging environment**: Preview/staging URL on **Vercel** (typically from **`main`**) against a **staging Appwrite project** — see `docs/platform-map.md` and `docs/deployment.md` (do not assume a `staging` Git branch is the integration branch).
- **AI-Agent Alignment**: Codebase structured to be navigable and understandable for AI pair-programmers.
- **CI/CD Maturity**: Standardized build, lint, and test gates for a predictable deployment process.

## Product Guidelines

### Visual Identity and Aesthetics

- **High-Contrast and Professional**: Maintain a focused, professional palette with sharp borders and high contrast. The goal is a "Digital Chapter" look that feels reliable and authoritative.
- **Typography**: Utilize established brand fonts ("Bebas Neue", "Langdon") to maintain fraternal identity.
- **Flexible Utility-Based Design**: Stick with the utility-first (Tailwind) approach for speed and flexibility. Focus on consistent patterns rather than rigid, over-abstracted component libraries.

### Communication and Prose Style

- **Casual and Direct**: Keep notifications and instructions short, punchy, and modern. Communication should be efficient.
- **Encouraging and Positive**: While direct, the system should highlight the value of contributions and the benefits of earning Scholarship Points to drive engagement.
- **Terminology**: Use specific fraternal terms where appropriate ("Brothers", "Cabinet", "Housing Chair") but keep surrounding language accessible.

### Error Handling and Feedback

- **Technical and Transparent**: Since the user/developer base is technically inclined, provide detailed error messages.
- **Actionable Failures**: Even when technical, errors should imply or state next steps (for example: missing permissions, network timeouts).

### Responsive Strategy

- **Balanced Responsive**: Features must function seamlessly across all screen sizes.
  - **Mobile**: Critical for Brothers performing chores and submitting proof in real-time.
  - **Desktop**: Critical for admin roles managing complex schedules and reviewing data-heavy ledger histories.

### Engineering Principles for UI

- **Pattern Over Abstraction**: Prioritize repeating successful UI patterns from the existing dashboard over creating new, isolated components.
- **Performance**: Ensure interactions are snappy, using optimistic UI updates where appropriate.
