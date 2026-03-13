# Spec: Centralize Environment Configuration

## Status

complete

## Problem

Environment variables were scattered across multiple files with inconsistent validation. Needed a single source of truth with strict Zod validation and `server-only` protection.

## Requirements

### Functional

- [x] Central env config in `lib/infrastructure/config/env.ts`
- [x] Zod schema validation for all required variables
- [x] `server-only` protection for server-side secrets
- [x] Client-safe env vars extracted to `client-env.ts`
- [x] All server-side `process.env` usage replaced with validated imports

### Non-Functional

- [x] Clear error messages for missing keys
- [x] `SKIP_ENV_VALIDATION` bypass for CI/CD

## Acceptance Criteria

- [x] Single `env.ts` file as the source of truth
- [x] No raw `process.env` access outside config layer on the server side
- [x] Tests pass with mock environment

**Known exception**: `app/error.tsx` uses `process.env.NODE_ENV` directly. This is correct — it is a `"use client"` component that cannot import from the `server-only` `env.ts`. Next.js inlines `NODE_ENV` at build time for client components, making direct access the standard approach.

## References

- Original track: `conductor/archive/centralize_env_config_20260220/` (removed)
