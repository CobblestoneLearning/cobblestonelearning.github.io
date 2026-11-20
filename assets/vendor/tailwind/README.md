# Tailwind CSS 3.4.17, Play CDN build (vendored)

`tailwindcss-3.4.17.js` is the Tailwind CSS "Play CDN" script, version 3.4.17, copied from
https://cdn.tailwindcss.com/3.4.17 on 2026-11-20. It builds the page's styles in the browser from
the `tailwind.config` set inline in each page.

**Why it is here and not on the CDN:** `index.html` and `manage.html` hold a GitHub sign-in token.
cdn.tailwindcss.com sends no CORS header, so a script from it cannot carry an SRI hash, and a
compromise of that CDN could read the token. A pinned copy served from this site cannot change
under us.

- SHA-384: `sha384-igm5BeiBt36UU4gqwWS7imYmelpTsZlQ45FZf+XBn9MuJbn4nQr7yx1yFydocC/K`
- To update: download the new version's file from https://cdn.tailwindcss.com/<version>, check it,
  replace this file, update the version in its name and in both pages, and update this README.
  Never point a page back at the unversioned CDN URL.

## Licence

MIT License. Copyright (c) Tailwind Labs, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
associated documentation files (the "Software"), to deal in the Software without restriction,
including without limitation the rights to use, copy, modify, merge, publish, distribute,
sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or
substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES
OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
