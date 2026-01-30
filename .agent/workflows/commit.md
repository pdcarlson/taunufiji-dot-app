---
description: Commit Message Generation
---

# Workflow: Commit Message Generation

**Trigger:** User asks to "commit changes".

**Step 1: Diff Analysis**

- Review the files modified.
- Identify the _primary_ intent (Feature vs Fix).

**Step 2: Formulate Message**

- **Header:** `<type>(<scope>): <short summary>` (Max 50 chars)
- **Body:** Bullet points explaining _what_ changed and _why_.
- **Footer:** References (e.g., `Closes #123`).

**Step 3: Output**

- Present the git command:
  ```bash
  git add .
  git commit -m "feat(scope): ..." -m "- detail 1"
  ```
