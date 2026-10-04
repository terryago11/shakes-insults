# Gotchas

_Persistent error log — append only, never delete._

<!-- entries added here as mistakes are discovered -->
- **Initial build**: `"test": "node --test test/"` fails on Node 22 (`Cannot find module '.../test'`) because a directory argument is treated as a file. Use plain `node --test`, which auto-discovers `test/`.
- **Initial build**: ES modules and `fetch("words.json")` are blocked on `file://`, so they would break double-click-to-run. Packs are classic `<script>` files that call `InsultGame.registerPack`, and `index.html` loads `logic.js` before the packs.
- **Initial build**: the curated spreadsheet's `short` sheet has 66 rows but the printed PDF has 64 (missing `clapper-clawed / artless / popinjay` and `tardy-gaited / errant / mammet`). Verify the source of truth before regenerating packs.
- **Initial build**: in the spreadsheet's `full` sheet "Adjective 1/2" are formula-derived pairings of one alphabetical list, and there are 145 adjectives (odd). Treat adjectives as one pool, not two columns of data.
- **Initial build**: the Excel-to-pack script needs `openpyxl`, which is not installed by default (`pip install openpyxl`).
