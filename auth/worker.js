// Cobblestone Repository Hub — GitHub OAuth token-exchange worker.
//
// Why this exists: the hub is a static, public GitHub Pages site, so it cannot hold a
// secret. GitHub's OAuth web flow requires the *client secret* to swap the login `code`
// for an access token. This tiny worker holds that secret server-side and does ONLY the
// exchange. It never stores or logs tokens, and only answers requests from our origin.
//
// Deploy: see ../docs/AUTH-SETUP.md
// Required config (set with wrangler):
//   wrangler secret put GITHUB_CLIENT_SECRET     <- the OAuth App client secret (secret!)
//   [vars] GITHUB_CLIENT_ID = "..."              <- the OAuth App client id (not secret)
//   [vars] ALLOWED_ORIGIN  = "https://cobblestonelearning.github.io"

export default {
  async fetch(request, env) {
    const allowed = (env.ALLOWED_ORIGIN || '').replace(/\/$/, '');
    const origin = request.headers.get('Origin') || '';
    const originOk = !!allowed && origin === allowed;

    const cors = {
      'Access-Control-Allow-Origin': originOk ? origin : allowed,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };
    const json = (obj, status) =>
      new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
    if (!originOk) return json({ error: 'forbidden_origin' }, 403);

    // Body-size guard: the payload is only ever {"code":"..."} — reject anything large.
    const len = parseInt(request.headers.get('Content-Length') || '0', 10);
    if (len > 2048) return json({ error: 'payload_too_large' }, 413);

    let body;
    try { body = await request.json(); } catch { return json({ error: 'invalid_json' }, 400); }
    const code = body && body.code;
    if (!code || typeof code !== 'string') return json({ error: 'missing_code' }, 400);

    let res;
    try {
      res = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'cobblestone-repo-hub',
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
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
