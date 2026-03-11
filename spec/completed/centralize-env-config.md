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
- [x] All `process.env` usage replaced with validated imports

### Non-Functional
- [x] Clear error messages for missing keys
- [x] `SKIP_ENV_VALIDATION` bypass for CI/CD

## Acceptance Criteria
- [x] Single `env.ts` file as the source of truth
- [x] No raw `process.env` access outside config layer
- [x] Tests pass with mock environment

## References
- Original track: `conductor/archive/centralize_env_config_20260220/`
