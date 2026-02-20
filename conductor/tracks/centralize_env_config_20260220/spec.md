# Specification: centralize_env_config

## Overview
Trace all variables from the `.env*` files and ensure every use of them is accurate across the codebase. Centralize safe environment variable exports along with general application configuration exports into a single file at the root of the project (`/env.ts`), removing obsolete or duplicated configurations. 

## Functional Requirements
- **Central Configuration File**: Create an `/env.ts` file at the root of the repository.
- **Merge Configurations**: Move environment variables from `lib/infrastructure/config/env.ts` and general application configuration into the new `/env.ts` file.
- **Validation**: Enforce safety by using Zod schema validation to ensure types and presence of environment variables.
- **Server Protection**: Use the `server-only` package to protect sensitive environment variables from being leaked to the client bundle.
- **Refactor Usage**: Trace all usages of environment variables across the codebase and update imports to use the new centralized `/env.ts` file, ensuring accurate usage after recent `.env` cleanups (e.g., removing the obsolete "dev role").
- **Clean Up**: Remove the old `lib/infrastructure/config/env.ts` and any redundant configuration files that have been merged.

## Acceptance Criteria
- [ ] `/env.ts` is created at the project root containing both environment variables and static application configuration.
- [ ] Environment variables are validated at runtime using a Zod schema.
- [ ] Server-only secrets are protected by `server-only`.
- [ ] All codebase imports for environment variables are updated to reference `/env.ts`.
- [ ] Old configuration files (e.g., `lib/infrastructure/config/env.ts`) are deleted.

## Out of Scope
- Adding new features or application logic not related to configuration management.
- Modifying the actual values within the `.env*` files (these are assumed to be cleaned up locally by the user).