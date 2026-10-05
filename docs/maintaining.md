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
- **(settings) A ruleset on `main`**: Settings, Rules, Rulesets, New ruleset, New branch ruleset;
  enforcement Active; target the default branch. At least restrict deletions and block force
  pushes. Optional extras: require status checks (`unit (20)` and `unit (22)` from CI) and
  require a pull request before merging; leave the owner on the bypass list so a solo project
  cannot lock itself out. *Not yet set up (verified: no rulesets, `main` unprotected).*
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

The game is static files and needs no server. If hosted (for example GitHub Pages), serve it over
HTTPS. See `SECURITY.md` for what it does and does not do (names remembered locally only, no
network requests).

## CI

`.github/workflows/test.yml` runs `npm test` on Node 20 and 22 for pushes to `main` and pull
requests. It does not run the browser test (`npm run test:e2e`).
