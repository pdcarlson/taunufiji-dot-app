---
description: Architecture Audit
---

# Workflow: Architecture Audit

**Trigger:** User asks for an "Audit" or "Health Check".

**Step 1: Layer Analysis**

- Scan `app/` (Components) for direct database imports (`appwrite`, `node-appwrite`).
  - _Violation:_ Components MUST only call `lib/services/` or `lib/actions/`.
- Scan `lib/services/` for UI code (React hooks, JSX).
  - _Violation:_ Services must be pure TypeScript.

**Step 2: Security Scan**

- Check `lib/actions` for missing `verifySession` or `verifyRole` guards.
- Verify no secrets are hardcoded in `lib/config`.

**Step 3: Report Generation**

- Generate a `AUDIT_REPORT.md` artifact listing:
  1.  **Critical Violations:** Immediate fixes required.
  2.  **Warnings:** Code smells or minor deviations.
  3.  **Recommendations:** Refactoring opportunities.
