// Cobblestone Repository Hub — GitHub OAuth token-exchange worker.
//
// Why this exists: the hub is a static, public GitHub Pages site, so it cannot hold a
// secret. GitHub's OAuth web flow requires the *client secret* to swap the login `code`
// for an access token. This tiny worker holds that secret server-side. It never stores or
// logs tokens, and only answers requests from our origin.
//
//   POST /         {code, code_verifier?}  ->  {access_token, token_type, scope}
//   POST /revoke   {access_token}          ->  204   (signing out cancels the token at GitHub)
//
// Deploy: see ../docs/AUTH-SETUP.md
// Required config (set with wrangler):
//   wrangler secret put GITHUB_CLIENT_SECRET     <- the OAuth App client secret (secret!)
//   [vars] GITHUB_CLIENT_ID = "..."              <- the OAuth App client id (not secret)
//   [vars] ALLOWED_ORIGIN  = "https://cobblestonelearning.github.io"
//   [vars] REDIRECT_URI    = "https://cobblestonelearning.github.io/callback.html"  (optional:
//          binds the exchange to the callback the sign-in used)
//
// The Origin check stops other websites using this from a browser; it is not
// authentication (any non-browser client can send an Origin header). A code is single-use and
// short-lived, and PKCE (code_verifier) binds it to the page that started the sign-in.

const CODE_RE = /^[A-Za-z0-9_-]{1,64}$/;
const VERIFIER_RE = /^[A-Za-z0-9._~-]{43,128}$/;
const TOKEN_RE = /^[A-Za-z0-9_]{20,255}$/;

export default {
  async fetch(request, env) {
    const allowed = (env.ALLOWED_ORIGIN || '').replace(/\/$/, '');
    const origin = request.headers.get('Origin') || '';
    const originOk = !!allowed && origin === allowed;
    const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';

    const cors = {
      'Access-Control-Allow-Origin': originOk ? origin : allowed,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
      'Cache-Control': 'no-store',                 // never cache a token response (RFC 6749 5.1)
    };
    const json = (obj, status) =>
      new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
    if (!originOk) return json({ error: 'forbidden_origin' }, 403);
    if (path !== '/' && path !== '/revoke') return json({ error: 'not_found' }, 404);

    // Body-size guard on the real body, not the Content-Length header (a chunked body has none).
    let raw;
    try { raw = await request.text(); } catch { return json({ error: 'invalid_body' }, 400); }
    if (raw.length > 2048) return json({ error: 'payload_too_large' }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return json({ error: 'invalid_json' }, 400); }

    if (path === '/revoke') return revoke(body, env, cors, json);

    const code = body && body.code;
    if (typeof code !== 'string' || !CODE_RE.test(code)) return json({ error: 'missing_code' }, 400);
    const exchange = { client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code };
    if (body.code_verifier !== undefined) {
      if (typeof body.code_verifier !== 'string' || !VERIFIER_RE.test(body.code_verifier)) return json({ error: 'invalid_code_verifier' }, 400);
      exchange.code_verifier = body.code_verifier;
    }
    if (env.REDIRECT_URI) exchange.redirect_uri = env.REDIRECT_URI;

    let res;
    try {
      res = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'cobblestone-repo-hub' },
        body: JSON.stringify(exchange),
      });
    } catch {
      return json({ error: 'exchange_unreachable' }, 502);
    }

    const data = await res.json().catch(() => ({}));
    if (!data || !data.access_token) {
      return json({ error: (data && data.error) || 'exchange_failed', error_description: data && data.error_description }, 502);
    }

    // Return only what the browser needs. Do NOT log the token anywhere.
    return json({ access_token: data.access_token, token_type: data.token_type, scope: data.scope }, 200);
  },
};

// Cancel one access token at GitHub. Harmless to expose: the caller must already hold the
// token, and this can only ever make it stop working.
async function revoke(body, env, cors, json) {
  const token = body && body.access_token;
  if (typeof token !== 'string' || !TOKEN_RE.test(token)) return json({ error: 'missing_token' }, 400);
  try {
    const res = await fetch('https://api.github.com/applications/' + encodeURIComponent(env.GITHUB_CLIENT_ID) + '/token', {
      method: 'DELETE',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': 'Basic ' + btoa(env.GITHUB_CLIENT_ID + ':' + env.GITHUB_CLIENT_SECRET),
        'Content-Type': 'application/json',
        'User-Agent': 'cobblestone-repo-hub',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ access_token: token }),
    });
    // 204: revoked. 404: already gone. Either way the token no longer works.
    if (res.status === 204 || res.status === 404) return new Response(null, { status: 204, headers: cors });
    return json({ error: 'revoke_failed', status: res.status }, 502);
  } catch {
    return json({ error: 'revoke_unreachable' }, 502);
  }
}
