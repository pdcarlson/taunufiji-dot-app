# Product Definition

## Initial Concept

**Tau Nu Fiji (The Digital Chapter)** is a purpose-built operational platform for the Phi Gamma Delta (Tau Nu Chapter) fraternity. It centralizes chapter logistics, gamifies accountability through a points-based ledger, and secures academic institutional memory. The project is currently in a "refinement" phase, focusing on architectural cleanup, developer experience (DX), and robust CI/CD workflows for a staging-to-production pipeline.

## Target Audience & Roles

Access is strictly managed via Discord Role verification.

- **Brothers**: Base users who view duties, submit proof of completion, track their "Scholarship Points," and access the chapter library.
- **Admins (Cabinet & Housing Chair)**:
    - **Cabinet**: Chapter executive board with full administrative oversight.
    - **Housing Chair**: Responsible for the assignment and verification of chapter chores (Housing Duties).
    - **Dev**: Technical administrators (the user) with full system access.
- **Scholarship Chair**: Specific access for managing academic resources in the Library.

## Core Value Proposition

- **Gamified Accountability**: Scholarship Points (Ledger) drive engagement and accountability without being tied to actual finances.
- **Operational Efficiency**: Automates the chore lifecycle from scheduling to approval/rejection.
- **Secure Academic Archive**: A metadata-driven library (Professor, Course, Semester) protected by RBAC, ensuring academic resources stay within the chapter.
- **Deep Discord Integration**: Real-time role verification and automated notifications (DMs and channel alerts) keep members informed.

## Key Modules

### 🏠 Housing (The Recurring Engine)

- **Lifecycle**: `Scheduled` -> `Open` -> `Pending Review` -> `Approved/Rejected`.
- **Assignment**: Automated round-robin scheduling for recurring chores.
- **Ad-Hoc Requests**: Supports one-off tasks or bounties.

### 💰 Ledger (Scholarship Points)

- **Purely Non-Monetary**: Tracks member engagement and performance.
- **Categories**: Tasks, Fines (point deductions), Events, and Manual adjustments.
- **Persistence**: Double-entry ledger records (`LedgerEntry`) linked to user profiles for auditability and leaderboard ranking.

### 📚 Library (Secure Archives)

- **Indexing**: Resources are tagged by Course Number, Professor, and Semester.
- **Security**: RBAC-protected downloads with short-lived signed URLs.

### 🤖 Discord Integration

- **Identity**: Uses Discord Snowflakes for user identification and role-based access control.
- **Messaging**: Automated DMs for duty reminders and channel messages for system-wide updates.

## Technical Goals & DX

- **Infrastructure Cleanup**: Consolidate fragmented configuration and remove redundant dependencies.
- **Staging Environment**: Establish a functional staging environment for testing changes before production.
- **AI-Agent Alignment**: Structure the codebase to be easily navigable and understandable for AI pair-programmers (like Gemini).
- **CI/CD Maturity**: Standardize build, lint, and test gates for a predictable deployment process.
