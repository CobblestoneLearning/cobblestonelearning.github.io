# Cobblestone Learning — Repository Hub

An internal hub for the Cobblestone Learning team to **organise, showcase, and explore the
[`cobblestonelearning`](https://github.com/cobblestonelearning) GitHub organisation** — find a
repo, read its code, preview its live page, and copy a clone command in one click.

🌐 **Live:** https://cobblestonelearning.github.io/

## What it does

A single, self-contained `index.html` deployed via **GitHub Pages** (serves `main` at the repo
root — every push redeploys automatically). No build step or dependencies.

- **Live org overview** — a stat bar (repository count, languages, last update, published Pages)
  computed from the GitHub API.
- **Search, filter & sort** — instant search across name/description/topics, dynamic
  language-filter chips, sort by recently-updated / name / size, and a forks-&-archived toggle.
- **Rich repo cards** — description, language, "updated X ago", size, topic pills, a **Live**
  badge for Pages-enabled repos, and a one-click **copy `git clone …`** button.
- **Explore modal** — read the README (rendered), browse a keyboard-operable file tree, preview a
  repo's `index.html`, and grab the clone command without leaving the page.
- **Gists** — the org's gists with syntax-highlighted file previews and copy-to-clipboard.
- **Resilient** — skeleton loaders and a clear fallback if the unauthenticated GitHub API is
  rate-limited (60 requests/hour per visitor IP).

Built with vanilla JS + Tailwind, Prism.js, and clipboard.js (all via CDN; the pinned libraries
carry Subresource Integrity hashes). Cobblestone-branded (Montserrat, the cyan/blue palette, and
the logo), responsive 360 px → 1440 px+, and accessible (keyboard, ARIA, reduced-motion).

## Local preview

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server
```

*Learning. Creativity. Trust.*
