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

Everything lives inline in `index.html` (one self-contained file). The only other asset is `cobblestone-logo.png` (the brand mark, decoded from the `cobblestone-brand` skill; referenced relatively as `src="cobblestone-logo.png"`).

- **Styling:** Tailwind via CDN (`cdn.tailwindcss.com`) configured inline with the **Cobblestone brand palette** (cyan `#27AAE1`, blue `#0074B4`, yellow `#FFC20E`, dark `#3D3D3D`, grey, light `#F8F9FB`, border `#E8ECF0`). Note: for white-on-gradient buttons/chips the gradient is darkened to `#0074B4→#005C90` for AA contrast, and load-bearing muted text uses `#6B6B6B` (not `#939393`) to pass AA. A `<style>` block holds CSS variables (`:root`), card/hover styles, language-dot colours, skeleton loaders, and the modal. Montserrat from Google Fonts.
- **Layout:** white sticky header (logo on white so the dark wordmark stays legible) + org link; a live **stat bar** (repo count, languages, last-updated, published Pages — computed from the API, no vanity zeros); a sticky **controls bar** (live search, dynamic language-filter chips, sort, forks/archived toggle) offset to the JS-measured `--header-h`; a **repo-card grid**; a **gists** section; and a minimal footer (`Internal repository hub · © 2026 Cobblestone Learning`, with the "Learning. Creativity. Trust." signature once).
- **Dynamic behaviour:** on `DOMContentLoaded`, vanilla JS calls the **public GitHub REST API** (`api.github.com/users/cobblestonelearning/...`) to populate `#repo-cards` and `#gist-cards`, then drives client-side search/filter/sort (result counts announced via a debounced `aria-live` status). Repo cards carry a copy-`git clone` button. Handlers (`fetchRepoDetails`, `fetchGistDetails`, `fetchFileStructure`, `fetchIndexContent`) lazily load repo meta, the clone command, a keyboard-operable file tree (`role=tree/treeitem`), README (single `Prism.highlightAllUnder` pass over escaped source — do **not** re-introduce manual `Prism.highlight()` double-escaping), and a sandboxed `index.html` preview into the shared accessible modal (focus trap, Esc/overlay close, focus restore).
- Because the org is small (stars/forks all 0, topics/licenses usually empty), the UI deliberately leads with description/language/updated-ago/size/Pages-badge — **don't** rebuild it around stars/forks.
- **Third-party libs (all CDN, pinned versions carry SRI `integrity` hashes):** Prism.js 1.27.0 (core + per-language components + line-numbers) and clipboard.js 2.0.10. Tailwind's CDN endpoint is dynamic/unversioned, so it intentionally has **no** SRI hash.

Notes that matter when editing:
- API calls are **unauthenticated** (GitHub's 60 req/hour-per-IP limit). The code shows a branded empty/fallback state when rate-limited rather than leaving the sections blank.
- If you swap a pinned CDN URL, **recompute its SRI hash** (`curl -s URL | openssl dgst -sha512 -binary | openssl base64 -A`) or the browser will block the resource.
- Modal content is injected via `innerHTML` from GitHub API responses; be mindful when touching the rendering code.
- Headless Chrome enforces a ~500 px minimum top-level viewport, so naive `--window-size=390` screenshots crop a 500 px layout and look like overflow. Test true mobile via device emulation or an iframe-constrained width.

## Branding

This is Cobblestone-branded output (internal-facing). Before changing colors, typography, logos, or layout, invoke the **`cobblestone-brand`** skill for the authoritative brand assets rather than guessing.
