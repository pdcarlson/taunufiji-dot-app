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

## Notes

- A later commit (`e40c60d`) introduced a YAML indentation error in `ci.yml` that broke the "Validate GitHub Secrets" and "Build" steps, causing all CI runs to fail with a workflow parse error. Fixed by restoring correct indentation and adding `permissions: contents: read`.

## References

- Implementation commit: `1b81b4b` (`chore: implement unified environment configuration and infrastructure hardening`)
