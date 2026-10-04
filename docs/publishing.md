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

- **Git history**: the commits so far use the owner's personal email address as author, and the
  commit trailers include links to private claude.ai sessions. Everything in history becomes
  public. If that is not wanted, rewrite the history (new author identity, trailers removed) and
  force-push **before** the first public push; afterwards it is much harder to undo.
- **Files**: a pattern scan of the tracked text files found no secrets or email addresses. The
  spreadsheet `reference/Insults.xlsx` has no author metadata. Re-run a scan if files were added.
- **Licenses present**: `LICENSE` (MIT, code), `fonts/OFL.txt` (fonts), word lists public domain
  (README credits section).
- **README credits** read the way you want them to appear publicly.

## Hosting

The game is static files and needs no server. If hosted (for example GitHub Pages), serve it over
HTTPS. See `SECURITY.md` for what it does and does not do (no storage, no network requests).

## Optional

- A GitHub Actions workflow that runs `npm test` on every push would keep the lint and tests
  honest for contributors once the repo is public.
