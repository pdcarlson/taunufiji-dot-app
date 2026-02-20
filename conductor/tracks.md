# Tracks Registry

---

- [ ] **Track: Scrap the current GitHub Actions deployment strategy in favor of direct Appwrite/GitHub integration. This will simplify the development workflow by managing secrets via local files and relying on branch-based deployments (main for prod, staging branch for staging). We will remove all obsolete deployment GitHub workflows, redundant deployment scripts, and any lingering deployment-specific dependencies.**
*Link: [./tracks/deploy_strategy_update_20260220/](./tracks/deploy_strategy_update_20260220/)*

---

- [ ] **Track: Trace all variables from the .env files down and make sure every use of them is accurate. Centralize safe environment variable exports along with the config export in a single central file at the root of the repo.**
*Link: [./tracks/centralize_env_config_20260220/](./tracks/centralize_env_config_20260220/)*