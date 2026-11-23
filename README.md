# Cobblestone Learning: Repository Hub

An internal hub for the Cobblestone Learning team to **find, read and reuse the projects in the
[`CobblestoneLearning`](https://github.com/CobblestoneLearning) GitHub organisation**: find a
repo, read its staff notes or README, open its demo, browse its code, and copy a clone command.

**Live:** https://cobblestonelearning.github.io/

## What is in this repo

| File | What it is |
|---|---|
| `index.html` | The hub. Self-contained: vanilla JS, Tailwind, Prism.js and clipboard.js from CDNs (the pinned libraries carry SRI hashes). No build step. |
| `manage.html` | **Manage**: a page for organisation owners and managers (people, teams, access to each repo, recent activity and metrics). |
| `dashboard/index.html` | A copy of the single-screen visual dashboard ([`cobblestone-gh-dashboard`](https://github.com/CobblestoneLearning/cobblestone-gh-dashboard)). |
| `callback.html` | The sign-in popup's landing page; it hands the login code back to the page that opened it. |
| `bryanslog/index.html` | A forwarder for the short address https://cobblestonelearning.github.io/bryanslog: it sends the browser to the hub's `#/p/bryansLog?launch=demo`. It holds nothing from the log; the hub opens the log only for a signed-in viewer who can read the private repo. |
| `auth/` | The Cloudflare Worker that swaps the login code for a token (it holds the OAuth client secret). |
| `docs/AUTH-SETUP.md`, `.github/setup-auth.py` | One-time sign-in setup. |
| `CLREADME.md` | Plain-language staff notes for this repo. |

GitHub Pages serves `main` from the repo root, so every push to `main` redeploys.

## What the hub does

- **Staff view** (the default): projects grouped by purpose (authoring, reporting, translation,
  tools, web, other) from each repo's `cat-*` topic, with plain-language summaries, "Works with"
  filters and an **Open demo** button where a project has one. **Details** opens the repo's
  `CLREADME.md` (staff notes) and its `README.md`.
- **Developer view**: a flat grid with language filters, sort, and **Code & files** (file tree,
  README source, `index.html` preview, clone command).
- **Sign in with GitHub** (optional). Signed out, only the organisation's public repos show.
  Signed in, the hub shows every repo your account can see in the organisation (all members can
  read all of them), and adds:
  - an **Organisation / Mine** switch: *Mine* is your own repos plus organisation repos you have
    pushed to recently;
  - an access badge on each card (Admin, Maintain, Write, Triage or Read);
  - your own gists (organisations cannot own gists; the old shared ones are in the private repo
    `csl-gists`);
  - a **Manage** link, for organisation owners and members of the `managers` team.
- **Direct demo addresses:** `#/p/<repo>?launch=demo` opens that project's demo straight away,
  filling the window. Signed out, the page asks you to sign in first and opens the demo once you
  have. Closing the demo leaves you on the project page.
- Every repo list is fetched page by page (the organisation has more than 100 repos).
- Skeleton loaders, and a clear message if the GitHub API rate limit is hit (60 requests an hour
  per visitor when signed out).

Cobblestone-branded (Montserrat, the cyan and blue palette, the logo), responsive and accessible
(keyboard, ARIA, reduced motion).

## Sign-in

The sign-in OAuth app ("Cobblestone Repository Hub") is **owned by the organisation**. That matters:
the organisation restricts third-party apps, and only apps it owns get through. On the hub the
token is kept in `sessionStorage` for that tab only; on `manage.html` it is kept in memory only.
It is never committed. Setup and security notes are in [`docs/AUTH-SETUP.md`](docs/AUTH-SETUP.md);
the one-command helper is `python3 .github/setup-auth.py`.

## Local preview

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server
```

Sign-in only works from `https://cobblestonelearning.github.io` (the worker accepts that origin only).

*Learning. Creativity. Trust.*
