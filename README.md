# Cobblestone Learning — Landing Page

The public landing page for **Cobblestone Learning** — *Learning. Creativity. Trust.*

🌐 **Live:** https://cobblestonelearning.github.io/

Your trusted partner in eLearning design: learning designers, eLearning developers, and
multimedia experts creating award-winning online courses that develop skills, change
behaviour, and raise awareness.

## About this site

A single, self-contained `index.html` deployed via **GitHub Pages** (serves `main` at the
repo root — every push redeploys automatically). No build step or dependencies to install.

- **Brand-aligned design** — Montserrat type, the Cobblestone cyan/blue palette (`#27AAE1` →
  `#0074B4`), the cobblestone-tile/mortarboard logo, gradient hero, glassmorphism cards, and
  scroll-reveal motion (with `prefers-reduced-motion` support).
- **Responsive & accessible** — mobile-first (360 px → 1440 px+), semantic landmarks, alt
  text, keyboard-operable modal with focus management, and ARIA live regions.
- **Live GitHub feed** — the *Projects* and *Gists* sections pull from the
  [`cobblestonelearning`](https://github.com/cobblestonelearning) org via the public GitHub
  REST API, with a modal for repo details, file tree, README, and source preview. Falls back
  gracefully if the unauthenticated API is rate-limited.
- **Third-party libs (all via CDN):** Tailwind CSS, Prism.js (syntax highlighting), and
  clipboard.js — the pinned versions carry Subresource Integrity hashes.

## Local preview

Open `index.html` directly in a browser, or serve the folder:

```bash
python3 -m http.server
```

## Contact

Cobblestone Learning · 5 Lombard Street, Dublin 2, Ireland
[info@cobblestonelearning.com](mailto:info@cobblestonelearning.com) · +353 1 908 1582 ·
[www.cobblestonelearning.com](https://www.cobblestonelearning.com)
