# Publishing checklist

Do this before making the repository public. Items marked **(settings)** are GitHub repository
settings that cannot be changed from the code; the menu names are from general knowledge of
GitHub and may have moved, so check GitHub's current documentation.

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

## Check the repository itself

- **Git history**: rewritten on 2026-10-04 (and `main`'s merge commit for PR 1 again later, after
  GitHub's web merge used the personal email) so every commit uses the GitHub noreply address
  (`<id>+<username>@users.noreply.github.com`) instead of a personal email; file contents were
  unchanged (identical tree hash). Still in the commit messages: the `Co-Authored-By: Claude ...
  <noreply@anthropic.com>` attribution and `Claude-Session:` links to private claude.ai sessions
  (not accessible to others). **Caveat**: after a force-push, GitHub can keep the old, now
  unreachable commits and serve them by full commit SHA until it garbage-collects them. For
  certainty before going public, either ask GitHub Support to purge them, or create a fresh empty
  repository and push the clean history to it.
- **(settings) Email privacy** (account settings, Emails, github.com/settings/emails): turn on
  "Keep my email addresses private" and "Block command line pushes that expose my email". The
  owner has changed the privacy option; whether it applies to web merges has not been confirmed
  (check `git log -1 --format='%ae %ce'` after the next one). Commit with the noreply address
  (`git config user.email`).
- ~~Leftover branch `broadside-ui`~~: deleted.
- **Files**: a pattern scan of the tracked text files found no secrets or email addresses. The
  spreadsheet `reference/Insults.xlsx` has no author metadata. Re-run a scan if files were added.
- **Licenses present**: `LICENSE` (MIT, code), `fonts/OFL.txt` (fonts), word lists public domain
  (README credits section).
- **README credits** read the way you want them to appear publicly.

## Hosting

The game is static files and needs no server. If hosted (for example GitHub Pages), serve it over
HTTPS. See `SECURITY.md` for what it does and does not do (names remembered locally only, no network requests).

## CI

`.github/workflows/test.yml` runs `npm test` on Node 20 and 22 for pushes to `main` and pull
requests. It does not run the browser test (`npm run test:e2e`).
