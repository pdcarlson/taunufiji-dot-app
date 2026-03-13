# Spec-Driven Development

All non-trivial changes to this project must begin with a specification. Specs are living documents and are updated as implementation reveals new information.

## Directory Structure

```
docs/spec/
├── README.md                ← This file (guidelines + template)
├── current/
│   └── <feature-name>.md    ← Active specs
└── archive/
    └── <feature-name>.md    ← Completed specs
```

## Workflow

1. **Create**: Copy the template below into a new `docs/spec/current/<feature-name>.md` file.
2. **Review**: Discuss the spec before implementation begins (async or in PR comments).
3. **Implement**: Reference the spec in your PR description.
4. **Update**: If requirements change, update the active spec.
5. **Complete**: When shipped, move the spec to `docs/spec/archive/` and check off acceptance criteria.

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

Use kebab-case descriptive names: `staging-environment-setup.md`, `recurring-task-update-scopes.md`.
