# Spec: Infrastructure Logic Hardening

## Status

complete

## Problem

Multiple infrastructure-level issues: CI workflow security gaps, PDF redactor coordinate drift, environment variable safety issues, and missing metrics/logging in cron jobs.

## Requirements

### Functional

- [x] CI/CD hardening and tsx dependency setup
- [x] PDF redactor tests and coordinate fixes
- [x] Environment safety with `clientEnv` extraction
- [x] Cron job metrics and staging sync logging

### Non-Functional

- [x] No security vulnerabilities in CI workflows
- [x] Reliable PDF redaction rendering

## Acceptance Criteria

- [x] All CI quality gates pass
- [x] PDF redactor renders correctly at all zoom levels
- [x] Cron jobs report meaningful metrics

## References

- Original track: `conductor/archive/infra_logic_hardening_20260219/` (removed)
