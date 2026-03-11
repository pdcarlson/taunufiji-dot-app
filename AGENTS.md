# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Tau Nu Fiji is a single **Next.js 16** application (not a monorepo). All external backends (Appwrite, Discord, AWS S3) are cloud services — there are no local databases or Docker containers to run.

### Running the app

- **Dev server:** `npm run dev` (starts on port 3000)
- **Build:** `SKIP_ENV_VALIDATION=true npm run build`
- The app requires a `.env.local` file. For development without real credentials, set `SKIP_ENV_VALIDATION=true` in `.env.local` along with placeholder values for all required env vars (see `lib/infrastructure/config/env.ts` for the full list).
- The root `/` route redirects (307) to `/login` — this is normal behavior.

### Quality gates (matching CI)

See `package.json` scripts and `.github/workflows/ci.yml`. Summary:

| Check | Command |
|---|---|
| Lint | `npm run lint` |
| Type check | `npx tsc --noEmit` |
| Test | `npm run test` (vitest; use `--run` flag for non-interactive mode) |
| Build | `SKIP_ENV_VALIDATION=true npm run build` |

### Testing notes

- Tests use **Vitest** with jsdom. The setup file (`vitest.setup.ts`) provides mock env vars and mocks `server-only`, so tests run without any external services.
- Run tests non-interactively with: `npm run test -- --run`
- ESLint is configured via flat config in `eslint.config.mjs`. All rules are warnings — lint passes with 0 errors currently.

### Gotchas

- The env validation in `lib/infrastructure/config/env.ts` uses the `server-only` package and will throw at build/dev time unless `SKIP_ENV_VALIDATION=true` is set when real Appwrite/Discord/AWS credentials are absent.
- Authentication is Discord OAuth-based; without real Discord credentials, you cannot log in via the UI. The login page will render, but the OAuth flow requires valid `DISCORD_APP_ID` and Appwrite project configuration.
