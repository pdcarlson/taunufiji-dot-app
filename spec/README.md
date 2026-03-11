# Spec-Driven Development

All non-trivial changes to this project must begin with a specification. Specs are living documents — they are updated as implementation reveals new information.

## Principles

1. **Spec First**: Before writing code, write a spec that defines the problem, requirements, and acceptance criteria.
2. **Living Documents**: Specs are updated during and after implementation to reflect what was actually built.
3. **Single Source of Truth**: The spec is the authoritative description of what a feature/change should do.
4. **Traceability**: Each spec links to its implementation (PRs, commits) and each PR references its spec.

## Directory Structure

```
spec/
├── README.md              ← This file (guidelines + template)
├── <feature-name>.md      ← Active specs
└── completed/             ← Specs for shipped work
    └── <feature-name>.md
```

## Workflow

1. **Create**: Copy the template below into a new `spec/<feature-name>.md` file.
2. **Review**: Discuss the spec before implementation begins (can be async or in PR).
3. **Implement**: Reference the spec in your PR description.
4. **Update**: If requirements change during implementation, update the spec.
5. **Complete**: When shipped, move the spec to `spec/completed/` and check off the acceptance criteria.

## Spec Template

```markdown
# Spec: <Feature/Change Name>

## Status
<!-- draft | in-progress | complete | cancelled -->
draft

## Problem
<!-- What problem are we solving? Why does it matter? -->

## Requirements

### Functional
<!-- What must the system do? Bullet list. -->
- [ ] ...

### Non-Functional
<!-- Performance, security, accessibility, etc. -->
- [ ] ...

## Acceptance Criteria
<!-- How do we know this is done? Testable statements. -->
- [ ] ...

## Technical Approach
<!-- High-level implementation plan. Reference architecture layers. -->

## Out of Scope
<!-- Explicitly state what this spec does NOT cover. -->

## Dependencies
<!-- Other specs, external services, or prerequisites. -->

## References
<!-- Links to PRs, issues, related specs, external docs. -->
```

## Naming Convention

Use kebab-case descriptive names: `staging-environment-setup.md`, `discord-sync-automation.md`.

## When to Write a Spec

- New features or modules
- Significant refactors or architecture changes
- Infrastructure or deployment changes
- Bug fixes that require design decisions
- Any change touching 3+ files or taking more than a few hours

## When You Can Skip a Spec

- Single-file bug fixes with obvious solutions
- Documentation-only changes
- Dependency updates
- Style/formatting changes
