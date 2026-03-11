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

- **Staging Environment**: Functional staging environment for testing changes before production.
- **AI-Agent Alignment**: Codebase structured to be navigable and understandable for AI pair-programmers.
- **CI/CD Maturity**: Standardized build, lint, and test gates for a predictable deployment process.
