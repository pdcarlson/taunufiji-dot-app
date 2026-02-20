# Specification: deploy_strategy_update

## Overview
Scrap the current GitHub Actions deployment strategy in favor of direct Appwrite/GitHub integration. This will simplify the development workflow by managing secrets via local files and relying on branch-based deployments (main for prod, staging branch for staging). We will remove all obsolete deployment GitHub workflows and redundant deployment scripts.

## Functional Requirements
- **Delete GitHub Workflows**: Remove `.github/workflows/deploy-prod.yml` and `.github/workflows/deploy-staging.yml`.
- **Remove Deployment Scripts**: Delete obsolete local scripts related to deployment (e.g., `scripts/sync-staging.ts`).
- **Secret Management**: Rely on Appwrite to manage its integration with the GitHub repository, removing the need for most GitHub secrets.

## Acceptance Criteria
- [ ] `.github/workflows/deploy-prod.yml` is deleted.
- [ ] `.github/workflows/deploy-staging.yml` is deleted.
- [ ] `scripts/sync-staging.ts` (and any other deployment scripts) are deleted.
- [ ] No extraneous deployment dependencies or configurations remain.

## Out of Scope
- Modifying `ci.yml` or `cron.yml`.
- Modifying any application logic or core features not related to deployment infrastructure.