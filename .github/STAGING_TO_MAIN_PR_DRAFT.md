# PR: Staging → Main (draft description)

Use this when opening a pull request with **base: main**, **compare: staging**.

---

## Type of Change

- [x] New Feature (`feat`)
- [x] Bug Fix (`fix`)
- [x] Refactor (`refactor`)
- [x] Chore (`chore`)

## Summary

Merge staging into main: recurring task scopes, QA audit hardening, repo restructure (docs/AGENTS.md), env/CI and testing upgrades, and verification fixes. Ready for production deploy.

## Technical Breakdown

- **Recurring scopes + housing RBAC**: Scope-aware edit/delete (this instance, this and future, entire series); `effectiveFromDueAt` validation in admin and schedule services; EditTaskModal scope UX, lead-time conditional update, date min for past due, delete using persisted task.due_at. Housing mutations gated by HOUSING_ADMIN_ROLES.
- **Eastern time + scheduler**: ET date input/ISO helpers, RRULE with TZID=America/New_York; DST-aware scheduler; tests for eastern-time and scheduler.
- **Docs/AGENTS + spec/style-guide**: AGENTS.md skills and Cursor Cloud env (default staging/read-only, elevation path); docs/ restructure (architecture, product, deployment, behavior, changelog); spec README, current and archive; style-guide.
- **CI + env + diagnostics**: ci.yml quality gates; client-env, server-env-schema, validation; SKIP_ENV_VALIDATION for build; diagnose:staging script; Discord command registration.
- **Testing + Playwright**: Vitest setup, coverage and critical gates; action-handler, housing admin/schedule actions, ensure-future-tasks job, eastern-time, env tests; Playwright smoke e2e; E2E_ENV with NODE_ENV.
- **Verification fixes**: AGENTS default profile and elevation; EditTaskModal lead-time/date/delete fixes; schedule.service JSDoc for entire-series params.

## Risk Assessment

- **Migrations:** No new DB migration for this merge.
- **Security:** Housing mutations already gated by HOUSING_ADMIN_ROLES. AGENTS.md documents elevation for production tokens (not in default profile).
- **Impact:** Production will get scope-aware recurring edits/deletes and all staging fixes. Recommend a quick smoke of housing (edit/delete recurring) and login after deploy.

## Verification

- [x] Updated `docs/changelog.md` (2026-03-13 entry).
- [ ] Run `npm run build` locally on staging.
- [ ] Run `npm run test` locally on staging.
- [ ] Verify UI on Mobile and Desktop (optional; smoke after merge).
