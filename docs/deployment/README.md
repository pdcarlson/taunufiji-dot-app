# Deployment

> **Parent specs:** [Platform](../../spec/platform.md) · [Architecture](../../spec/architecture.md)

**Canonical split:** Vercel hosts the app; Appwrite is the backend. If anything here conflicts with another doc, prefer [spec/platform.md](../../spec/platform.md).

## Pipeline Overview

```text
Feature Branch → PR (CI Quality Gates) → Merge to main → Vercel Preview (preview deployment for PRs and main)
                                                              ↓
                                   Manual QA → Merge to production → Vercel Production
```

**Branches**: **`main`** is the default integration branch (preview / staging URL). **`production`** is the release branch (production deployment on Vercel). Treat **`production`** as protected: promote only after QA.

**Hosting**: The Next.js app is deployed on **Vercel** with **GitHub** connected to the repository. **Appwrite** remains the backend (Auth, Databases); it does not host this app.

## Sub-Pages

| Document | Description |
|----------|-------------|
| [CI Quality Gates](ci.md) | GitHub Actions workflow, job details, required status checks |
| [Environments](environments.md) | Staging, production, secret management, env matrix, runtime checklist |
| [Cron Jobs](cron.md) | Vercel Cron configuration, HOUSING_BATCH pipeline, manual testing |
| [Troubleshooting](troubleshooting.md) | Staging diagnostics, runbook for common failure symptoms |
| [Branch Protection](branch-protection.md) | Git branch model, rulesets, GitHub repo settings automation |
