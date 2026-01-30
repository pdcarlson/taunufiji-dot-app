---
description: Feature Planning & Artifact Generation
---

**Trigger:** When the user asks to "plan a feature," "refactor," "fix a bug," or any request involving multiple files.

**Step 1: Context Gathering**

- Scan relevant files.
- List specific "Unknowns" and resolve them via search.

**Step 2: Generate "Implementation Plan" Artifact**

- **Action:** Create/Update the **Implementation Plan**.
- **Content Requirements:**
  - **User Intent:** Clearly state what we are building.
  - **Proposed Changes:** List specific files to modify or create.
  - **Risk Assessment:** Security/Architecture impacts.
  - **Verification:** How will we prove it works? (e.g., "Add unit test to `X.test.ts`").

**Step 3: Generate "Task" Artifacts**

- **Action:** Create a series of **Tasks** derived from the Implementation Plan.
- **Granularity:** Each task should cover one logical unit of work (e.g., "Create DB Schema", "Add Service Method", "Update UI Component").
- **Order:** Enforce dependency order (Infrastructure -> Domain -> UI).

**Step 4: The Gate**

- **STOP.** Present the artifacts to the user.
- Ask: _"Does this plan align with your vision?"_
- Do NOT execute the tasks until approved.
