# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An **internal GitHub repository hub** for the Cobblestone Learning team — it organises, showcases, and helps staff browse/reuse the [`cobblestonelearning`](https://github.com/cobblestonelearning) GitHub org's repositories and gists. Deployed as a **GitHub Pages site** at the org root (`https://github.com/CobblestoneLearning/cobblestonelearning.github.io`, live at `https://cobblestonelearning.github.io/`). The entire site is a single self-contained file: `index.html`. There is no build step, no package manager, no test suite, and no server-side code.

**It is NOT a marketing site.** Do not add sales/marketing copy (services, "request a quote", a sales contact band, etc.). The repos + gists and the tools to browse/reuse them are the point. It's still Cobblestone-branded (logo, palette, Montserrat) — keep the identity, not marketing.

## Deploying / previewing

- **Deploy:** commit to `main` and push. GitHub Pages serves `main` automatically — there is no build or CI stage to wait on.
- **Preview locally:** open `index.html` directly in a browser, or serve the folder (e.g. `python3 -m http.server`). It also resolves under the MAMP root at `http://localhost:8888/cobblestonelearning.github.io/`.
- All commits to date are "Update index.html" — keep edits scoped to that file unless adding genuinely new assets.

## Architecture

The hub is `index.html` (one self-contained file). Alongside it the repo holds `cobblestone-logo.png` (brand mark, referenced as `src="cobblestone-logo.png"`), `callback.html` (OAuth popup callback), `auth/` (a Cloudflare Worker for the OAuth token exchange), and `docs/AUTH-SETUP.md` (sign-in setup). See **Authentication** below.

- **Styling:** Tailwind via CDN (`cdn.tailwindcss.com`) configured inline with the **Cobblestone brand palette** (cyan `#27AAE1`, blue `#0074B4`, yellow `#FFC20E`, dark `#3D3D3D`, grey, light `#F8F9FB`, border `#E8ECF0`). Note: for white-on-gradient buttons/chips the gradient is darkened to `#0074B4→#005C90` for AA contrast, and load-bearing muted text uses `#6B6B6B` (not `#939393`) to pass AA. A `<style>` block holds CSS variables (`:root`), card/hover styles, language-dot colours, skeleton loaders, and the modal. Montserrat from Google Fonts.
- **Layout:** white sticky header (logo on white so the dark wordmark stays legible) + org link; a live **stat bar** (repo count, languages, last-updated, published Pages — computed from the API, no vanity zeros); a sticky **controls bar** (a **Staff / Developer view toggle**, live search, dynamic filter chips, sort, forks/archived toggle) offset to the JS-measured `--header-h`; the **repo area** (`#repo-cards`); a **gists** section; and a minimal footer (`Internal repository hub · © 2026 Cobblestone Learning`, with the "Learning. Creativity. Trust." signature once).
- **Two view modes (`VIEW` global, persisted to `localStorage['cb_view']`; default `staff`):**
  - **Staff view** — for non-technical staff. Repos are grouped into purpose **categories** with plain-language summaries; cards lead with an **"Open the tool"** action plus an **"Open on GitHub"** link, and a **"Works with"** chip row showing the plugins/services each tool integrates with. Chip rows show **category** chips plus a secondary **"Works with"** (integration) filter; the Sort control is hidden.
  - **Developer view** — flat grid (`renderRepos`/`buildRepoCard`), **language** chips, Sort, and the code Explorer (clone / file tree / `index.html` preview / README source) reached via **"Code & files"**.
  - **Shared document modal (`showRepoDocs`).** Opening any project shows two rendered Markdown docs with a toggle: **`CLREADME.md`** (Staff notes) is the default in Staff view, **`README.md`** is the default in Developer view. Markdown is rendered to sanitized HTML via GitHub's markup endpoints (`fetchRenderedReadme` uses the readme `Accept: application/vnd.github.html` media type; `fetchRenderedCLReadme` fetches the raw file then POSTs to `/markdown`) and styled by the `.doc-body` CSS (Cobblestone brand). A missing `CLREADME.md` shows an "add staff notes" empty state linking to GitHub's new-file page. Developer view adds a **Code & files** button → `showRepoExplore` (the old explorer), which has a **Back to overview** button.
  - `applyFilters()` branches on `VIEW`; `renderChips()` builds `buildCategoryChips` + `buildIntegrationChips` (staff) or `buildLangChips` (dev); the delegated chip handler (`wireChipRow`, bound to both `#lang-filter` and `#integration-filter`) reads `data-cat`, `data-lang` **or** `data-integration`. `localStorage` holds only the view pref — **never** the OAuth token.
- **`CLREADME.md` convention.** Every Cobblestone repo should carry a `CLREADME.md` — a short, plain-language, staff-facing doc (what the tool is, how to use it, who to ask, plus a "Shared notes" area for the team to leave messages to each other). It is the default doc in Staff view. Keep it friendly and on-brand (invoke the `cobblestone-brand` skill); the hub renders it with brand styling.
- **Purpose categories (hybrid source).** `CATEGORIES` (ordered: authoring, reporting, translation, tools, web, other) defines the on-page sections. `categoryForRepo(repo)` resolves a repo's category by: (1) a GitHub repo **topic** matching a category id or `cat-<id>`/`category-<id>`; (2) the curated **`CURATED`** map (repo-name → `{category, summary, integrations}`); (3) the `other` bucket. `integrations` is an array of plugin/service names (e.g. `['LearnDash','DeepL']`) shown as the "Works with" chips and used by the integration filter + staff search. `demo` is the path to a self-contained HTML demo file (e.g. `cobblestone_quiz_comparator.html`); when set, an **"Open demo"** action appears on the staff card + doc modal and `openDemo()` fetches that file through the **authenticated** GitHub Contents API and renders it in a sandboxed `<iframe srcdoc>`. **This is the privacy model for demos** — a private repo's demo only loads for a signed-in user with access (404 otherwise); never enable GitHub Pages on a private repo (Pages is public and would expose it). **When you add a project:** set a `cat-<id>` topic on the repo on GitHub *or* add a line to `CURATED`. Summaries are plain/factual (not marketing — see the no-marketing rule above).
- **Dynamic behaviour:** on `DOMContentLoaded`, vanilla JS calls the **public GitHub REST API** (`api.github.com/users/cobblestonelearning/...`) to populate `#repo-cards` and `#gist-cards`, then drives client-side search/filter/sort (result counts announced via a debounced `aria-live` status). Repo cards carry a copy-`git clone` button. Handlers (`fetchRepoDetails`, `fetchGistDetails`, `fetchFileStructure`, `fetchIndexContent`) lazily load repo meta, the clone command, a keyboard-operable file tree (`role=tree/treeitem`), README (single `Prism.highlightAllUnder` pass over escaped source — do **not** re-introduce manual `Prism.highlight()` double-escaping), and a sandboxed `index.html` preview into the shared accessible modal (focus trap, Esc/overlay close, focus restore).
- Because the org is small (stars/forks all 0, topics/licenses usually empty), the UI deliberately leads with description/language/updated-ago/size/Pages-badge — **don't** rebuild it around stars/forks.
- **Third-party libs (all CDN, pinned versions carry SRI `integrity` hashes):** Prism.js 1.27.0 (core + per-language components + line-numbers) and clipboard.js 2.0.10. Tailwind's CDN endpoint is dynamic/unversioned, so it intentionally has **no** SRI hash.

Notes that matter when editing:
- API calls are **unauthenticated** (GitHub's 60 req/hour-per-IP limit). The code shows a branded empty/fallback state when rate-limited rather than leaving the sections blank.
- If you swap a pinned CDN URL, **recompute its SRI hash** (`curl -s URL | openssl dgst -sha512 -binary | openssl base64 -A`) or the browser will block the resource.
- Modal content is injected via `innerHTML` from GitHub API responses; be mindful when touching the rendering code.
- Headless Chrome enforces a ~500 px minimum top-level viewport, so naive `--window-size=390` screenshots crop a 500 px layout and look like overflow. Test true mobile via device emulation or an iframe-constrained width.

## Authentication (Sign in with GitHub)

Public by default; signing in additionally surfaces private repos the viewer can access.

- **`CobblestoneLearning` is a personal USER account, not an Organization.** List repos via `/users/cobblestonelearning/repos` (public) and, when signed in, merge in `/user/repos?visibility=private&affiliation=…` filtered to `cobblestonelearning`-owned + de-duped. **Never** call `/orgs/CobblestoneLearning/...` — it 404s. A private-fetch failure must not break the public list.
- **Flow:** OAuth web flow via popup. `AUTH_CONFIG` (top of the main `<script>`) holds the public `clientId` + the worker `exchangeUrl` (both safe to commit). The popup redirects to `callback.html`, which `postMessage`s the `code` back (origin-checked + `state` CSRF check); the page POSTs the code to the Cloudflare Worker, which holds the **client secret** and returns the access token.
- **Backend:** `auth/worker.js` (+ `auth/wrangler.toml`) — does ONLY the code→token exchange; CORS locked to the Pages origin; secret set via `wrangler secret put GITHUB_CLIENT_SECRET` (never in the repo). One-time setup: `docs/AUTH-SETUP.md`.
- **Token handling:** the user token lives **in memory only** (`ghToken`) — never `localStorage`/`sessionStorage`. All GitHub calls go through `ghFetch`, which adds the auth header when signed in. The classic `repo` scope is broad; a read-only GitHub App is the least-privilege upgrade.
- **Never** put a token/secret in `index.html` — this is a public repo (GitHub secret-scanning auto-revokes committed secrets).

## Branding

This is Cobblestone-branded output (internal-facing). Before changing colors, typography, logos, or layout, invoke the **`cobblestone-brand`** skill for the authoritative brand assets rather than guessing.
