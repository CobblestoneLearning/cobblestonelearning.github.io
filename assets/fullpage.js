/* Full-window viewer for one private project page, at its own short address (such as /lmsplan/).

   The page that loads this script names the project on <body>:
     data-repo="cobblestone-lms-plan"   the private repo in the organisation
     data-path="index.html"             the self-contained HTML file in that repo
     data-name="the LMS plan"           how the messages name it
     data-hash-attr="data-cbl-hash"     optional: an attribute on <html> that the project's own boot script reads to
                                        open at a place, so /lmsplan/#s-levels opens that section

   What it does: the viewer signs in with GitHub (the hub's own OAuth app and popup, so the sign-in is shared with the
   hub in the same tab), fetches the file through the authenticated API with the viewer's own token, and shows it in a
   frame that fills the window. A viewer without access to the repo gets nothing from the project: GitHub refuses the
   file. This public repo holds no project content.

   SECURITY (the same rules as the hub's demo viewer in index.html):
   - The frame is sandboxed WITHOUT allow-same-origin. A srcdoc frame with it would run as this page and could read the
     sign-in token (scope: repo). Without it, the project runs in its own sealed-off origin.
   - The token lives in memory and in sessionStorage (cb_gh_token, the key the hub uses), so it ends when the tab
     closes. Never in localStorage.
   - The page that loads this hides itself when framed (clickjacking), as the hub does.

   Storage: a sealed-off frame cannot use localStorage. A small script put first in the project's <head> gives it a
   stand-in, seeded from this page's localStorage (one JSON value under cb_page_store:<repo>), and sends every change
   back here with postMessage, so answers and demo changes are still there the next time. Only messages from the
   project's frame (or frames inside it) are accepted, and only string keys and values. sessionStorage stays in
   memory, as it would in a new tab. */
(function () {
  'use strict';

  var AUTH = { clientId: 'Ov23liHyPVBdzXg8TOYS', exchangeUrl: 'https://cobblestone-oauth.cobblestonelearning.workers.dev', scope: 'read:org repo' };
  var ORG = 'CobblestoneLearning';
  var STORE_LIMIT = 3 * 1024 * 1024;   /* characters; leaves room in the origin's localStorage for the hub */

  var body = document.body;
  var REPO = body.getAttribute('data-repo');
  var PATH = body.getAttribute('data-path') || 'index.html';
  var NAME = body.getAttribute('data-name') || REPO;
  var HASH_ATTR = body.getAttribute('data-hash-attr') || '';
  var STORE_KEY = 'cb_page_store:' + String(REPO).toLowerCase();

  var token = null, popup = null, verifier = null, frame = null;
  var gate = document.getElementById('gate');

  /* ---------------- Messages on the page ---------------- */
  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text != null) e.textContent = text;
    return e;
  }
  function show(opts) {
    gate.hidden = false;
    var box = gate.querySelector('.gate-box'), msg = gate.querySelector('.gate-msg');
    box.setAttribute('aria-busy', opts.busy ? 'true' : 'false');
    gate.querySelector('.gate-spin').hidden = !opts.busy;
    msg.innerHTML = '';
    if (opts.title) msg.appendChild(el('h1', null, opts.title));
    (opts.lines || []).forEach(function (t) { msg.appendChild(el('p', null, t)); });
    if (opts.button) {
      var b = el('button', { type: 'button', 'class': 'gate-btn' }, opts.button.label);
      b.addEventListener('click', opts.button.onClick);
      msg.appendChild(b);
      if (opts.focus) setTimeout(function () { b.focus(); }, 0);
    }
    if (opts.link) msg.appendChild(el('p', { 'class': 'gate-link' })).appendChild(el('a', { href: opts.link.href }, opts.link.label));
    if (opts.note) msg.appendChild(el('p', { 'class': 'gate-note' }, opts.note));
  }
  function askSignIn(lines) {
    show({ title: body.getAttribute('data-title') || document.title,
      lines: lines || ['This page is private. Sign in with a GitHub account that has access to ' + NAME + '.'],
      button: { label: 'Sign in with GitHub', onClick: signIn }, focus: true,
      note: 'Your sign-in lasts until you close this tab.' });
  }

  /* ---------------- Sign-in (the hub's flow: popup, state, PKCE, the hub's worker) ---------------- */
  function rand(n) { var b = new Uint8Array(n); crypto.getRandomValues(b); return b; }
  function hex(b) { return Array.prototype.map.call(b, function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  function b64url(bytes) { return btoa(String.fromCharCode.apply(null, Array.prototype.slice.call(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }

  function signIn() {
    var state = hex(rand(16));
    try { sessionStorage.setItem('cb_oauth_state', state); } catch (e) {}
    verifier = b64url(rand(32));
    var w = 600, h = 720;
    var left = (window.screenLeft != null ? window.screenLeft : window.screenX) + Math.max(0, (window.innerWidth - w) / 2);
    var top = (window.screenTop != null ? window.screenTop : window.screenY) + Math.max(0, (window.innerHeight - h) / 2);
    popup = window.open('about:blank', 'cobblestone-oauth', 'width=' + w + ',height=' + h + ',left=' + left + ',top=' + top + ',menubar=no,toolbar=no,location=no,status=no');
    if (!popup) {
      try { sessionStorage.removeItem('cb_oauth_state'); } catch (e) {}
      verifier = null;
      askSignIn(['Your browser blocked the sign-in window. Allow pop-ups for this site, then select Sign in with GitHub again.']);
      return;
    }
    show({ busy: true, lines: ['Finish signing in in the GitHub window.'] });
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)).then(function (hash) {
      var url = 'https://github.com/login/oauth/authorize' +
        '?client_id=' + encodeURIComponent(AUTH.clientId) +
        '&redirect_uri=' + encodeURIComponent(location.origin + '/callback.html') +
        '&scope=' + encodeURIComponent(AUTH.scope) +
        '&state=' + encodeURIComponent(state) +
        '&code_challenge=' + encodeURIComponent(b64url(new Uint8Array(hash))) + '&code_challenge_method=S256';
      if (popup && !popup.closed) popup.location = url;
    });
    /* The viewer closed the GitHub window without finishing. */
    var watch = setInterval(function () {
      if (!popup || popup.closed) { clearInterval(watch); if (!token && !frame && verifier) { verifier = null; askSignIn(); } }
    }, 700);
  }

  function onOAuthMessage(e) {
    if (e.origin !== location.origin || !popup || e.source !== popup) return;   /* only the popup this page opened */
    var d = e.data;
    if (!d || d.source !== 'cobblestone-oauth') return;
    var expected = null;
    try { expected = sessionStorage.getItem('cb_oauth_state'); sessionStorage.removeItem('cb_oauth_state'); } catch (e2) {}
    if (popup && !popup.closed) popup.close();
    if (d.error || !d.code || !expected || d.state !== expected) {
      verifier = null;
      askSignIn(['Sign-in did not finish. Select Sign in with GitHub to try again.']);
      return;
    }
    exchange(d.code);
  }

  function exchange(code) {
    show({ busy: true, lines: ['Signing you in…'] });
    var v = verifier; verifier = null;
    fetch(AUTH.exchangeUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code, code_verifier: v }) })
      .then(function (r) { if (!r.ok) throw new Error('exchange ' + r.status); return r.json(); })
      .then(function (data) {
        if (!data || !data.access_token) throw new Error('no token');
        token = data.access_token;
        try { sessionStorage.setItem('cb_gh_token', token); } catch (e) {}
        load();
      })
      .catch(function () { token = null; askSignIn(['Sign-in did not finish. Select Sign in with GitHub to try again.']); });
  }

  function dropToken() { token = null; try { sessionStorage.removeItem('cb_gh_token'); } catch (e) {} }

  /* ---------------- Fetch the page, show it ---------------- */
  function gh(url, accept) {
    return fetch(url, { headers: { 'Authorization': 'Bearer ' + token, 'Accept': accept || 'application/vnd.github+json' }, cache: 'no-store' });
  }

  function load() {
    show({ busy: true, lines: ['Opening ' + NAME + '…'] });
    var api = 'https://api.github.com/repos/' + ORG + '/' + encodeURIComponent(REPO) + '/contents/' + PATH.split('/').map(encodeURIComponent).join('/');
    gh(api, 'application/vnd.github.raw')
      .then(function (r) { if (!r.ok) { var e = new Error('file ' + r.status); e.status = r.status; throw e; } return r.text(); })
      .then(function (t) {
        if (t && t.charAt(0) !== '{') return t;                                    /* raw HTML */
        var j = null; try { j = JSON.parse(t); } catch (e) {}
        if (j && j.download_url) return fetch(j.download_url, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('raw ' + r.status); return r.text(); });
        throw new Error('empty');
      })
      .then(render)
      .catch(function (err) {
        if (err.status === 401) { dropToken(); askSignIn(['Your sign-in has ended. Sign in again to open ' + NAME + '.']); return; }
        if (err.status === 403 || err.status === 404) {
          gh('https://api.github.com/user').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (u) {
            show({ title: 'No access',
              lines: [(u && u.login ? 'The GitHub account ' + u.login + ' does not' : 'Your GitHub account does not') + ' have access to ' + NAME + '.',
                'To get access, ask Bryan Hurley.'],
              link: { href: '../', label: 'Go to the repository hub' } });
          });
          return;
        }
        show({ title: 'We could not open ' + NAME, lines: ['Try again in a few minutes.'],
          button: { label: 'Try again', onClick: load }, focus: true });
      });
  }

  function readStore() {
    try { var o = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); return (o && typeof o === 'object' && !Array.isArray(o)) ? o : {}; }
    catch (e) { return {}; }
  }

  /* Runs first in the project's <head>, inside the sealed frame. */
  function storeShim(seed) {
    var json = JSON.stringify(seed).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, function (c) { return '\\u' + c.charCodeAt(0).toString(16); });
    return '<script>(function(){var seed=' + json + ',own=Object.prototype.hasOwnProperty;' +
      'function post(m){m.source="cb-page-store";try{top.postMessage(m,"*")}catch(e){}}' +
      'function make(keep){var d={};if(keep)for(var k in seed)if(own.call(seed,k))d[k]=String(seed[k]);' +
      'return{get length(){return Object.keys(d).length},key:function(i){return Object.keys(d)[i]||null},' +
      'getItem:function(k){k=String(k);return own.call(d,k)?d[k]:null},' +
      'setItem:function(k,v){k=String(k);v=String(v);d[k]=v;if(keep)post({op:"set",k:k,v:v})},' +
      'removeItem:function(k){k=String(k);delete d[k];if(keep)post({op:"remove",k:k})},' +
      'clear:function(){d={};if(keep)post({op:"clear"})}}}' +
      '["localStorage","sessionStorage"].forEach(function(n){try{window[n].getItem("x")}catch(e){try{Object.defineProperty(window,n,{value:make(n==="localStorage"),configurable:true})}catch(e2){}}})})();<\/script>';
  }

  function render(html) {
    if (!html) throw new Error('empty');
    var hash = location.hash;
    if (HASH_ATTR && /^#[\w\-\/.:%]{1,200}$/.test(hash)) html = html.replace(/<html\b/i, '<html ' + HASH_ATTR + '="' + hash.replace(/"/g, '') + '"');
    var shim = storeShim(readStore()), m = /<head[^>]*>/i.exec(html);
    html = m ? html.slice(0, m.index + m[0].length) + shim + html.slice(m.index + m[0].length) : shim + html;
    frame = document.createElement('iframe');
    frame.className = 'page-frame';
    frame.setAttribute('title', body.getAttribute('data-title') || document.title);
    /* SECURITY: never add allow-same-origin (see the top of this file). allow-popups-to-escape-sandbox lets a link the
       page opens in a new tab load as a normal page (with its own cookies), not as a sealed copy with none: without it
       the log's links to /lmsplan and to private GitHub pages opened signed out and broke (2026-11-24). It does not
       give the frame this page's origin, so the token stays out of reach. */
    frame.setAttribute('sandbox', 'allow-scripts allow-downloads allow-popups allow-popups-to-escape-sandbox allow-modals allow-forms');
    frame.srcdoc = html;
    body.appendChild(frame);
    gate.hidden = true;
    frame.focus();
  }

  /* ---------------- Storage messages from the frame ---------------- */
  function fromFrame(w) {
    for (var i = 0; w && frame && i < 8; i++) {
      if (w === frame.contentWindow) return true;
      var p; try { p = w.parent; } catch (e) { return false; }
      if (!p || p === w) return false;
      w = p;
    }
    return false;
  }
  var queue = [], timer = null, warned = false;
  function flush() {
    timer = null;
    var cur = readStore();
    queue.splice(0).forEach(function (m) {
      if (m.op === 'set') cur[m.k] = m.v;
      else if (m.op === 'remove') delete cur[m.k];
      else if (m.op === 'clear') cur = {};
    });
    var s = JSON.stringify(cur);
    if (s.length > STORE_LIMIT) { if (!warned) { warned = true; console.warn('The page saved more than this viewer keeps; changes since then last only while it is open.'); } return; }
    try { localStorage.setItem(STORE_KEY, s); } catch (e) { if (!warned) { warned = true; console.warn('Could not keep the page’s changes:', e); } }
  }
  function onStoreMessage(e) {
    var m = e.data;
    if (!m || m.source !== 'cb-page-store' || !fromFrame(e.source)) return;
    if (m.op === 'set' ? (typeof m.k !== 'string' || typeof m.v !== 'string') : m.op === 'remove' ? typeof m.k !== 'string' : m.op !== 'clear') return;
    queue.push({ op: m.op, k: m.k, v: m.v });
    if (!timer) timer = setTimeout(flush, 250);
  }
  window.addEventListener('pagehide', function () { if (timer) { clearTimeout(timer); flush(); } });

  /* ---------------- Start ---------------- */
  window.addEventListener('message', function (e) { onOAuthMessage(e); onStoreMessage(e); });
  try { token = sessionStorage.getItem('cb_gh_token'); } catch (e) {}
  if (token) load(); else askSignIn();
})();
