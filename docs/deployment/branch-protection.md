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

**Create** a new ruleset with **`POST`** (requires `administration: write` on the repository; adjust JSON to match your policy). **`POST` always creates a new ruleset** — use it only when you intend to add one. Re-running the same payload with **`POST`** can create **duplicate** rulesets and **policy drift**.

```bash
export GH_TOKEN="$GITHUB_PERSONAL_ACCESS_TOKEN"
gh api --method POST repos/OWNER/REPO/rulesets \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  --input ruleset-payload.json
```

**Update** an existing ruleset with **`PUT`** against `repos/OWNER/REPO/rulesets/RULESET_ID` (replace `RULESET_ID` with the numeric id from the rulesets list or API). Use the **same** headers and payload shape as create; **`PUT` updates that ruleset in place** so you do not accumulate duplicates.

```bash
export GH_TOKEN="$GITHUB_PERSONAL_ACCESS_TOKEN"
gh api --method PUT repos/OWNER/REPO/rulesets/RULESET_ID \
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

### Release promotion and branch sync

**Policy (this repository):** After every successful merge **`main` → `production`**, open a follow-up pull request **`production` → `main`** (back-merge) and merge it through the normal **`main`** rules. That keeps **`main`** a **superset** of **`production`**’s history so the next promotion PR stays compatible with **strict “branch up to date”** rules.

**Why this is required:** A typical GitHub **merge** of `main` into `production` creates a **merge commit on `production` only**. **`main` does not contain that commit.** The next PR with base **`production`** and head **`main`** then fails “head not up to date with base” until **`main`** has absorbed **`production`**’s tip (via back-merge or an equivalent merge).

**Release checklist (human):**

1. Merge feature work into **`main`** (integration).
2. Open **PR `main` → `production`**, pass checks and approvals, merge (production deploy per [Environments](environments.md)).
3. Open **PR `production` → `main`**, pass checks and approval, merge (back-merge).

**Deadlock recovery:** If branches are **mutually ahead** (each has commits the other lacks) and GitHub’s **Update branch** on a **`production` → `main`** PR fails (for example **repository rule violations** when the API tries to update the protected **`production`** ref), use a **sync branch**:

```bash
git fetch origin
git checkout -b sync/backmerge-production-to-main origin/production
git merge origin/main -m "chore(git): merge main into production tip for back-merge sync"
git push -u origin sync/backmerge-production-to-main
```

Then open **PR `sync/backmerge-production-to-main` → `main`**. After it merges, continue with step 3 above (or merge an existing **`production` → `main`** PR if it becomes mergeable).

**Inspect divergence:**

```bash
git fetch origin
git log --oneline --left-right --cherry-pick origin/main...origin/production
```

**Alternatives (not the default here):** squash-only merges into **`production`**, fast-forward-only promotion, or deploying production from **`main`** / tags with Vercel deployment protection instead of a second long-lived branch—each changes history or hosting assumptions; see [README](README.md) for the current **`main` / `production`** split.
