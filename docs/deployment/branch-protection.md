# Branch Protection

> **Parent spec:** [Platform](../../spec/platform.md)

## Git Branches, Default Branch, and Protection

Complete this in GitHub so the branch model matches repo settings. **Doc-only updates do not replace applying settings in GitHub.**

### Human Checklist (GitHub UI)

1. **Default branch (`main`)** — Repo **Settings → General → Default branch** → **`main`**. Verify: opening **New pull request** defaults the base branch to **`main`**.
2. **Inventory** — **Settings → Rules** (rulesets) and/or **Settings → Branches**. Note rules targeting **`main`**, **`production`**, and any leftover **`staging`**.
3. **`main`** — Match or exceed what **`staging`** had before the migration (required PRs, required status checks, review rules, etc.).
4. **`production`** — Match or exceed what **`main`** had before the migration, plus extra safeguards as needed (e.g. block force-push, restrict who can push).
5. **Cleanup** — Remove rules that only applied to the deleted **`staging`** branch if they are redundant.

**Verify**: Attempt an operation your policy should block (for example a direct push to **`production`** without a PR) and confirm GitHub rejects it.

### Automating GitHub Repo Settings (Maintainers)

Use a **fine-grained PAT** with access to this repository. For **organization** repositories, authorize the PAT for SSO: **Settings → Developer settings → Personal access tokens → … → Configure SSO**.

The GitHub CLI reads **`GH_TOKEN`** (or **`GITHUB_TOKEN`**) from the environment. If your tooling only injects a differently named secret (for example **`GITHUB_PERSONAL_ACCESS_TOKEN`** in Cursor Cloud), export it before calling `gh`:

```bash
export GH_TOKEN="$GITHUB_PERSONAL_ACCESS_TOKEN"
```

**Smoke test** (local shell; do not rely on `GITHUB_TOKEN` inside Actions for admin API calls):

```bash
export GH_TOKEN="<fine-grained-pat>"
gh auth status -h github.com
gh api repos/OWNER/REPO \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28"
```

- **401** — wrong or expired token, or `GH_TOKEN` not exported in this shell.
- **403** — often missing repo scope or **SSO** not enabled for the PAT on the org.
- **404** — wrong `OWNER/REPO`, or PAT cannot access that repository.

If the UI uses **repository rulesets**, prefer the [rulesets API](https://docs.github.com/en/rest/repos/rules) when automating; legacy branch-protection endpoints may not match what the UI shows.

**Example** (read-only; redact secrets; replace `OWNER/REPO`):

```bash
export GH_TOKEN="$GITHUB_PERSONAL_ACCESS_TOKEN"
gh api repos/OWNER/REPO/rulesets -H "X-GitHub-Api-Version: 2022-11-28"
```

**Example** (create or update rulesets — requires `administration: write` on the repository; adjust JSON to match your policy):

```bash
export GH_TOKEN="$GITHUB_PERSONAL_ACCESS_TOKEN"
gh api --method POST repos/OWNER/REPO/rulesets \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  --input ruleset-payload.json
```

### Repository Rulesets (Reference)

This repo uses **branch rulesets** (not legacy branch protection API). As configured for **`main`** and **`production`**:

| Ruleset | Branch | Policy (summary) |
| ------- | ------ | ---------------- |
| Protect main (integration) | `refs/heads/main` | Pull request required (**1** approval), required status checks (see below), **block force-push** (`non_fast_forward`) |
| Protect production (release) | `refs/heads/production` | Pull request required (**2** approvals), same required checks, **block force-push**, **block branch deletion** |

Required status check contexts (from `ci.yml` job ids): `lint`, `typecheck`, `test`, `coverage-critical`, `e2e-smoke`, `build`, `quality-gate`. **Strict** policy: the merge head must be up to date with the base branch.

Tweak review counts or check contexts in **Settings → Rules** if your team's bar differs (for example if two approvals on `production` is heavier than the old `main` bar).
