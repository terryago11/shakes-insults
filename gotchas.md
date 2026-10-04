# Gotchas

_Persistent error log — append only, never delete._

<!-- entries added here as mistakes are discovered -->
- **Initial build**: `"test": "node --test test/"` fails on Node 22 (`Cannot find module '.../test'`) because a directory argument is treated as a file. Use plain `node --test`, which auto-discovers `test/`.
- **Initial build**: ES modules and `fetch("words.json")` are blocked on `file://`, so they would break double-click-to-run. Packs are classic `<script>` files that call `InsultGame.registerPack`, and `index.html` loads `logic.js` before the packs.
- **Initial build**: the curated spreadsheet's `short` sheet has 66 rows but the printed PDF has 64 (missing `clapper-clawed / artless / popinjay` and `tardy-gaited / errant / mammet`). Verify the source of truth before regenerating packs.
- **Initial build**: in the spreadsheet's `full` sheet "Adjective 1/2" are formula-derived pairings of one alphabetical list, and there are 145 adjectives (odd). Treat adjectives as one pool, not two columns of data.
- **Initial build**: the Excel-to-pack script needs `openpyxl`, which is not installed by default (`pip install openpyxl`).
- **Mobile rebuild**: `h()` only flattened one array level (`kids.flat()`), so the insult (`["Thou ", [spans], "!"]`) rendered as `[object HTMLSpanElement]`. Use `flat(Infinity)` and return flat arrays; browser tests must assert real text, not just that screens render.
- **Mobile rebuild**: `cp .../fontsource-im-fell-english-*/LICENSE` matched two package dirs (`english` and `english-sc`), so the copy failed. Use exact paths when copying from globbed package folders.
- **Mobile rebuild**: text-config lint scanned `app.js` comments (`t("some.key")` in a header comment) and `style.css` for `content:` (matching `justify-content:`). Strip comments before scanning and anchor the `content:` regex.
- **Mobile rebuild**: tuned layout "fixes" (no-wrap headings, resized drop cap) for things that were merely awkward. Awkward is acceptable here; only fix real defects (overlap, unreadable, broken tap targets).
- **Mobile rebuild**: spent effort on a colour-blind-safe palette when the owner did not need it. Ask whether a constraint applies before optimizing for it. (Text contrast on the paper is still kept at 4.5:1 for legibility.)
- **Mobile rebuild**: first README credit linked "Theater in the Rough" to this repo's URL; it is an organization name, not a repo. Do not invent links.
- **Mobile rebuild**: a phone's default tap highlight (translucent blue) tinted the selected word teal over the red selection; set `-webkit-tap-highlight-color` to a paper-friendly colour.
- **Publishing prep**: commits were authored with the owner's personal email (and carry claude.ai session URLs in trailers). Both become public with the repo. Decide whether to rewrite history to a noreply address before the first public push (see `docs/publishing.md`); it is far easier before publication than after.
- **Resolved**: the `short` sheet's 66 rows are canonical (owner); the earlier "66 vs 64 rows" entries refer to a stale PDF.
- **Publishing prep (resolved)**: history rewritten with `git filter-branch` to the noreply email (tree hash unchanged), then force-pushed. Gotchas: filter-branch leaves a `refs/original/...` backup holding the old email (delete it, expire the reflog, `git gc --prune=now`), `git log --all` includes it so a naive "is the email gone" check lies, and the session's git proxy refused `git push --delete` ("remote end hung up"), so the old branch had to be force-repointed and deleted in the UI. GitHub may keep the old commits reachable by SHA until garbage collection.
- **Merging PR 1**: a merge made on github.com used the owner's primary (personal) email as author because "Keep my email addresses private" was off, putting it back on `main`; fixed by amending the merge commit and force-pushing. Turn that account setting on first, and check `git log -1 --format='%ae %ce'` after every web merge.
