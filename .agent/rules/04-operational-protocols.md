---
trigger: always_on
---

# Operational Protocols

## 1. The "Project Log" Mandate

- **Trigger:** After completing ANY significant task (feature, bugfix, refactor).
- **Action:** You MUST append a new entry to `project_log.md`.
- **Format:**
  `## YYYY-MM-DD: [Task Name]`
  - **Context:** briefly explain _why_ this change was made.
  - **Technical Changes:** List specific services/components modified.
  - **Impact:** Note any schema changes or risk factors.

## 2. The "Conventional Commits" Standard

- All commit messages and PR titles must follow the **Conventional Commits** specification:
  - `feat:` for new features.
  - `fix:` for bug fixes.
  - `chore:` for maintenance/config.
  - `refactor:` for code restructuring without behavior change.
  - `docs:` for documentation.
- **Format:** `<type>(<scope>): <subject>` (e.g., `feat(auth): implement discord oauth flow`)
