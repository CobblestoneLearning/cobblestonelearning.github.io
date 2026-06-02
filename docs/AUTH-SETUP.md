# Sign-in with GitHub — setup

The hub is **public by default** (shows public repos). When a team member clicks **Sign in with
GitHub**, the page uses *their own* GitHub token to also show the **private** repositories their
account can see — no shared secret, each person sees only what they're entitled to.

Because GitHub Pages is static (no server) and this repo is public, a token can **never** live in
`index.html`. The OAuth flow therefore needs one tiny backend whose only job is to swap the login
`code` for a token using the OAuth App **client secret**. That's `auth/worker.js`.

```
Browser (public hub)  ──click "Sign in"──▶  GitHub authorize (popup)
        ▲                                          │
        │ access_token                             ▼  redirect with ?code
   auth/worker.js  ◀──POST {code}──  callback.html ──postMessage(code)──▶ hub
   (holds secret)
```

You only need to do this **once**. Two manual steps (only the org owner can do them), then fill in
two values.

---

## Step 1 — Register a GitHub OAuth App

1. Go to **https://github.com/organizations/CobblestoneLearning/settings/applications** →
   **New OAuth App** (or *Settings → Developer settings → OAuth Apps* on a personal account).
2. Fill in:
   - **Application name:** `Cobblestone Repository Hub`
   - **Homepage URL:** `https://cobblestonelearning.github.io/`
   - **Authorization callback URL:** `https://cobblestonelearning.github.io/callback.html`
3. Create it. Copy the **Client ID**. Click **Generate a new client secret** and copy the secret
   (you'll only see it once).

> Scope note: to list and read **private** repos the app requests the classic `repo` scope, which
> is broad (read/write to repos the user can access). For least privilege, you can instead create a
> **GitHub App** with fine-grained, read-only `Contents` + `Metadata` permissions installed on the
> org, and issue user-to-server tokens — same frontend, stricter access. Start with the OAuth App;
> upgrade later if you want.

## Step 2 — Deploy the token-exchange worker (Cloudflare Workers, free)

```bash
cd auth
npm install -g wrangler         # if not already installed
wrangler login                  # opens browser, log in to Cloudflare

# set the non-secret values in wrangler.toml: GITHUB_CLIENT_ID and ALLOWED_ORIGIN
# then store the secret (never commit it):
wrangler secret put GITHUB_CLIENT_SECRET     # paste the client secret from Step 1

wrangler deploy
```

`wrangler deploy` prints the worker URL, e.g. `https://cobblestone-oauth.<you>.workers.dev`.

> Prefer Netlify/Vercel? The same logic ports to a single serverless function — POST `{code}`,
> exchange with the secret, return `{access_token}`, and lock CORS to the hub origin.

## Step 3 — Point the hub at it

In `index.html`, find the `AUTH_CONFIG` block near the top of the main `<script>` and fill in the
two values (both are safe to be public — the secret stays only in the worker):

```js
var AUTH_CONFIG = {
  clientId:    'Iv1.xxxxxxxxxxxx',                              // from Step 1
  exchangeUrl: 'https://cobblestone-oauth.<you>.workers.dev',   // from Step 2
  scope: 'read:org repo',
  org: 'CobblestoneLearning'
};
```

Commit and push. GitHub Pages redeploys, and the **Sign in with GitHub** button goes live. Until
these two values are set, the button shows a friendly "not configured yet" message and the hub
stays in public-only mode.

---

## Security notes

- The **client secret** lives only as a Cloudflare secret in the worker — never in the repo or the
  page. (If a secret is ever committed to this public repo, GitHub will auto-revoke it; rotate it.)
- The worker only answers `POST` from `ALLOWED_ORIGIN`; all other origins/methods are rejected.
- The user's access token is held **in memory only** (a JS variable). It is not written to
  `localStorage`/`sessionStorage`, so it's gone on reload/tab-close — a reload simply re-runs the
  (near-instant) popup since GitHub remembers the authorization.
- Sign-out clears the in-memory token and returns the hub to the public view.
- A random `state` value is generated per login and verified on return (CSRF protection), and the
  `postMessage` handshake checks the message origin.
