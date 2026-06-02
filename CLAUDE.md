# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The Cobblestone Learning public landing page, deployed as a **GitHub Pages site** at the org root (`https://github.com/CobblestoneLearning/cobblestonelearning.github.io`). The entire site is a single self-contained file: `index.html`. There is no build step, no package manager, no test suite, and no server-side code.

## Deploying / previewing

- **Deploy:** commit to `main` and push. GitHub Pages serves `main` automatically — there is no build or CI stage to wait on.
- **Preview locally:** open `index.html` directly in a browser, or serve the folder (e.g. `python3 -m http.server`). It also resolves under the MAMP root at `http://localhost:8888/cobblestonelearning.github.io/`.
- All commits to date are "Update index.html" — keep edits scoped to that file unless adding genuinely new assets.

## Architecture

Everything lives inline in `index.html` (one self-contained file). The only other asset is `cobblestone-logo.png` (the brand mark, decoded from the `cobblestone-brand` skill; referenced relatively as `src="cobblestone-logo.png"`).

- **Styling:** Tailwind via CDN (`cdn.tailwindcss.com`) configured inline with the **Cobblestone brand palette** (cyan `#27AAE1`, blue `#0074B4`, yellow `#FFC20E`, dark `#3D3D3D`, grey, light `#F8F9FB`, border `#E8ECF0`) and a Montserrat `fontWeight` map (300/400/600/700/800). A `<style>` block holds CSS variables (`:root`), the gradient hero / glassmorphism / cobblestone-tile-motif styles, scroll-reveal animations, and the modal. Montserrat is loaded from Google Fonts.
- **Static sections:** sticky white nav (logo sits on white so the dark wordmark stays legible — never put it low-contrast on the gradient), gradient hero with the "Learning. Creativity. Trust." eyebrow + stat row, services grid (6 cards), a contact band, and a dark footer with the full company details. Quote CTAs use `mailto:eoin.oneill@cobblestonelearning.com`; the footer also carries `info@cobblestonelearning.com` + phone.
- **Dynamic sections:** on `DOMContentLoaded`, vanilla JS calls the **public GitHub REST API** (`api.github.com/users/cobblestonelearning/...`) to populate `#repo-cards` and `#gist-cards`. Handlers (`fetchRepoDetails`, `fetchGistDetails`, `fetchFileStructure`, `fetchIndexContent`) lazily load repo metadata, a keyboard-operable file tree, README (Prism), and a sandboxed `index.html` preview into the shared accessible modal (focus trap, Esc/overlay close, focus restore).
- **Third-party libs (all CDN, pinned versions carry SRI `integrity` hashes):** Prism.js 1.27.0 (core + per-language components + line-numbers) and clipboard.js 2.0.10. Tailwind's CDN endpoint is dynamic/unversioned, so it intentionally has **no** SRI hash.

Notes that matter when editing:
- API calls are **unauthenticated** (GitHub's 60 req/hour-per-IP limit). The code shows a branded empty/fallback state when rate-limited rather than leaving the sections blank.
- If you swap a pinned CDN URL, **recompute its SRI hash** (`curl -s URL | openssl dgst -sha512 -binary | openssl base64 -A`) or the browser will block the resource.
- Modal content is injected via `innerHTML` from GitHub API responses; be mindful when touching the rendering code.
- Headless Chrome enforces a ~500 px minimum top-level viewport, so naive `--window-size=390` screenshots crop a 500 px layout and look like overflow. Test true mobile via device emulation or an iframe-constrained width.

## Branding

This is customer-facing Cobblestone Learning output. Before changing colors, typography, logos, or layout, invoke the **`cobblestone-brand`** skill for the authoritative brand assets rather than guessing.
