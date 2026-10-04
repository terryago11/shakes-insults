# Security Policy

## Supported Versions

Insult Duel is a small open-source game. Security fixes are applied to the `main` branch only.

| Version | Supported |
|---------|-----------|
| Latest (`main`) | Yes |
| Older commits | No |

## Reporting a Vulnerability

Please **do not open a public GitHub issue** with details of a vulnerability.

Report it privately using GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability) (the "Report a vulnerability" button on this repository's Security tab). If that option is not available, open a public issue that says only that you have a security concern, with no details, and ask for a private way to share them.

Please include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact

This is a hobby project run by one person, so there is no guaranteed response time, but reports will be read and taken seriously.

---

## Security Posture

### Architecture

Insult Duel is a **static, client-side-only** web page: HTML, CSS and vanilla JavaScript with no build step, no runtime dependencies and no server component.

- **No backend, accounts or database.** There is nothing to log into and no server-side data.
- **No personal data collected.** Player names are typed into the page, held in memory for the current game, and discarded when the page is closed or reloaded. They are not stored or transmitted.
- **No network requests.** The fonts are bundled locally (`fonts/`), and the page loads no third-party scripts, analytics or trackers. The browser smoke test (`npm run test:e2e`) fails if the page requests anything outside the local files.
- **No storage.** The game does not use cookies, `localStorage` or any other persistence.

### Rendering and injection

- Player names and word-bank entries are inserted into the page with `textContent` / `createElement`, never `innerHTML`, so a name such as `<b>x</b>` is shown as text and never interpreted as markup. The smoke test checks this.
- The text and word-bank configuration files (`config/text.js`, `packs/*.js`) are **executable JavaScript**, loaded as classic scripts. Only load pack or config files you trust; a malicious pack file could run arbitrary code in the page. They are meant to be edited by whoever deploys the game, not supplied by players.

### Dependencies

The shipped game has **no runtime dependencies**. Development tooling is limited to Node's built-in test runner and, optionally, Python with Playwright for the browser smoke test. The bundled fonts come from the `@fontsource` packages (see `fonts/README.md`).

### Known limitations

- Hosting is up to you. If you deploy the game, serve it over HTTPS.
- If you adapt the game to load packs or text from a server or from user input, you take on the injection and trust issues described above.

---

## License

The code is licensed under the [MIT License](./LICENSE). The bundled fonts are under the SIL Open Font License (`fonts/OFL.txt`). The word lists are drawn from various sources; see the README.
