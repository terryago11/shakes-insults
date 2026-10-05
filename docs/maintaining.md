# Maintainer checklist

Items marked **(settings)** are GitHub repository or account settings that cannot be changed from
the code. GitHub moves its menus around, so check its current documentation if a name below is
missing. The repository is public (since 2026-10-05); several of these only exist for public
repositories. Settings you can read back with `gh api repos/<owner>/<repo>` are marked as
verified.

## Settings that back SECURITY.md

- **(settings) Private vulnerability reporting**: public repositories only. Settings, Security and
  quality, Advanced Security, Private vulnerability reporting. `SECURITY.md` tells reporters to
  use the Security tab's "Report a vulnerability" button, which only exists once this is on.
  *On (verified).*
- **(settings) Secret scanning and push protection**: Settings, Security and quality, Advanced
  Security, Secret Protection; push protection is switched on alongside it. They catch
  accidentally committed keys. *Both on (verified).*
- **(settings) Dependabot alerts**: enable. The shipped game has no runtime dependencies and
  `package.json` has none at all, so there is nothing to alert on today; this covers future
  tooling. *On (verified).*
- **(settings) Code scanning (CodeQL)**: default setup, weekly, scanning JavaScript, Python and
  GitHub Actions files. *On (verified).*
- **(settings) A ruleset on `main`**: Settings, Rules, Rulesets (New ruleset, New branch ruleset).
  *Active ("Default Branch rule", verified): applies to the default branch and blocks deletion
  and force pushes, requires a pull request (no approvals needed, so a solo owner can merge) and
  requires the CI checks `unit (20)` and `unit (22)` to pass (not "up to date with main").*
  The CodeQL checks are not required. The owner is on the bypass list with mode "for pull requests
  only" (verified): the owner can merge a PR past a failing check in an emergency, but direct
  pushes and force pushes to `main` stay blocked for everyone, including anything running with the
  owner's credentials. Because the required check names include the Node version,
  changing the matrix in `.github/workflows/test.yml` means updating the ruleset too, or every PR
  will wait for a check that never runs.
- **Two-factor authentication** on the owning account. *Turned on by the owner (not verifiable
  from the repository).*

## Good practice for commits

- **(settings) Email privacy** (account settings, Emails): turn on "Keep my email addresses
  private" and "Block command line pushes that expose my email". Commit with the GitHub noreply
  address (`git config user.email <id>+<username>@users.noreply.github.com`). After a merge made
  on github.com, `git log -1 --format='%ae %ce'` shows which address it used.

## Check the repository itself

- **Files**: scan the tracked text files for secrets and email addresses (re-run if files were
  added). `reference/Insults.xlsx` has no author metadata.
- **Licenses present**: `LICENSE` (MIT, code), `fonts/OFL.txt` (fonts), word lists public domain
  (README credits section).
- **README credits** read the way you want them to appear publicly.

## Hosting

The game is static files and needs no server. It is published to GitHub Pages by
`.github/workflows/pages.yml`, which runs `npm test`, copies only the files the game needs
(`scripts/build-site.sh`: `index.html`, `style.css`, `LICENSE`, `src/`, `config/`, `packs/`,
`fonts/`) and deploys that copy, so tests, docs and the reference spreadsheet are not on the site.
A unit test fails if the copy is missing anything the page loads or includes a repo-only file.

- **(settings) One-time setup**: Settings, Pages, Build and deployment, Source = **GitHub
  Actions**. Until that is set, the workflow's deploy step fails. After setting it, re-run the
  workflow (Actions, pages, Run workflow) or push to `main`.
- If you add a new top-level file or folder the game needs at runtime, add it to
  `scripts/build-site.sh` (the test will tell you).
- Pages serves over HTTPS. See `SECURITY.md` for what the game does and does not do (names
  remembered locally only, no network requests).

## CI

`.github/workflows/test.yml` runs `npm test` on Node 20 and 22 for pushes to `main` and pull
requests. It does not run the browser test (`npm run test:e2e`). The `pages` workflow (see
Hosting) runs only on pushes to `main`, so a pull request does not exercise the deploy step.
