---
description: Draft Pull Request
---

# Workflow: Draft Pull Request

**Trigger:** User asks to "open a PR", "draft a PR", or "prepare for merge".

**Step 1: Scope Analysis (The "History" Check)**

- **Do not** simply read the last line of `project_log.md`.
- Review the **entire session history** and the **Implementation Plan** artifact.
- Identify _all_ `project_log.md` entries that are part of this specific feature set.
- _Goal:_ Synthesize a summary that covers the _entire_ arc of work, not just the final commit.

**Step 2: Draft Content**

- Fill out `.github/pull_request_template.md`.
- **Summary:** Synthesize the "User Intent" from your Implementation Plan.
- **Technical Breakdown:** List the concrete changes made across all files.
- **Risk Assessment:** explicitly mention if Migration Scripts (`scripts/`) were created.

**Step 3: Output**

- Present the full Markdown content, ready for the user to copy-paste into GitHub.
