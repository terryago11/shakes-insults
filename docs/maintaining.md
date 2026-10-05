# Maintainer checklist

Items marked **(settings)** are GitHub repository or account settings that cannot be changed from
the code. The menu names are from general knowledge of GitHub and may have moved, so check
GitHub's current documentation.

## Settings that back SECURITY.md

- **(settings) Private vulnerability reporting**: enable it (Settings, then Code security).
  `SECURITY.md` tells reporters to use the Security tab's "Report a vulnerability" button, which
  only exists once this is on.
- **(settings) Secret scanning and push protection**: enable both. They are available for public
  repositories and catch accidentally committed keys.
- **(settings) Dependabot alerts**: enable. The shipped game has no runtime dependencies and
  `package.json` has none at all, so there is nothing to alert on today; this covers future
  tooling.
- **(settings) Branch protection or a ruleset on `main`**: at least block force-pushes and
  deletion. Requiring pull requests is optional for a solo project.
- **Two-factor authentication** on the owning account.

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
