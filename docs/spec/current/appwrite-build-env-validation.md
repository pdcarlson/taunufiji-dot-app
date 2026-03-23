# Spec: Appwrite Build Env Validation Decoupling

## Status

in-progress

## Problem

A **production deployment** (Vercel build from `main` at the time) failed during `next build` because global server environment validation required Discord role IDs during module import for `/api/images`, even though that route only needs AWS variables. CI did not catch this because build ran with `SKIP_ENV_VALIDATION=true`.

## Requirements

### Functional

- [x] `/api/images` validates only AWS environment variables.
- [x] Discord role IDs remain strictly validated where role-based logic is used.
- [x] App layout metadata generation does not import full server env validation.
- [x] CI build path executes without `SKIP_ENV_VALIDATION=true` and includes complete placeholder env keys.
- [x] Deployment documentation includes explicit **Vercel runtime** environment checklist (Appwrite keys are part of that matrix).

### Non-Functional

- [x] Preserve existing clean architecture boundaries in `lib/`.
- [x] Keep validation errors explicit and actionable by key name.
- [x] Avoid introducing secret values into repository files.

## Acceptance Criteria

- [x] `app/api/images/route.ts` no longer imports global `env`.
- [x] Missing Discord role variables do not fail build for unrelated modules.
- [x] Missing Discord role variables still fail when Discord role config is initialized.
- [x] CI workflow validates strict env requirements during build.
- [x] `docs/deployment.md` reflects the updated validation strategy.

## Technical Approach

- Add `aws-env` config module for AWS-only validation and use it in `/api/images`.
- Add `discord-roles-env` config module for strict role ID validation and use it in role config.
- Remove `env` import from `app/layout.tsx` and use `process.env.NODE_ENV` for metadata prefix.
- Update CI build env matrix with placeholders and remove `SKIP_ENV_VALIDATION=true` from build step.
- Update deployment docs with Vercel/runtime env checklist and role-ID production note.

## Out of Scope

- Rotating existing production secrets.
- Changing Vercel–Git branch wiring or Appwrite project topology.
- Refactoring all feature modules to fully scoped env access in this change.

## Dependencies

- **Vercel** environment variables for production / preview (staging) deployments.
- GitHub Actions workflow (`.github/workflows/ci.yml`).

## References

- `app/api/images/route.ts`
- `lib/infrastructure/config/env.ts`
- `lib/infrastructure/config/server-env-schema.ts`
- `docs/deployment.md`
