/* ==========================================================================
   Repository hub: the explorer's views, pages and navigation.
   Routes live in the address (#/map, #/p/<repo> …) so every view and page can
   be shared as a link and the Back button works.
   Relies on hub-data.js (window.HX) and globals from index.html.
   ========================================================================== */
(function () {
  var HX = window.HX, esc = escapeHtml, I = HX.icon;
  var VIEWS = [
    { id: 'discover', label: 'Discover', icon: 'discover' },
    { id: 'city', label: 'City', icon: 'city' },
    { id: 'map', label: 'Map', icon: 'map' },
    { id: 'journey', label: 'Learner journey', icon: 'journey' },
    { id: 'connections', label: 'Connections', icon: 'connections' },
    { id: 'sites', label: 'Sites', icon: 'sitesview' },
    { id: 'new', label: 'What’s new', icon: 'news' },
    { id: 'all', label: 'All projects', icon: 'all' },
    { id: 'glossary', label: 'Words explained', icon: 'glossary' }
  ];
  var VIEW_BY = {}; VIEWS.forEach(function (v) { VIEW_BY[v.id] = v; });
  var LEVELS = [{ id: 'overview', label: 'Overview' }, { id: 'built', label: 'How it’s built' }, { id: 'code', label: 'Code' }];
  HX.q = '';

  /* ---------------- Routing ---------------- */
  function parseRoute() {
    var h = location.hash.replace(/^#\/?/, '');
    var qi = h.indexOf('?'), path = qi >= 0 ? h.slice(0, qi) : h, qs = qi >= 0 ? h.slice(qi + 1) : '';
    var parts = path.split('/').map(function (p) { try { return decodeURIComponent(p); } catch (e) { return p; } });
    var params = {};
    qs.split('&').forEach(function (kv) { if (!kv) return; var p = kv.split('='); try { params[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || '').replace(/\+/g, ' ')); } catch (e) {} });
    var view = parts[0] || 'discover';
    var deep = { p: 1, purpose: 1, 'with': 1, site: 1 };
    if (!VIEW_BY[view] && !deep[view]) view = 'discover';
    return { view: view, arg: parts.slice(1).join('/'), params: params };
  }
  HX.parseRoute = parseRoute;
  function href(path, params) {
    var q = params ? Object.keys(params).filter(function (k) { return params[k] !== '' && params[k] != null; }).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&') : '';
    return '#/' + path + (q ? '?' + q : '');
  }
  HX.href = href;
  HX.go = function (path, params) { var h = href(path, params); if (location.hash === h) HX.render(); else location.hash = h; };
  function pHref(info) { return href('p/' + encodeURIComponent(info.repo.name)); }
  function wHref(name) { return href('with/' + encodeURIComponent(name)); }

  /* ---------------- Small parts ---------------- */
  function purposeTag(info, asLink) {
    var p = HX.PURPOSE[info.purpose], st = HX.STAGE[p.stage];
    var inner = '<span class="hx-dot" style="background:' + st.color + '">' + I(p.icon) + '</span>' + esc(p.label);
    return asLink
      ? '<a class="hx-purpose" style="--hx-c:' + st.ink + '" href="' + href('purpose/' + p.id) + '">' + inner + '</a>'
      : '<span class="hx-purpose" style="--hx-c:' + st.ink + '">' + inner + '</span>';
  }
  function kindPill(info) {
    var k = HX.KINDS[info.kind];
    return '<span class="hx-pill hx-pill-kind" tabindex="0" data-tip-title="' + esc(k.label) + '" data-tip="' + esc(k.explain) + '">' + esc(k.label) + '</span>';
  }
  function withPills(info, max, links) {
    var w = info.works.filter(function (x) { return !HX.EVERYWHERE[x]; });
    var out = w.slice(0, max).map(function (x) {
      var tip = HX.PLATFORMS[x] ? ' data-tip-title="' + esc(x) + '" data-tip="' + esc(HX.PLATFORMS[x]) + '"' : '';
      return links ? '<a class="hx-pill hx-pill-with" href="' + wHref(x) + '"' + tip + '>' + esc(x) + '</a>' : '<span class="hx-pill hx-pill-with"' + tip + '>' + esc(x) + '</span>';
    }).join('');
    if (w.length > max) out += '<span class="hx-pill">+' + (w.length - max) + '</span>';
    return out;
  }
  function langBar(info) {
    if (!info.langs.length) return '';
    var tot = info.langs.reduce(function (s, l) { return s + l.size; }, 0) || 1;
    return '<div class="hx-langbar" role="img" aria-label="' + esc(info.langs.map(function (l) { return l.name + ' ' + Math.round(l.size / tot * 100) + '%'; }).join(', ')) + '">' +
      info.langs.map(function (l) { return '<span style="width:' + (l.size / tot * 100).toFixed(2) + '%;background:' + esc(l.color) + '"></span>'; }).join('') + '</div>';
  }
  function langKey(info, words) {
    var tot = info.langs.reduce(function (s, l) { return s + l.size; }, 0) || 1;
    return '<div class="hx-langkey">' + info.langs.slice(0, 5).map(function (l) {
      return '<span><i style="background:' + esc(l.color) + '"></i>' + esc(l.name) + ' ' + Math.round(l.size / tot * 100) + '%' + (words && HX.LANG_WORDS[l.name] ? ': ' + esc(HX.LANG_WORDS[l.name]) : '') + '</span>';
    }).join('') + '</div>';
  }
  function coverMedia(info) {
    var src = info.cover || (info.gallery[0] && info.gallery[0].src) || '';
    return HX.coverSVG(info) + (src ? '<img alt="" data-hx-img="' + esc(src) + '" data-hx-repo="' + esc(info.repo.name) + '">' : '');
  }
  function card(info, i) {
    var lv = HX.level, st = HX.STAGE[info.stage];
    var tags = '<span></span>';
    if (info.status !== 'live') tags = '<span class="hx-pill hx-pill-status">' + esc(info.status === 'in-progress' ? 'In progress' : info.status.charAt(0).toUpperCase() + info.status.slice(1)) + '</span>';
    var right = '';
    if (info.demo) right += '<span class="hx-pill hx-pill-demo">' + I('play') + 'Demo</span>';
    else if (info.repo.has_pages) right += '<span class="hx-pill hx-pill-site">Live page</span>';
    return '<article class="hx-card reveal" style="--hx-c:' + st.color + ';transition-delay:' + ((i || 0) % 4) * 40 + 'ms">' +
      '<div class="hx-cover">' + coverMedia(info) +
        '<div class="hx-cover-tags">' + tags + '<span style="display:flex;gap:6px">' + right + '</span></div>' +
        (info.demo ? '<button type="button" class="hx-play" data-hx-demo="' + esc(info.repo.name) + '" aria-label="Try the demo of ' + esc(info.name) + '">' + I('play') + '</button>' : '') +
      '</div>' +
      '<div class="hx-card-body">' + purposeTag(info) +
        '<h3 class="hx-card-title"><a class="hx-stretch" href="' + pHref(info) + '">' + esc(info.name) + '</a></h3>' +
        (lv !== 'overview' ? '<div class="hx-card-repo">' + esc(info.repo.name) + '</div>' : '') +
        '<p class="hx-card-tag">' + esc(info.tagline) + '</p>' +
        (lv !== 'overview' ? langBar(info) : '') +
        '<div class="hx-card-foot">' + kindPill(info) + withPills(info, 2) + '<span class="hx-when">' + esc(timeAgo(info.repo.pushed_at || info.repo.updated_at)) + '</span></div>' +
      '</div></article>';
  }
  function row(info, sub) {
    return '<a class="hx-row reveal" href="' + pHref(info) + '">' + HX.rowIcon(info) +
      '<div class="hx-row-main"><div class="hx-row-t">' + esc(info.name) + '</div><div class="hx-row-s">' + esc(sub || info.tagline) + '</div></div>' +
      '<span class="hx-row-go">' + I('right').replace('<svg', '<svg width="18" height="18"') + '</span></a>';
  }
  function cardsAndRows(items, opts) {
    opts = opts || {};
    var big = items.filter(function (i) { return HX.KINDS[i.kind].size > 1; }), small = items.filter(function (i) { return HX.KINDS[i.kind].size === 1; });
    if (HX.level === 'code' && opts.devCards) return '<div class="hx-grid big" data-hx-dev="' + esc(items.map(function (i) { return i.repo.name; }).join(',')) + '"></div>';
    var out = '';
    if (big.length) out += '<div class="hx-grid">' + big.map(card).join('') + '</div>';
    if (small.length) out += (big.length ? '<h3 class="hx-h3" style="margin:26px 0 10px;font-size:14px">' + small.length + ' small ' + (small.length === 1 ? 'piece' : 'pieces') + ' of code <span style="font-weight:600;color:#6B6B6B">(snippets and scripts)</span></h3>' : '') +
      '<div class="hx-rows">' + small.map(function (i) { return row(i); }).join('') + '</div>';
    return out;
  }
  function shelf(items, wide) {
    if (!items.length) return '';
    return '<div class="hx-shelf' + (wide ? ' wide' : '') + '"><button type="button" class="hx-shelf-btn prev" data-hx-shelf="-1" aria-label="Scroll back">' + I('left').replace('<svg', '<svg width="18" height="18"') + '</button>' +
      '<div class="hx-shelf-track">' + items.map(card).join('') + '</div>' +
      '<button type="button" class="hx-shelf-btn next" data-hx-shelf="1" aria-label="Scroll on">' + I('right').replace('<svg', '<svg width="18" height="18"') + '</button></div>';
  }
  function secHead(icon, colour, title, sub, more, moreLabel) {
    return '<div class="hx-sec-head"><div class="hx-sec-title">' + (icon ? '<span class="hx-sec-ico" style="background:' + colour + '">' + I(icon).replace('<svg', '<svg width="19" height="19"') + '</span>' : '') +
      '<div><h2 class="hx-h2">' + esc(title) + '</h2>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + '</div></div>' +
      (more ? '<a class="hx-more" href="' + more + '">' + esc(moreLabel || 'See all') + I('arrow').replace('<svg', '<svg width="14" height="14"') + '</a>' : '') + '</div>';
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function bannerArt(colour, seed, dark) {
    var fake = { repo: { name: 'banner' + seed }, stage: 'learn', kind: 'app', purpose: 'courses', name: '' };
    var svg = HX.coverSVG(fake, { noIcon: true });
    svg = svg.replace(/#27AAE1/gi, colour);
    return '<div class="hx-banner-art" aria-hidden="true">' + svg.replace(/<rect width="320" height="200" fill="url\(#g\d+\)"\/>/, '') + '</div>';
  }
  function needsSignIn() {
    return ghToken ? '' : '<div class="hx-empty" style="margin-bottom:22px"><b>You see only our public projects</b>Sign in with your GitHub account at the top of the page to see every project, with its details and pictures.</div>';
  }
  function skeleton() {
    var s = '<div class="hx-grid">'; for (var i = 0; i < 8; i++) s += '<div class="hx-skel" style="height:290px"></div>'; return s + '</div>';
  }

  /* ---------------- Views ---------------- */
  var R = {};

  R.discover = function (list) {
    var demos = list.filter(function (i) { return i.demo; }).sort(HX.sortFriendly);
    var idx = HX.index(list);
    var platN = Object.keys(idx.plats).filter(function (p) { return !HX.EVERYWHERE[p]; }).length;
    var doors =
      '<a class="hx-door" href="' + href('city') + '" style="--hx-bg:linear-gradient(135deg,#3A318A,#27AAE1)"><span class="hx-door-n">' + list.length + '</span><div class="hx-door-art" aria-hidden="true">' + artCity() + '</div><b>Explore the city</b><span>Every project is a building. Fly over the town, or walk its streets.</span></a>' +
      '<a class="hx-door" href="#hx-try" data-hx-scroll="hx-try" style="--hx-bg:linear-gradient(135deg,#0074B4,#27AAE1)"><span class="hx-door-n">' + demos.length + '</span><div class="hx-door-art" aria-hidden="true">' + artWindows() + '</div><b>Try something</b><span>Open a demo in your browser. Nothing you do there changes a real site.</span></a>' +
      '<a class="hx-door light" href="' + href('journey') + '" style="--hx-bg:linear-gradient(135deg,#FFE9A8,#FFC20E)"><span class="hx-door-n">6</span><div class="hx-door-art" aria-hidden="true">' + artRoad() + '</div><b>Follow a learner</b><span>See what we built for each step, from the first visit to the final report.</span></a>' +
      '<a class="hx-door" href="' + href('connections') + '" style="--hx-bg:linear-gradient(135deg,#1C2A38,#0074B4)"><span class="hx-door-n">' + platN + '</span><div class="hx-door-art" aria-hidden="true">' + artNodes() + '</div><b>See how it connects</b><span>Find every project that works with LearnDash, BuddyBoss, WooCommerce and more.</span></a>' +
      '<a class="hx-door" href="' + href('map') + '" style="--hx-bg:linear-gradient(135deg,#1E7D44,#2D9E5A)"><span class="hx-door-n">' + list.length + '</span><div class="hx-door-art" aria-hidden="true">' + artStones() + '</div><b>Browse the map</b><span>Every project as a stone, grouped by the job it does.</span></a>';
    var out = needsSignIn() + '<section class="hx-sec"><h2 class="hx-h2">Start exploring</h2><p class="hx-lede">Everything Cobblestone Learning has built for its learning sites is here. Pick a way in, then select anything to see more.</p><div class="hx-doors" style="margin-top:16px">' + doors + '</div></section>';
    if (demos.length) out += '<section class="hx-sec" id="hx-try">' + secHead('play', '#0074B4', 'Try it now', 'Demos that open safely in your browser.') + shelf(demos, true) + '</section>';
    var recent = list.slice().sort(HX.recent).slice(0, 12);
    out += '<section class="hx-sec">' + secHead('news', '#2D9E5A', 'New and updated', 'The projects that changed most recently.', href('new'), 'See what’s new') + shelf(recent) + '</section>';
    HX.PURPOSES.forEach(function (p) {
      var items = list.filter(function (i) { return i.purpose === p.id; }).sort(HX.sortFriendly);
      if (!items.length) return;
      var st = HX.STAGE[p.stage];
      out += '<section class="hx-sec">' + secHead(p.icon, st.color, p.label, p.blurb, href('purpose/' + p.id), 'See all ' + items.length) + shelf(items.slice(0, 12)) + '</section>';
    });
    var words = ['snippet', 'plugin', 'theme'].map(function (k) { return { t: HX.KINDS[k].label, k: 'Kind of project', x: HX.KINDS[k].explain, h: href('all', { kind: k }), n: idx.kinds[k] || 0 }; })
      .concat(['LearnDash', 'BuddyBoss', 'SCORM'].map(function (p) { return { t: p, k: 'Platform', x: HX.PLATFORMS[p], h: wHref(p), n: (idx.plats[p] || []).length }; }));
    out += '<section class="hx-sec">' + secHead('glossary', '#5B4FC4', 'Words worth knowing', 'Short explanations of the words you see on this page.', href('glossary'), 'All the words') +
      '<div class="hx-grid">' + words.map(function (w) { return '<div class="hx-term reveal"><span class="hx-term-k">' + esc(w.k) + '</span><b>' + esc(w.t) + '</b><p>' + esc(w.x) + '</p>' + (w.n ? '<a href="' + w.h + '">See ' + plural(w.n, 'project', 'projects') + ' →</a>' : '') + '</div>'; }).join('') + '</div></section>';
    return out;
  };
  function artWindows() {
    var s = '<svg viewBox="0 0 300 190" preserveAspectRatio="xMidYMid slice">';
    [[150, 30, 120, 80, 0], [40, 70, 100, 66, .8], [210, 95, 80, 56, 1.6]].forEach(function (w) {
      s += '<g class="hx-bob" style="animation-delay:-' + w[4] + 's"><rect x="' + w[0] + '" y="' + w[1] + '" width="' + w[2] + '" height="' + w[3] + '" rx="8" fill="rgba(255,255,255,.16)" stroke="rgba(255,255,255,.45)"/><rect x="' + w[0] + '" y="' + w[1] + '" width="' + w[2] + '" height="13" rx="6" fill="rgba(255,255,255,.3)"/><circle cx="' + (w[0] + w[2] / 2) + '" cy="' + (w[1] + w[3] / 2 + 6) + '" r="12" fill="rgba(255,255,255,.85)"/><polygon points="' + (w[0] + w[2] / 2 - 3) + ',' + (w[1] + w[3] / 2) + ' ' + (w[0] + w[2] / 2 + 6) + ',' + (w[1] + w[3] / 2 + 6) + ' ' + (w[0] + w[2] / 2 - 3) + ',' + (w[1] + w[3] / 2 + 12) + '" fill="#0074B4"/></g>';
    });
    return s + '</svg>';
  }
  function artRoad() {
    var pts = [[20, 120], [80, 70], [140, 110], [200, 60], [260, 95]];
    var s = '<svg viewBox="0 0 300 190" preserveAspectRatio="xMidYMid slice"><path d="M20 120 C50 70 60 70 80 70 S120 110 140 110 180 60 200 60 240 95 260 95" fill="none" stroke="rgba(61,61,61,.25)" stroke-width="10" stroke-linecap="round"/><path class="hx-dashmove" d="M20 120 C50 70 60 70 80 70 S120 110 140 110 180 60 200 60 240 95 260 95" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>';
    pts.forEach(function (p, i) { s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="9" fill="#fff" stroke="#3D3D3D" stroke-width="2.5" class="hx-pulse" style="animation-delay:-' + (i * .4) + 's"/>'; });
    return s + '</svg>';
  }
  function artNodes() {
    var hubs = [[90, 70, 16], [200, 55, 12], [230, 125, 14], [130, 130, 10]], s = '<svg viewBox="0 0 300 190" preserveAspectRatio="xMidYMid slice">';
    var dots = [[50, 40], [60, 100], [150, 40], [165, 95], [255, 30], [270, 80], [190, 160], [100, 165], [280, 150], [40, 150]];
    dots.forEach(function (d, i) { var h = hubs[i % hubs.length]; s += '<line x1="' + d[0] + '" y1="' + d[1] + '" x2="' + h[0] + '" y2="' + h[1] + '" stroke="rgba(255,255,255,.3)"/>'; });
    hubs.forEach(function (h, i) { s += '<circle cx="' + h[0] + '" cy="' + h[1] + '" r="' + (h[2] + 8) + '" fill="rgba(39,170,225,.25)" class="hx-pulse" style="animation-delay:-' + i * .6 + 's"/><circle cx="' + h[0] + '" cy="' + h[1] + '" r="' + h[2] + '" fill="#fff"/>'; });
    dots.forEach(function (d) { s += '<circle cx="' + d[0] + '" cy="' + d[1] + '" r="5" fill="#FFC20E"/>'; });
    return s + '</svg>';
  }
  /* Isometric blocks for the City tile: the same idea as the 3D city, drawn flat. */
  function artCity() {
    var u = 17, ox = 150, oy = 20, s = '<svg viewBox="0 0 300 190" preserveAspectRatio="xMidYMid slice">', boxes = [];
    function P(a, b, z) { return (ox + (a - b) * u).toFixed(1) + ',' + (oy + (a + b) * u / 2 - z).toFixed(1); }
    for (var gx = 0; gx < 6; gx++) for (var gy = 0; gy < 6; gy++) {
      var r = HX.rand(31, gx * 6 + gy); if (r < .18) continue;
      boxes.push({ a: gx * 1.25, b: gy * 1.25, h: r > .9 ? 74 : r > .7 ? 40 : r > .45 ? 22 : 11, k: gx * 6 + gy });
    }
    boxes.sort(function (x, y) { return (x.a + x.b) - (y.a + y.b); });
    boxes.forEach(function (o) {
      var a = o.a, b = o.b, h = o.h, tall = h > 60;
      s += '<g' + (tall ? ' class="hx-bob" style="animation-delay:-' + (o.k % 5) + 's"' : '') + '>' +
        '<polygon points="' + P(a, b + 1, 0) + ' ' + P(a + 1, b + 1, 0) + ' ' + P(a + 1, b + 1, h) + ' ' + P(a, b + 1, h) + '" fill="rgba(255,255,255,.5)"/>' +
        '<polygon points="' + P(a + 1, b, 0) + ' ' + P(a + 1, b + 1, 0) + ' ' + P(a + 1, b + 1, h) + ' ' + P(a + 1, b, h) + '" fill="rgba(255,255,255,.3)"/>' +
        '<polygon points="' + P(a, b, h) + ' ' + P(a + 1, b, h) + ' ' + P(a + 1, b + 1, h) + ' ' + P(a, b + 1, h) + '" fill="rgba(255,255,255,.92)"/>' +
        (tall ? '<rect class="hx-pulse" x="' + (ox + (a - b) * u - 1.5).toFixed(1) + '" y="' + (oy + (a + b + 1) * u / 2 - h - 40).toFixed(1) + '" width="3" height="38" rx="1.5" fill="#FFC20E"/>' : '') + '</g>';
    });
    return s + '</svg>';
  }
  function artStones() {
    var s = '<svg viewBox="0 0 300 190" preserveAspectRatio="xMidYMid slice">', k = 0;
    for (var y = 18; y < 180; y += 30) for (var x = 14 + (y % 60 ? 14 : 0); x < 300; x += 30) {
      var r = HX.rand(77, k++), sz = r < .15 ? 24 : r < .5 ? 16 : 10;
      s += '<rect x="' + (x - sz / 2) + '" y="' + (y - sz / 2) + '" width="' + sz + '" height="' + sz + '" rx="' + sz * .3 + '" fill="rgba(255,255,255,' + (r < .15 ? .9 : .28) + ')"' + (r < .15 ? ' class="hx-bob" style="animation-delay:-' + (r * 9).toFixed(1) + 's"' : '') + '/>';
    }
    return s + '</svg>';
  }

  /* ---------------- The City (assets/hub-city.js: three.js, loaded only when opened) ---------------- */
  var city = null, cityHost = null, cityMod = null, cityFail = false, cityLinks = false, cityBusy = false, cityIn = null;
  R.city = function (list) {
    var coarse = matchMedia('(pointer: coarse)').matches;
    return needsSignIn() + '<section class="hx-sec hx-city-sec"><h2 class="hx-h2">The city</h2>' +
      '<p class="hx-lede">Each building is one project. Its shape shows the kind of project, and its height shows how much code it holds. Neighbourhoods group the projects by the job they do, in the order a learner meets them. Select a building to find out more.</p>' +
      '<div class="hx-city" id="hx-city">' +
        '<div class="hx-city-slot" id="hx-city-slot"></div>' +
        '<div class="hx-city-boot" id="hx-city-boot"><span class="hx-city-spin" aria-hidden="true"></span><b>Building the city</b><span>Laying out ' + plural(list.length, 'project', 'projects') + '</span></div>' +
        '<div class="hx-city-top" id="hx-city-top"></div>' +
        '<div class="hx-city-find" id="hx-city-find" role="search">' + I('search') + '<input id="hx-city-q" type="search" autocomplete="off" placeholder="Search the city" aria-label="Search the city: projects, fonts, statues, pictures and files" aria-controls="hx-city-res" aria-expanded="false" value="' + esc(HX.q || '') + '"><div class="hx-city-res" id="hx-city-res" role="listbox" hidden></div></div>' +
        '<div class="hx-city-tours" id="hx-city-tours" role="menu" hidden></div>' +
        '<div class="hx-city-tourbar" id="hx-city-tourbar" aria-live="polite" hidden></div>' +
        '<aside class="hx-city-panel" id="hx-city-panel" aria-live="polite" hidden></aside>' +
        '<div class="hx-city-key" id="hx-city-key"></div>' +
        '<div class="hx-city-ctrl">' +
          '<div class="hx-city-zoom"><button type="button" data-hx-city="zoomin" aria-label="Zoom in">+</button><button type="button" data-hx-city="zoomout" aria-label="Zoom out">−</button></div>' +
          '<button type="button" class="hx-city-btn hx-city-tourbtn" data-hx-city="tours" aria-expanded="false" aria-controls="hx-city-tours">' + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/><path d="M19 15l.8 1.9 1.9.8-1.9.8L19 20.4l-.8-1.9-1.9-.8 1.9-.8z"/></svg>' + 'Tours</button>' +
          '<button type="button" class="hx-city-btn" data-hx-city="full" aria-pressed="' + document.body.classList.contains('hx-city-full') + '">' + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>' + (document.body.classList.contains('hx-city-full') ? 'Exit full screen' : 'Full screen') + '</button>' +
          '<button type="button" class="hx-city-btn" data-hx-city="reset">' + I('discover') + 'Reset view</button>' +
          '<button type="button" class="hx-city-btn" id="hx-city-links" data-hx-city="links" aria-pressed="' + cityLinks + '">' + I('connections') + 'Connections</button>' +
          (coarse ? '' : '<button type="button" class="hx-city-btn" data-hx-city="walk">' + I('journey') + 'Walk the streets</button>') +
        '</div>' +
        '<div class="hx-city-walk" id="hx-city-walk" hidden><b>Walking</b> Use W, A, S and D or the arrow keys to move, and the mouse to look. Hold Shift to run. Press Esc to stop.</div>' +
        '<p class="hx-city-help">' + (coarse ? 'Drag to turn the city. Pinch to zoom.' : 'Drag to turn the city. Right-drag to move it. Hold Ctrl and scroll to zoom.') + '</p>' +
      '</div>' +
      '<p class="hx-city-alt">Prefer a list? <a href="' + href('map') + '">The map</a> and <a href="' + href('all') + '">All projects</a> show the same projects.</p></section>';
  };
  /* Everything the City draws: the listed projects plus retired (archived) ones, which stand as ruins. */
  function cityItems(list) {
    var seen = {}; list.forEach(function (i) { seen[i.repo.name] = 1; });
    var retired = scopedRepos().filter(function (r) { return r.archived && !r.fork && !seen[r.name]; }).map(HX.info).filter(function (i) { return !HX.isCopy(i); });
    return list.concat(retired).map(function (i) {
      var gone = !!i.repo.archived || i.status === 'retired';
      return { key: i.repo.name, name: i.name, tagline: i.tagline, purpose: i.purpose, kind: i.kind, kindLabel: HX.KINDS[i.kind].label,
        size: i.langTotal || (i.repo.size || 0) * 1024, demo: !!i.demo && !gone, works: i.works.filter(function (w) { return !HX.EVERYWHERE[w]; }),
        status: i.status, retired: gone, runs: i.runs.map(function (r) { return r.site; }), cover: i.cover || '', icon: i.icon || '',
        recent: i.recent || 0, issues: i.repo.open_issues_count || 0, notes: !!i.hasNotes,
        lastChange: i.repo.pushed_at || i.repo.updated_at || '', stale: Date.now() - new Date(i.repo.pushed_at || i.repo.updated_at || 0).getTime() > 365 * 864e5 };
    });
  }
  function citySites(list) {
    var sites = HX.index(list).sites;
    return Object.keys(sites).sort(function (a, b) { return sites[b].items.length - sites[a].items.length || a.localeCompare(b); })
      .map(function (k) { return { id: k, name: sites[k].name, count: sites[k].items.length }; });
  }
  /* Raw file contents for the City's props (fonts, SVGs, pictures), by blob sha or by path. */
  var cityBlobs = {}, cityDemos = {}, cityTreesAsked = {};
  function cityBlob(key, sha, path) {
    if (sha && !/^[0-9a-f]{40}$/i.test(sha)) return Promise.resolve(null);
    if (!sha && !HX.safePath(path)) return Promise.resolve(null);
    var id = sha || (key + ':' + path);
    if (cityBlobs[id]) return cityBlobs[id];
    var full = repoFull(key);
    var url = sha ? 'https://api.github.com/repos/' + full + '/git/blobs/' + sha
      : 'https://api.github.com/repos/' + full + '/contents/' + String(path || '').split('/').map(encodeURIComponent).join('/');
    return (cityBlobs[id] = ghFetch(url, { headers: { 'Accept': sha ? 'application/vnd.github.raw+json' : 'application/vnd.github.raw' } })
      .then(function (r) { return r.ok ? r.arrayBuffer() : null; }).catch(function () { return null; }));
  }
  /* What the hologram shows: the project's own picture, or else the demo page itself. */
  function cityDemoPreview(key) {
    if (cityDemos[key]) return cityDemos[key];
    var info = HX.byName(key); if (!info) return Promise.resolve(null);
    var pic = info.cover || (info.gallery[0] && info.gallery[0].src) || '';
    function page() {
      if (!info.demo) return Promise.resolve(null);
      var url = 'https://api.github.com/repos/' + repoFull(info.repo.name) + '/contents/' + info.demo.split('/').map(encodeURIComponent).join('/');
      return ghFetch(url, { headers: { 'Accept': 'application/vnd.github.raw' } })
        .then(function (r) { return r.ok ? r.text() : null; })
        .then(function (t) {
          if (!t) return null;
          if (t.charAt(0) === '{') { try { var j = JSON.parse(t); t = j.content ? safeAtob(j.content) : ''; } catch (e) { t = ''; } }
          return t ? { html: typeof demoStorageShim === 'function' ? demoStorageShim(t) : t } : null;
        }).catch(function () { return null; });
    }
    return (cityDemos[key] = pic ? HX.image(info.repo, pic).then(function (u) { return { img: u }; }, page) : page());
  }
  /* Every project's file list, six at a time; each block fills in as its list lands. */
  function cityLoadTrees(items) {
    var q = items.filter(function (it) { return !it.retired && !cityTreesAsked[it.key]; }), i = 0;
    q.forEach(function (it) { cityTreesAsked[it.key] = 1; });
    function next() {
      if (i >= q.length || !city) return;
      var it = q[i++], info = HX.byName(it.key);
      if (!info) { next(); return; }
      cityTree(info).then(function (files) { if (city) city.addFiles(it.key, files); }, function () {}).then(next);
    }
    for (var k = 0; k < 6; k++) next();
  }
  function cityHoods() {
    return HX.PURPOSES.map(function (p) { return { id: p.id, label: p.label, color: HX.STAGE[p.stage].color, icon: I(p.icon) }; });
  }
  function cityPlatforms(list) {
    var idx = HX.index(list), palette = ['#27AAE1', '#0074B4', '#E07B00', '#2D9E5A', '#5B4FC4', '#E0A800', '#C0392B', '#1582AB'];
    return Object.keys(idx.plats).filter(function (n) { return !HX.EVERYWHERE[n] && idx.plats[n].length >= 3; })
      .sort(function (a, b) { return idx.plats[b].length - idx.plats[a].length; }).slice(0, 10)
      .map(function (n, k) { return { id: n, label: n, color: palette[k % palette.length] }; });
  }
  function cityFilter(list) {
    if (!HX.q) return null;
    var set = {}; list.forEach(function (i) { if (HX.matches(i, HX.q)) set[i.repo.name] = 1; });
    return set;
  }
  function glyph(family, colour) {
    var d = cityMod && cityMod.KEY_GLYPH[family];
    return d ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '" fill="' + colour + '"/></svg>' : '';
  }
  function cityKey(level) {
    var el = document.getElementById('hx-city-key'); if (!el || !cityMod) return;
    var rows = '';
    if (level.kind === 'estate') {
      var kinds = {}; HX.list().forEach(function (i) { kinds[i.kind] = 1; });
      var g = function (d, c) { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '" fill="' + c + '"/></svg>'; };
      var row = function (icon, b, t) { return '<li>' + icon + '<span><b>' + esc(b) + '</b> ' + esc(t) + '</span></li>'; };
      rows = '<li class="hx-city-keyh">Each project’s main building</li>' +
        HX.KIND_ORDER.filter(function (k) { return kinds[k]; }).map(function (k) { var f = cityMod.FORM[k]; return row(glyph(f.family, '#4E6476'), f.label, f.what); }).join('') +
        '<li class="hx-city-keyh">Around it</li>' +
        row(glyph('monolith', '#9AA7B4'), 'Smaller buildings', 'its files') +
        row(g('M6 21h12v-2H6zM8 19h8V7H8zM6 7h12V5H6zM7.5 5h9L15 3H9z', '#B8AE9C'), 'Columns', 'font files, carved in that font') +
        row(g('M7 22h10v-3H7zM9 19h6v-2H9zM12 3.5a2.2 2.2 0 1 0 0 4.4a2.2 2.2 0 1 0 0-4.4zM9 9h6l1.2 8H7.8z', '#B0834F'), 'Statues', 'its SVG pictures') +
        row(g('M12 2l6 9h-3l4 6H5l4-6H6zM11 17h2v5h-2z', '#3F8F55'), 'Gardens', 'a tree for each test, pictures carved in stone') +
        row(g('M5 2h2v20H5zM7 3h11l-3 4 3 4H7z', '#0074B4'), 'Flags', 'the platforms it works with') +
        row('<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#27AAE1"/><path d="M10 7.5v9l7-4.5z" fill="#fff"/></svg>', 'Glowing play sign', 'a demo: point at it for a preview') +
        row(g('M4 22h3V5H4zM2 5h20V3H2zM18 5v9h1V5zM16 14h5v2h-5z', '#E0A800'), 'Crane', 'work in progress') +
        row(g('M3 21h18v-2H3zM5 19h3v-8H5zM10.5 19h3v-5h-3zM16 19h3v-11h-3z', '#A49D90'), 'Ruins', 'retired projects') +
        row(g('M12 2l5 8h-3l4 6H6l4-6H7zM11 16h2v6h-2z', '#52AE70'), 'A tree by the door', 'it has plain-English staff notes') +
        '<li class="hx-city-keyh">Life in the city</li>' +
        row(g('M12 2.5a2.4 2.4 0 1 0 0 4.8a2.4 2.4 0 1 0 0-4.8zM9 8.5h6l-.8 7h-1.4l-.3 6h-1l-.3-6H9.8z', '#0074B4'), 'People', 'a change made in the last 30 days') +
        row(g('M2 9c3 0 5.5 1.2 7 3.2C10.5 10.2 13 9 16 9c-2.4 1.1-4.7 3.4-7 6.6C6.7 12.4 4.4 10.1 2 9z', '#3D4A57'), 'Birds', 'open issues and pull requests') +
        row(g('M7 18h10a4 4 0 0 0 .6-8A6 6 0 0 0 6 9.2A4.4 4.4 0 0 0 7 18z', '#9AA7B4'), 'A cloud', 'nobody has changed it for a year') +
        row(g('M3 15h18l-3 5H6zM11 4h2v10h-2zM13 5l5 7h-5z', '#27AAE1'), 'Ferries', 'projects that run on a live site') +
        '<li class="hx-city-keyh">Around the city</li>' +
        row(g('M2 7l20-4v1.4L2 8.4zM11 8h2v2h-2zM8 10h8v7H8z', '#E0A800'), 'Golden cable car', 'the learner’s journey, stop by stop') +
        row(g('M3 19c3-3 15-3 18 0zM11 7h2v10h-2zM10 5h4v2h-4zM11.4 3h1.2v2h-1.2z', '#C0392B'), 'Small islands', 'the live sites') +
        '<li class="hx-city-stages"><span class="hx-city-sw">' + HX.STAGES.map(function (st) { return '<i tabindex="0" style="background:' + st.color + '" data-tip-title="' + esc(st.label) + '" data-tip="' + esc(st.text) + '"></i>'; }).join('') + '</span><span><b>Colour</b> the step in the learner’s journey</span></li>';
    } else {
      rows = cityMod.KEY.map(function (k) { return '<li>' + glyph(k.arch, k.color) + '<span><b>' + esc(k.label) + '</b></span></li>'; }).join('') +
        '<li class="hx-city-keynote"><span>Each building is one file. Taller buildings are bigger files. Blocks are folders.</span></li>';
    }
    var was = el.querySelector('details'), open = was ? was.open : !!HX._cityKeyOpen;   /* folded at first: it is long, and the city is the point */
    el.innerHTML = '<details' + (open ? ' open' : '') + '><summary>Key: what you are looking at</summary><ul>' + rows + '</ul></details>';
  }
  ['wheel', 'touchmove'].forEach(function (ev) { window.addEventListener(ev, function () { HX._userScrolled = true; }, { passive: true, once: true }); });
  document.addEventListener('input', function (e) { if (e.target && e.target.id === 'hx-city-q') { clearTimeout(citySearch.t); var v = e.target.value.trim(); citySearch.t = setTimeout(function () { citySearch(v); }, 140); } });
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (t && t.id === 'hx-city-q') {
      var opts = Array.prototype.slice.call(document.querySelectorAll('#hx-city-res button')), at = opts.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' && opts.length) { e.preventDefault(); opts[0].focus(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (cityHits.length) cityHit(0); }
      else if (e.key === 'Escape') { e.stopPropagation(); t.value = ''; citySearch(''); }
      return;
    }
    if (t && t.closest && t.closest('#hx-city-res') && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      var list = Array.prototype.slice.call(document.querySelectorAll('#hx-city-res button')), i = list.indexOf(t) + (e.key === 'ArrowDown' ? 1 : -1);
      if (i < 0) document.getElementById('hx-city-q').focus(); else if (list[i]) list[i].focus();
    }
    if (t && t.closest && t.closest('#hx-city-tours') && e.key === 'Escape') { cityToursMenu(false); var b = document.querySelector('[data-hx-city="tours"]'); if (b) b.focus(); }
  });
  document.addEventListener('click', function (e) {
    var m = document.getElementById('hx-city-tours');
    if (m && !m.hidden && !e.target.closest('#hx-city-tours') && !e.target.closest('[data-hx-city="tours"]')) cityToursMenu(false);
    var r = document.getElementById('hx-city-res');
    if (r && !r.hidden && !e.target.closest('#hx-city-find')) r.hidden = true;
  });
  document.addEventListener('toggle', function (e) { if (e.target && e.target.closest && e.target.closest('#hx-city-key')) HX._cityKeyOpen = e.target.open; }, true);
  function cityLevel(crumbs, summary, level) {
    var el = document.getElementById('hx-city-top');
    if (el) {
      el.innerHTML = '<div class="hx-city-crumbs">' + crumbs.map(function (c, i) {
        return i < crumbs.length - 1 ? '<button type="button" data-hx-city="crumb" data-hx-i="' + i + '">' + esc(c.label) + '</button><span class="sep" aria-hidden="true">›</span>' : '<b>' + esc(c.label) + '</b>';
      }).join('') + '</div><div class="hx-city-sum">' + esc(summary) + '</div>' +
        (level.kind !== 'estate' ? '<button type="button" class="hx-city-up" data-hx-city="up">' + I('left') + (level.kind === 'repo' ? 'Back to the city' : 'Up one folder') + '</button>' : '');
    }
    var lk = document.getElementById('hx-city-links'); if (lk) lk.hidden = level.kind !== 'estate';
    cityKey(level);
    var r = parseRoute();
    if (r.view === 'city' && !cityBusy && cityIn !== null) {
      var want = level.kind === 'estate' ? '' : level.repo;
      cityIn = want;
      if ((r.params['in'] || '') !== want) history.replaceState(null, '', href('city', want ? { 'in': want } : null));
    }
  }
  function cityPanel(sel) {
    HX._citySel = sel;
    var el = document.getElementById('hx-city-panel'); if (!el) return;
    var html = '';
    if (sel && sel.type === 'project') {
      var info = HX.byName(sel.key);
      if (info) html = purposeTag(info, true) + '<h3 class="hx-cp-t">' + esc(info.name) + '</h3>' +
        (HX.level !== 'overview' ? '<div class="hx-card-repo">' + esc(info.repo.name) + '</div>' : '') +
        '<p class="hx-cp-s">' + esc(info.tagline) + '</p><div class="hx-cp-pills">' + kindPill(info) + withPills(info, 3, true) + '</div>' +
        '<div class="hx-cp-act"><a class="hx-btn primary sm" href="' + pHref(info) + '">Open the project page' + I('arrow') + '</a>' +
        (info.demo ? '<button type="button" class="hx-btn sm" data-hx-demo="' + esc(info.repo.name) + '">' + I('play') + 'Try the demo</button>' : '') +
        '<button type="button" class="hx-btn sm" data-hx-city="inside" data-hx-repo="' + esc(info.repo.name) + '">' + I('folder') + 'Look inside</button></div>' +
        '<p class="hx-cp-note">Look inside shows each file in the project as a building.</p>';
    } else if (sel && sel.type === 'hood') {
      var p = HX.PURPOSE[sel.id], items = HX.list().filter(function (i) { return i.purpose === sel.id; }).sort(HX.sortFriendly);
      if (p) html = purposeTag({ purpose: sel.id }, true) + '<p class="hx-cp-s">' + esc(p.blurb) + '</p>' +
        '<div class="hx-cp-list">' + items.map(function (i) { return '<button type="button" class="hx-cp-row" data-hx-city="select" data-hx-repo="' + esc(i.repo.name) + '">' + HX.rowIcon(i) + '<span><b>' + esc(i.name) + '</b><small>' + esc(HX.KINDS[i.kind].label) + '</small></span></button>'; }).join('') + '</div>' +
        '<div class="hx-cp-act"><a class="hx-btn sm" href="' + href('purpose/' + p.id) + '">See them as cards' + I('arrow') + '</a></div>';
    } else if (sel && sel.type === 'file') {
      var fi = HX.byName(sel.repo);
      var url = fi ? fi.repo.html_url + '/blob/' + encodeURIComponent(fi.repo.default_branch || 'main') + '/' + sel.path.split('/').map(encodeURIComponent).join('/') : '';
      html = '<span class="hx-cp-k">' + esc(sel.typeLabel) + ' file · ' + esc(sel.sizeText) + '</span><h3 class="hx-cp-t hx-cp-file">' + esc(sel.name) + '</h3>' +
        '<p class="hx-cp-s"><code>' + esc(sel.path) + '</code></p>' +
        (url ? '<div class="hx-cp-act"><a class="hx-btn primary sm" href="' + esc(url) + '" target="_blank" rel="noopener">Open the file on GitHub' + I('ext') + '</a></div>' : '');
    }
    var stage = document.getElementById('hx-city'); if (stage) stage.classList.toggle('has-panel', !!html);
    if (city) city.setInset(html && matchMedia('(max-width: 760px)').matches ? 0.5 : 0);
    if (!html) { el.hidden = true; el.innerHTML = ''; return; }
    el.innerHTML = '<button type="button" class="hx-cp-x" data-hx-city="close" aria-label="Close">' + I('x') + '</button>' + html;
    el.hidden = false;
  }
  function cityBoot(title, sub, show) {
    var b = document.getElementById('hx-city-boot'); if (!b) return;
    if (!show) { b.hidden = true; return; }
    b.hidden = false;
    b.innerHTML = '<span class="hx-city-spin" aria-hidden="true"></span><b>' + esc(title) + '</b><span>' + sub + '</span>';
  }
  function cityNoGL() {
    var b = document.getElementById('hx-city-boot'); if (!b) return;
    b.hidden = false; b.classList.add('fail');
    b.innerHTML = '<b>This browser cannot show the 3D city</b><span>The <a href="' + href('map') + '">map</a> shows the same projects as coloured stones.</span>';
  }
  function cityTree(info) {
    var repo = info.repo, key = 'cb_tree2_' + repo.name + '_' + (repo.pushed_at || '');
    try { var c = sessionStorage.getItem(key); if (c) return Promise.resolve(JSON.parse(c)); } catch (e) {}
    return ghFetch('https://api.github.com/repos/' + repoFull(repo.name) + '/git/trees/' + encodeURIComponent(repo.default_branch || 'main') + '?recursive=1')
      .then(function (r) { if (!r.ok) throw new Error('GitHub API responded ' + r.status); return r.json(); })
      .then(function (d) {
        var files = ((d && d.tree) || []).filter(function (n) { return n.type === 'blob'; }).map(function (n) { return { p: n.path, s: n.size || 0, h: n.sha }; });
        try { sessionStorage.setItem(key, JSON.stringify(files)); } catch (e) {}
        return files;
      });
  }
  function cityInside(name) {
    var info = HX.byName(name); if (!info || !city || cityBusy) return;
    cityBusy = true;
    cityBoot('Opening ' + info.name, 'Reading the list of files', true);
    cityTree(info).then(function (files) {
      cityBusy = false; cityBoot('', '', false);
      if (!files.length) { showToast('This project has no files to show yet.'); return; }
      city.enterProject(name, files, info.name);
    }).catch(function (e) {
      cityBusy = false; cityBoot('', '', false);
      console.warn('City: could not read the files of ' + name, e);
      showToast('The files of this project could not be read. Try again in a minute.');
    });
  }
  function afterCity(list, route) {
    if (cityFail) { cityNoGL(); return; }
    if (!HX.extraReady) { cityBoot('Building the city', 'Reading the details of ' + plural(list.length, 'project', 'projects'), true); return; }
    if (!HX._cityP) HX._cityP = import(new URL('assets/hub-city.js?v=2', document.baseURI).href);
    HX._cityP.then(function (mod) {
      cityMod = mod;
      var slot = document.getElementById('hx-city-slot'); if (!slot) return;     /* left the view meanwhile */
      if (!cityHost) { cityHost = document.createElement('div'); cityHost.className = 'hx-city-host'; }
      slot.appendChild(cityHost);
      if (!city) {
        city = mod.mountCity(cityHost, {
          onSelect: cityPanel,
          onLevel: cityLevel,
          onWalk: function (on) { var w = document.getElementById('hx-city-walk'), c = document.getElementById('hx-city'); if (w) w.hidden = !on; if (c) c.classList.toggle('walking', on); },
          onOpen: function (key) { HX.go('p/' + encodeURIComponent(key)); },
          onOpenSite: function (alias) { HX.go('site/' + encodeURIComponent(alias)); },
          fetchBlob: cityBlob,
          loadImage: function (key, path) { var i = HX.byName(key); return i && path ? HX.image(i.repo, path).catch(function () { return null; }) : Promise.resolve(null); },
          demoPreview: cityDemoPreview,
          onTour: cityTourBar
        });
        if (!city) { cityFail = true; cityNoGL(); return; }
        HX._city = city;
      }
      city.attach();
      /* the first time the city appears, bring the whole stage into view, unless the reader has scrolled meanwhile */
      if (!HX._cityShown) { HX._cityShown = true; if (!HX._userScrolled) scrollToView(route, true); }
      var items = cityItems(list);
      var rebuilt = city.setProjects(items, cityHoods(), cityPlatforms(list), citySites(list));
      cityLoadTrees(items);
      city.setLinks(cityLinks);
      if (city.level.kind === 'estate') city.setFilter(cityFilter(list));
      cityBoot('', '', false);
      var want = route.params['in'] || '';
      if (want !== cityIn) {
        cityIn = want;
        if (want && city.level.repo !== want) cityInside(want);
        else if (!want && city.level.kind !== 'estate') city.home();
      }
      if (!rebuilt) { cityLevel(city.crumbs(), city._summary(), city.level); cityPanel(HX._citySel); }
    }).catch(function (e) { console.warn('The city could not load:', e); cityFail = true; cityNoGL(); });
  }
  var CITY_TOURS = [
    { id: 'sculptures', label: 'Sculpture garden', text: 'Statues and pictures carved in stone, one after another' },
    { id: 'columns', label: 'Font colonnade', text: 'Every font file, carved in its own letters' },
    { id: 'demos', label: 'Demo walk', text: 'Each demo you can try, with its preview' },
    { id: 'cable', label: 'Ride the cable car', text: 'The learner’s journey, from a seat in the car' },
    { id: 'sites', label: 'Island hop', text: 'The live sites, and what runs on each' },
    { id: 'gardens', label: 'Gardens', text: 'Projects with tests that check they work' },
    { id: 'clouds', label: 'Under a cloud', text: 'Projects nobody has changed for over a year' },
    { id: 'ruins', label: 'The ruins', text: 'Retired projects' }
  ];
  function cityToursMenu(open) {
    var m = document.getElementById('hx-city-tours'), b = document.querySelector('[data-hx-city="tours"]');
    if (!m || !city) return;
    if (open === undefined) open = m.hidden;
    if (b) b.setAttribute('aria-expanded', String(open));
    if (!open) { m.hidden = true; return; }
    var n = city.tourCounts();
    m.innerHTML = '<div class="hx-city-tours-h">Take a tour</div>' + CITY_TOURS.map(function (t) {
      var c = n[t.id] || 0;
      return '<button type="button" role="menuitem" data-hx-city="tour" data-hx-tour="' + t.id + '"' + (c ? '' : ' disabled') + '><b>' + esc(t.label) + '<span>' + c + '</span></b><small>' + esc(c ? t.text : 'Nothing here yet') + '</small></button>';
    }).join('');
    m.hidden = false;
    var first = m.querySelector('button:not([disabled])'); if (first) first.focus();
  }
  function cityTourBar(st) {
    var el = document.getElementById('hx-city-tourbar'), stage = document.getElementById('hx-city');
    if (stage) stage.classList.toggle('touring', !!st);
    if (!el) return;
    if (!st) { el.hidden = true; el.innerHTML = ''; return; }
    var t = CITY_TOURS.filter(function (x) { return x.id === st.kind; })[0] || { label: 'Tour' };
    el.innerHTML = '<div class="hx-tb-k">' + esc(t.label) + (st.ride ? '' : ' · ' + (st.i + 1) + ' of ' + st.n) + '</div>' +
      '<b>' + esc(st.title || '') + '</b>' + (st.kindLabel && !st.ride ? '<span class="hx-tb-kind">' + esc(st.kindLabel) + '</span>' : '') +
      '<p>' + esc(st.text || '') + '</p><div class="hx-tb-btns">' +
      (st.ride ? '' : '<button type="button" data-hx-city="tprev" aria-label="Back">' + I('left') + '</button><button type="button" data-hx-city="tpause">' + (st.paused ? 'Play' : 'Pause') + '</button><button type="button" data-hx-city="tnext" aria-label="Next">' + I('right') + '</button>') +
      (st.key && !st.ride ? '<a href="' + href('p/' + encodeURIComponent(st.key)) + '">Project page</a>' : '') +
      '<button type="button" data-hx-city="tstop">' + (st.ride ? 'Get off' : 'End the tour') + '</button></div>';
    el.hidden = false;
  }
  /* Search the city: projects (the same matching as everywhere else) and the things in it. */
  var cityHits = [];
  function citySearch(q) {
    var res = document.getElementById('hx-city-res'), inp = document.getElementById('hx-city-q');
    HX.q = q;
    var nav = document.getElementById('hx-q'); if (nav && nav.value !== q) { nav.value = q; document.getElementById('hx-search').classList.toggle('has-q', !!q); }
    var things = city && q && q.length >= 2 ? city.searchThings(q) : [];
    if (city) {
      /* light the projects that match, and the projects whose fonts, statues, pictures or files match */
      var set = cityFilter(HX.list());
      if (set) things.forEach(function (r) { if (r.main) set[r.main.item.key] = 1; });
      city.setFilter(set);
    }
    things = things.slice(0, 10);
    if (!res) return;
    if (!q || q.length < 2) { res.hidden = true; if (inp) inp.setAttribute('aria-expanded', 'false'); return; }
    var projects = HX.list().filter(function (i) { return HX.matches(i, q); }).sort(HX.sortFriendly).slice(0, 6);
    cityHits = projects.map(function (i) { return { project: i }; }).concat(things.map(function (r) { return { thing: r }; }));
    res.innerHTML = (cityHits.length ? '' : '<div class="hx-city-res-none">Nothing in the city matches. Try another word.</div>') +
      (projects.length ? '<div class="hx-city-res-h">Projects</div>' : '') +
      cityHits.map(function (h, k) {
        if (h.project) return '<button type="button" role="option" data-hx-city="hit" data-hx-i="' + k + '">' + HX.rowIcon(h.project) + '<span><b>' + esc(h.project.name) + '</b><small>' + esc(HX.KINDS[h.project.kind].label) + '</small></span></button>';
        return (k === projects.length ? '<div class="hx-city-res-h">In the city</div>' : '') +
          '<button type="button" role="option" data-hx-city="hit" data-hx-i="' + k + '"><span class="hx-city-res-k">' + esc(h.thing.kindLabel || '') + '</span><span><b>' + esc(h.thing.title || '') + '</b><small>' + esc(h.thing.text || '') + '</small></span></button>';
      }).join('');
    res.hidden = false;
    if (inp) inp.setAttribute('aria-expanded', 'true');
  }
  function cityHit(k) {
    var h = cityHits[k]; if (!h || !city) return;
    var res = document.getElementById('hx-city-res'); if (res) res.hidden = true;
    if (h.project) city.select(h.project.repo.name); else city.focusThing(h.thing);
  }
  /* Full screen: the stage fills the window (it stays in the page, so every control and
     panel still works), and the browser goes full screen too where it allows that. */
  function cityFull(on) {
    document.body.classList.toggle('hx-city-full', on);
    document.documentElement.classList.toggle('hx-city-full', on);   /* no page scrolling underneath */
    if (city) city.setFull(on);
    var b = document.querySelector('[data-hx-city="full"]');
    if (b) { b.setAttribute('aria-pressed', String(on)); b.lastChild.textContent = on ? 'Exit full screen' : 'Full screen'; }
    var d = document, el = d.documentElement;
    try {
      if (on && !d.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(function () {});
      if (!on && d.fullscreenElement && d.exitFullscreen) d.exitFullscreen().catch(function () {});
    } catch (e) { /* the window-filling stage still works without the browser's full screen */ }
  }
  document.addEventListener('fullscreenchange', function () { if (!document.fullscreenElement && document.body.classList.contains('hx-city-full')) cityFull(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.body.classList.contains('hx-city-full') && !document.fullscreenElement && !(city && (city.walking || city.tour || city.ride))) cityFull(false); });
  function cityAction(a, el) {
    if (!city) return;
    if (a === 'zoomin') city.zoom(0.68);
    else if (a === 'zoomout') city.zoom(1.45);
    else if (a === 'reset') { city.clearSelection(); city.resetView(); }
    else if (a === 'links') { cityLinks = !cityLinks; city.setLinks(cityLinks); el.setAttribute('aria-pressed', String(cityLinks)); }
    else if (a === 'walk') city.enterWalk();
    else if (a === 'close') city.clearSelection();
    else if (a === 'select') city.select(el.getAttribute('data-hx-repo'));
    else if (a === 'inside') cityInside(el.getAttribute('data-hx-repo'));
    else if (a === 'crumb') city.goCrumb(+el.getAttribute('data-hx-i'));
    else if (a === 'up') city.up();
    else if (a === 'full') cityFull(!document.body.classList.contains('hx-city-full'));
    else if (a === 'tours') cityToursMenu();
    else if (a === 'tour') { cityToursMenu(false); if (!city.startTour(el.getAttribute('data-hx-tour'))) showToast('There is nothing to visit on that tour yet.'); }
    else if (a === 'tnext') city.tourStep(1);
    else if (a === 'tprev') city.tourStep(-1);
    else if (a === 'tpause') city.pauseTour(!(city.tour && city.tour.paused));
    else if (a === 'tstop') city.stopTour();
    else if (a === 'hit') cityHit(+el.getAttribute('data-hx-i'));
  }

  R.map = function (list) {
    var q = HX.q;
    var out = '<section class="hx-sec"><h2 class="hx-h2">The map</h2><p class="hx-lede">Each stone is one project, grouped by the job it does. Big stones are tools and websites, medium stones are plugins and themes, and small stones are snippets. Type in the search box to light up stones.</p>';
    out += '<div class="hx-legend"><span><span class="hx-stone k3" style="--hx-sc:#9AA7B4"></span>Tools and websites</span><span><span class="hx-stone k2" style="--hx-sc:#9AA7B4"></span>Plugins, themes and packages</span><span><span class="hx-stone" style="--hx-sc:#9AA7B4"></span>Snippets and scripts</span>' +
      HX.STAGES.map(function (s) { return '<span style="display:inline-flex;align-items:center;gap:6px"><i style="width:12px;height:12px;border-radius:4px;background:' + s.color + ';display:inline-block"></i>' + esc(s.label) + '</span>'; }).join('') + '</div><div class="hx-map">';
    var k = 0;
    HX.PURPOSES.forEach(function (p) {
      var items = list.filter(function (i) { return i.purpose === p.id; }).sort(HX.sortFriendly);
      if (!items.length) return;
      var st = HX.STAGE[p.stage];
      out += '<div class="hx-district reveal' + (items.length > 26 ? ' span2' : '') + '" style="--hx-c:' + st.color + ';--hx-tint:' + st.tint + '">' +
        '<a class="hx-district-head" href="' + href('purpose/' + p.id) + '"><span class="hx-sec-ico">' + I(p.icon).replace('<svg', '<svg width="17" height="17"') + '</span><span><b>' + esc(p.label) + '</b><small>' + plural(items.length, 'project', 'projects') + ' · ' + esc(st.label) + '</small></span></a><div class="hx-stones">' +
        items.map(function (i) {
          var size = HX.KINDS[i.kind].size, hit = q && HX.matches(i, q);
          var c = HX.shade(st.color, .82 + HX.rand(HX.hash(i.repo.name), 3) * .42);
          return '<button type="button" class="hx-stone k' + size + (q ? (hit ? ' hit' : ' dim') : '') + '" style="--hx-sc:' + c + ';--hx-d:' + Math.min(900, (k++) * 6) + 'ms" data-hx-go="p/' + esc(encodeURIComponent(i.repo.name)) + '" aria-label="' + esc(i.name) + '" data-tip-k="' + esc(HX.KINDS[i.kind].label) + '" data-tip-title="' + esc(i.name) + '" data-tip="' + esc(i.tagline) + '">' + (size === 3 ? I(p.icon) : '') + '</button>';
        }).join('') + '</div></div>';
    });
    return out + '</div></section>';
  };

  R.journey = function (list) {
    var byStage = {};
    list.forEach(function (i) { (byStage[i.stage] = byStage[i.stage] || []).push(i); });
    var front = HX.STAGES.filter(function (s) { return s.id !== 'backstage'; });
    var out = '<section class="hx-sec"><h2 class="hx-h2">A learner’s journey</h2><p class="hx-lede">Follow a learner from the first visit to the final report. Each stop shows the work that helps at that point. Select a stop to open the project, or a heading to see the whole area.</p></section>';
    out += '<div class="hx-journey reveal" style="margin-top:16px"><div class="hx-road" id="hx-road"></div><div class="hx-stations">';
    front.forEach(function (s) {
      var items = (byStage[s.id] || []).sort(HX.sortFriendly), show = items.slice(0, 6);
      var purposes = HX.PURPOSES.filter(function (p) { return p.stage === s.id; });
      out += '<div class="hx-station" style="--hx-c:' + s.color + '"><div class="hx-station-head"><b>' + esc(s.label) + '</b><span>' + esc(s.text) + '</span></div><div class="hx-station-list">' +
        show.map(function (i) { return '<a class="hx-stop" href="' + pHref(i) + '" data-tip-title="' + esc(i.name) + '" data-tip="' + esc(i.tagline) + '"><i></i><span>' + esc(i.name) + '</span></a>'; }).join('') +
        purposes.map(function (p) { var n = items.filter(function (i) { return i.purpose === p.id; }).length; return n ? '<a class="hx-stop-more" href="' + href('purpose/' + p.id) + '">' + esc(p.label) + ': ' + n + ' →</a>' : ''; }).join('') +
        (items.length ? '' : '<span style="font-size:12px;color:#939393;padding:2px 9px">Nothing here yet</span>') + '</div></div>';
    });
    out += '</div></div>';
    var back = byStage.backstage || [];
    out += '<div class="hx-backstage reveal"><div><h3>Behind the scenes</h3><p>' + esc(HX.STAGE.backstage.text) + ' Learners never see this work, but every step above depends on it.</p></div><div class="hx-backstage-cols">' +
      HX.PURPOSES.filter(function (p) { return p.stage === 'backstage'; }).map(function (p) {
        var items = back.filter(function (i) { return i.purpose === p.id; }).sort(HX.sortFriendly);
        return '<div style="--hx-c:#9FD8F2"><h4>' + I(p.icon).replace('<svg', '<svg width="14" height="14"') + esc(p.label) + '</h4><div class="hx-station-list">' +
          items.slice(0, 6).map(function (i) { return '<a class="hx-stop" href="' + pHref(i) + '"><i></i><span>' + esc(i.name) + '</span></a>'; }).join('') +
          (items.length > 6 ? '<a class="hx-stop-more" style="color:#9FD8F2" href="' + href('purpose/' + p.id) + '">All ' + items.length + ' →</a>' : '') + '</div></div>';
      }).join('') + '</div></div>';
    return out;
  };
  function drawRoad(list) {
    var box = document.getElementById('hx-road'); if (!box) return;
    var W = box.clientWidth, H = 150; if (!W) return;
    var counts = {}; list.forEach(function (i) { counts[i.stage] = (counts[i.stage] || 0) + 1; });
    var front = HX.STAGES.filter(function (s) { return s.id !== 'backstage'; });
    var pts = front.map(function (s, i) { return [(i + .5) * W / front.length, i % 2 ? 92 : 58]; });
    var d = 'M' + (-10) + ' ' + pts[0][1] + ' L' + pts[0][0] + ' ' + pts[0][1];
    for (var i = 1; i < pts.length; i++) { var mx = (pts[i - 1][0] + pts[i][0]) / 2; d += ' C' + mx + ' ' + pts[i - 1][1] + ' ' + mx + ' ' + pts[i][1] + ' ' + pts[i][0] + ' ' + pts[i][1]; }
    d += ' L' + (W + 10) + ' ' + pts[pts.length - 1][1];
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true"><path d="' + d + '" fill="none" stroke="#EEF1F6" stroke-width="22" stroke-linecap="round"/><path d="' + d + '" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="8 10"/>';
    pts.forEach(function (p, i) {
      var st = front[i];
      s += '<g transform="translate(' + p[0] + ' ' + p[1] + ')"><circle r="28" fill="' + st.tint + '"/><circle r="22" fill="#fff" stroke="' + st.color + '" stroke-width="4"/><g transform="translate(-10 -10) scale(.84)" fill="none" stroke="' + st.color + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + HX.ICON[st.icon] + '</g>' +
        '<g transform="translate(17 -20)"><rect x="-12" y="-10" width="24" height="20" rx="10" fill="' + st.color + '"/><text text-anchor="middle" y="4.5" font-family="Montserrat" font-weight="800" font-size="11" fill="#fff">' + (counts[st.id] || 0) + '</text></g></g>';
    });
    s += '<g><circle r="10" fill="#27AAE1" stroke="#fff" stroke-width="3"/><circle r="4" fill="#fff"/>' + (reduce ? '' : '<animateMotion dur="18s" repeatCount="indefinite" path="' + d + '"/>') + '</g></svg>';
    box.innerHTML = s;
  }

  R.connections = function (list) {
    return '<section class="hx-sec"><h2 class="hx-h2">How it all connects</h2><p class="hx-lede">Each white circle is a platform that our work plugs into. Each coloured dot is one project, in the colour of its step on the learner’s journey. Select a platform to see what works with it. You can drag the circles.</p></section>' +
      '<div class="hx-graph-wrap" style="margin-top:16px"><div class="hx-graph" id="hx-graph"><div class="hx-graph-tools"><button type="button" class="hx-pill" id="hx-g-all" aria-pressed="false">Also show WordPress and WPCode</button></div><span class="hx-graph-note" id="hx-g-note"></span></div><aside class="hx-panel" id="hx-panel"></aside></div>';
  };
  function graphPanel(list, hubName) {
    var panel = document.getElementById('hx-panel'); if (!panel) return;
    var idx = HX.index(list);
    if (!hubName) {
      var top = Object.keys(idx.plats).sort(function (a, b) { return (HX.EVERYWHERE[a] ? 1 : 0) - (HX.EVERYWHERE[b] ? 1 : 0) || idx.plats[b].length - idx.plats[a].length; });
      panel.innerHTML = '<h3>Platforms</h3><p>Select a platform in the picture, or in this list, to see the projects that work with it.</p><div class="hx-with">' +
        top.map(function (p) { return '<a href="' + wHref(p) + '" data-hx-hub="' + esc(p) + '"><b>' + esc(p) + '</b> <span>' + plural(idx.plats[p].length, 'project', 'projects') + (HX.PLATFORMS[p] ? ' · ' + esc(HX.PLATFORMS[p].split('. ')[0]) : '') + '</span></a>'; }).join('') + '</div>';
      return;
    }
    var items = (idx.plats[hubName] || []).slice().sort(HX.sortFriendly);
    panel.innerHTML = '<span class="hx-pill hx-pill-with" style="margin-bottom:8px">Platform</span><h3>' + esc(hubName) + '</h3><p>' + esc(HX.PLATFORMS[hubName] || 'A platform that our projects use.') + '</p>' +
      '<a class="hx-btn sm primary" href="' + wHref(hubName) + '" style="margin-bottom:14px">Open the ' + esc(hubName) + ' page' + I('arrow') + '</a>' +
      '<div class="hx-rows" style="grid-template-columns:1fr">' + items.map(function (i) { return row(i); }).join('') + '</div>' +
      '<p style="margin-top:12px"><a href="#" data-hx-hub="">Show every platform</a></p>';
    observeReveals(panel);
  }
  var graphStop = null;
  function drawGraph(list, withEverywhere) {
    var box = document.getElementById('hx-graph'); if (!box) return;
    if (graphStop) graphStop();
    var old = box.querySelector('svg'); if (old) old.remove();
    var W = box.clientWidth, H = box.clientHeight;
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Network of platforms and projects');
    box.insertBefore(svg, box.firstChild);
    var idx = HX.index(list), hubNames = Object.keys(idx.plats).filter(function (p) { return withEverywhere || !HX.EVERYWHERE[p]; });
    var nodes = [], links = [], hubBy = {}, projBy = {};
    hubNames.forEach(function (n, i) {
      var a = i / hubNames.length * Math.PI * 2, rr = Math.min(W, H) * .32;
      var node = { id: 'h:' + n, hub: true, name: n, deg: idx.plats[n].length, x: W / 2 + Math.cos(a) * rr, y: H / 2 + Math.sin(a) * rr, vx: 0, vy: 0 };
      node.r = 12 + Math.sqrt(node.deg) * 4.2; nodes.push(node); hubBy[n] = node;
    });
    var loose = 0;
    list.forEach(function (info) {
      var hs = info.works.filter(function (w) { return hubBy[w]; });
      if (!hs.length) { loose++; return; }
      var h0 = hubBy[hs[0]], seed = HX.hash(info.repo.name);
      var node = { id: 'p:' + info.repo.name, info: info, x: h0.x + (HX.rand(seed, 1) - .5) * 80, y: h0.y + (HX.rand(seed, 2) - .5) * 80, vx: 0, vy: 0, r: 3.5 + HX.KINDS[info.kind].size * 1.8 };
      nodes.push(node); projBy[info.repo.name] = node;
      hs.forEach(function (w) { links.push({ s: node, t: hubBy[w] }); });
    });
    var note = document.getElementById('hx-g-note');
    if (note) note.textContent = plural(nodes.length - hubNames.length, 'project', 'projects') + ' linked to ' + plural(hubNames.length, 'platform', 'platforms') + (loose ? ' · ' + loose + ' with no listed platform' : '');
    var gL = document.createElementNS(NS, 'g'), gN = document.createElementNS(NS, 'g'); svg.appendChild(gL); svg.appendChild(gN);
    links.forEach(function (l) { l.el = document.createElementNS(NS, 'line'); l.el.setAttribute('class', 'lk'); gL.appendChild(l.el); });
    nodes.forEach(function (n) {
      var g = document.createElementNS(NS, 'g');
      if (n.hub) {
        g.setAttribute('class', 'nd nd-h'); g.innerHTML = '<circle class="halo" r="' + (n.r + 8) + '"/><circle class="core" r="' + n.r + '"/><text text-anchor="middle" y="' + (n.r + 16) + '">' + esc(n.name) + '</text><text text-anchor="middle" y="4" style="stroke:none;fill:#0074B4;font-size:11px">' + n.deg + '</text>';
        g.setAttribute('data-tip-title', n.name); g.setAttribute('data-tip', HX.PLATFORMS[n.name] || ''); g.setAttribute('tabindex', '0');
      } else {
        var st = HX.STAGE[n.info.stage];
        g.setAttribute('class', 'nd nd-p'); g.innerHTML = '<circle r="' + n.r + '" fill="' + st.color + '"/>';
        g.setAttribute('data-tip-k', HX.PURPOSE[n.info.purpose].label); g.setAttribute('data-tip-title', n.info.name); g.setAttribute('data-tip', n.info.tagline);
      }
      n.el = g; gN.appendChild(g);
    });
    function focus(n) {
      if (!n) { links.forEach(function (l) { l.el.setAttribute('class', 'lk'); }); nodes.forEach(function (m) { m.el.classList.remove('off'); }); return; }
      var near = {}; near[n.id] = 1;
      links.forEach(function (l) { var on = l.s === n || l.t === n; l.el.setAttribute('class', 'lk ' + (on ? 'on' : 'off')); if (on) { near[l.s.id] = 1; near[l.t.id] = 1; } });
      nodes.forEach(function (m) { m.el.classList.toggle('off', !near[m.id]); });
    }
    var selected = null;
    nodes.forEach(function (n) {
      n.el.addEventListener('mouseenter', function () { if (!selected) focus(n); });
      n.el.addEventListener('mouseleave', function () { if (!selected) focus(null); });
    });
    var alpha = 1, raf = 0, drag = null, moved = false;
    function tick() {
      var i, j, a, b, dx, dy, d2, d, f;
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        for (j = i + 1; j < nodes.length; j++) {
          b = nodes[j]; dx = b.x - a.x; dy = b.y - a.y; d2 = dx * dx + dy * dy || 1; d = Math.sqrt(d2);
          var k = (a.hub && b.hub) ? 16000 : (a.hub || b.hub) ? 900 : 260;
          f = Math.min(k / d2, 6) * alpha; var min = a.r + b.r + ((a.hub && b.hub) ? 70 : 3);
          if (d < min) f += (min - d) * .5;
          dx /= d; dy /= d; a.vx -= dx * f; a.vy -= dy * f; b.vx += dx * f; b.vy += dy * f;
        }
      }
      links.forEach(function (l) {
        dx = l.t.x - l.s.x; dy = l.t.y - l.s.y; d = Math.sqrt(dx * dx + dy * dy) || 1;
        var L = l.t.r + 34 + l.s.r; f = (d - L) * .035 * alpha; dx /= d; dy /= d;
        l.s.vx += dx * f; l.s.vy += dy * f; l.t.vx -= dx * f * .15; l.t.vy -= dy * f * .15;
      });
      nodes.forEach(function (n) {
        n.vx += (W / 2 - n.x) * .0016 * alpha; n.vy += (H / 2 - n.y) * .0022 * alpha;
        if (n === drag) { n.vx = n.vy = 0; return; }
        n.vx *= .78; n.vy *= .78; n.x += n.vx; n.y += n.vy;
        var padX = n.hub ? Math.max(n.r + 6, n.name.length * 3.6) : n.r + 4;
        n.x = Math.max(padX, Math.min(W - padX, n.x)); n.y = Math.max(n.r + 10, Math.min(H - n.r - (n.hub ? 34 : 8), n.y));
      });
      draw(); alpha *= .985;
      if (alpha > .015 || drag) raf = requestAnimationFrame(tick); else raf = 0;
    }
    function draw() {
      links.forEach(function (l) { l.el.setAttribute('x1', l.s.x.toFixed(1)); l.el.setAttribute('y1', l.s.y.toFixed(1)); l.el.setAttribute('x2', l.t.x.toFixed(1)); l.el.setAttribute('y2', l.t.y.toFixed(1)); });
      nodes.forEach(function (n) { n.el.setAttribute('transform', 'translate(' + n.x.toFixed(1) + ' ' + n.y.toFixed(1) + ')'); });
    }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { for (var t = 0; t < 320; t++) { tick(); cancelAnimationFrame(raf); } alpha = 0; draw(); }
    else raf = requestAnimationFrame(tick);
    function pt(e) { var r = svg.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }
    svg.addEventListener('pointerdown', function (e) {
      var g = e.target.closest('.nd'); if (!g) return;
      var n = nodes.filter(function (m) { return m.el === g; })[0]; if (!n) return;
      drag = n; moved = false; svg.classList.add('dragging'); svg.setPointerCapture(e.pointerId);
      if (!raf) { alpha = Math.max(alpha, .25); raf = requestAnimationFrame(tick); }
    });
    svg.addEventListener('pointermove', function (e) { if (!drag) return; var p = pt(e); if (Math.abs(p.x - drag.x) + Math.abs(p.y - drag.y) > 2) moved = true; drag.x = p.x; drag.y = p.y; alpha = Math.max(alpha, .2); });
    svg.addEventListener('pointerup', function () {
      if (!drag) return; var n = drag; drag = null; svg.classList.remove('dragging');
      if (moved) return;
      if (n.hub) { selected = n; focus(n); nodes.forEach(function (m) { if (m.hub) m.el.classList.toggle('sel', m === n); }); graphPanel(list, n.name); }
      else HX.go('p/' + encodeURIComponent(n.info.repo.name));
    });
    svg.addEventListener('keydown', function (e) { if (e.key !== 'Enter') return; var g = e.target.closest('.nd-h'); if (!g) return; var n = nodes.filter(function (m) { return m.el === g; })[0]; if (n) { selected = n; focus(n); graphPanel(list, n.name); } });
    HX._graphSelect = function (name) {
      selected = name ? hubBy[name] : null; focus(selected);
      nodes.forEach(function (m) { if (m.hub) m.el.classList.toggle('sel', m === selected); });
      graphPanel(list, name);
    };
    graphStop = function () { if (raf) cancelAnimationFrame(raf); raf = 0; };
  }

  R.sites = function (list) {
    var idx = HX.index(list), sites = Object.keys(idx.sites).map(function (k) { return idx.sites[k]; }).sort(function (a, b) { return b.items.length - a.items.length || a.name.localeCompare(b.name); });
    var out = '<section class="hx-sec"><h2 class="hx-h2">Where it runs</h2><p class="hx-lede">Our plugins, themes and snippets run on live sites. Each card is one site and the work that runs on it. The live site is always the true version; GitHub keeps a copy for review and history.</p></section>';
    if (!sites.length) return out + '<div class="hx-empty" style="margin-top:16px"><b>' + (ghToken ? 'No project names a site yet' : 'Sign in to see the sites') + '</b>' + (ghToken ? 'When a project lists where it runs, its site appears here.' : 'Sign in with your GitHub account at the top of the page. Site details come from private projects.') + '</div>';
    return out + '<div class="hx-sites" style="margin-top:16px">' + sites.map(function (s, i) {
      var kinds = {}; s.items.forEach(function (it) { kinds[it.kind] = (kinds[it.kind] || 0) + 1; });
      var ks = HX.KIND_ORDER.filter(function (k) { return kinds[k]; });
      return '<a class="hx-site reveal" href="' + href('site/' + encodeURIComponent(s.site)) + '" style="transition-delay:' + (i % 3) * 40 + 'ms"><div class="hx-site-art">' + siteArt(s, kinds, ks) + '</div><div class="hx-site-body"><b>' + esc(s.name) + '</b><code>' + esc(s.site) + '</code><div class="hx-site-counts">' +
        ks.map(function (k) { return '<span class="hx-pill"><i style="width:8px;height:8px;border-radius:2px;background:' + HX.KIND_COLOR[k] + ';display:inline-block"></i>' + esc(HX.kindCount(k, kinds[k])) + '</span>'; }).join('') + '</div>' +
        '<div style="font-size:12px;color:#5A6470;line-height:1.5">' + esc(s.items.slice(0, 3).map(function (it) { return it.name; }).join(', ')) + (s.items.length > 3 ? ' and ' + (s.items.length - 3) + ' more' : '') + '</div></div></a>';
    }).join('') + '</div>';
  };
  function siteArt(s, kinds, ks) {
    var W = 320, H = 120, svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid slice" aria-hidden="true">';
    var x = 160 - (ks.length - 1) * 26;
    ks.forEach(function (k, i) {
      var c = HX.KIND_COLOR[k], h = 12 + Math.min(70, kinds[k] * 6);
      svg += HX.cubeSVG(x + i * 52, 96 - h - i % 2 * 6, 22, 11, h, { t: HX.shade(c, 1.35), l: HX.shade(c, .72), r: c, e: HX.shade(c, .8) });
    });
    return svg + '</svg>';
  }

  R['new'] = function (list) {
    var weeks = 26, now = Date.now(), wk = 7 * 864e5, bars = [];
    for (var i = 0; i < weeks; i++) bars.push([]);
    list.forEach(function (info) { var t = new Date(info.repo.pushed_at || 0).getTime(), w = Math.floor((now - t) / wk); if (w >= 0 && w < weeks) bars[weeks - 1 - w].push(info); });
    var max = Math.max.apply(null, bars.map(function (b) { return b.length; })) || 1, k = 0;
    var strip = '<div class="hx-strip reveal"><h3 class="hx-h3" style="margin-bottom:4px">Projects changed each week, over the last six months</h3><p style="margin:0;font-size:12px;color:#6B6B6B">GitHub gives the latest change of each project, so a project appears once, in the week of its latest change.</p><div class="hx-strip-bars">' + bars.map(function (b) {
      var per = {}; b.forEach(function (info) { per[info.stage] = (per[info.stage] || 0) + 1; });
      return '<div class="hx-strip-bar" data-tip-title="' + plural(b.length, 'project', 'projects') + '" data-tip="' + esc(HX.STAGES.filter(function (s2) { return per[s2.id]; }).map(function (s2) { return s2.label + ': ' + per[s2.id]; }).join(' \u00b7 ')) + '">' +
        (b.length ? '<span class="hx-strip-n">' + b.length + '</span>' : '') + '<div class="hx-strip-fill" style="height:' + (b.length / max * 100).toFixed(1) + '%;--hx-d:' + Math.min(700, (k++) * 25) + 'ms">' +
        HX.STAGES.filter(function (s2) { return per[s2.id]; }).map(function (s2) { return '<i style="flex:' + per[s2.id] + ';background:' + s2.color + '"></i>'; }).join('') + '</div></div>';
    }).join('') + '</div><div class="hx-strip-axis">' + bars.map(function (b, i) {
      var d = new Date(now - (weeks - 1 - i) * wk); return '<span>' + (i % 4 === 1 ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '') + '</span>';
    }).join('') + '</div><div class="hx-legend" style="margin:12px 0 0">' + HX.STAGES.map(function (s2) { return '<span style="display:inline-flex;align-items:center;gap:6px"><i style="width:10px;height:10px;border-radius:3px;background:' + s2.color + ';display:inline-block"></i>' + esc(s2.label) + '</span>'; }).join('') + '</div></div>';
    var sorted = list.slice().sort(HX.recent), groups = [['This week', 7], ['Earlier this month', 30], ['In the last three months', 91], ['Earlier', 1e9]], prev = 0;
    var out = '<section class="hx-sec"><h2 class="hx-h2">What’s new</h2><p class="hx-lede">The projects that changed most recently. Each block in the chart is one project, in the colour of its step on the learner’s journey.</p></section>' + strip;
    var fresh = list.filter(function (i) { return now - new Date(i.repo.created_at || 0).getTime() < 30 * 864e5; });
    if (fresh.length) out += '<section class="hx-sec">' + secHead('news', '#2D9E5A', 'New on GitHub this month', plural(fresh.length, 'project', 'projects') + ' added in the last 30 days.') + shelf(fresh.sort(HX.sortFriendly)) + '</section>';
    groups.forEach(function (g) {
      var items = sorted.filter(function (i) { var age = (now - new Date(i.repo.pushed_at || 0).getTime()) / 864e5; return age >= prev && age < g[1]; });
      prev = g[1];
      if (!items.length) return;
      out += '<div class="hx-feed-group"><h3>' + esc(g[0]) + ' · ' + items.length + '</h3><div class="hx-rows">' + items.map(function (i) {
        var sub = (HX.level !== 'overview' && i.last && i.last.msg) ? 'Latest change: ' + i.last.msg : i.tagline;
        return row(i, timeAgo(i.repo.pushed_at) + ' · ' + sub);
      }).join('') + '</div></div>';
    });
    return out;
  };

  /* All projects: filters, sort, layout. Filter state lives in the address. */
  var FILTER_KEYS = ['purpose', 'kind', 'with', 'site', 'helps', 'lang'];
  function getSel(params, k) { return (params[k] || '').split(',').filter(Boolean); }
  function passes(info, sel, skip) {
    if (skip !== 'purpose' && sel.purpose.length && sel.purpose.indexOf(info.purpose) < 0) return false;
    if (skip !== 'kind' && sel.kind.length && sel.kind.indexOf(info.kind) < 0) return false;
    if (skip !== 'with' && sel['with'].length && !sel['with'].every(function (w) { return info.works.indexOf(w) >= 0; })) return false;
    if (skip !== 'site' && sel.site.length && !info.runs.some(function (s) { return sel.site.indexOf(s.site) >= 0; })) return false;
    if (skip !== 'helps' && sel.helps.length && !info.helps.some(function (h) { return sel.helps.indexOf(h) >= 0; })) return false;
    if (skip !== 'lang' && sel.lang.length && !(info.repo.language && sel.lang.indexOf(info.repo.language === 'Hack' ? 'PHP' : info.repo.language) >= 0)) return false;
    if (sel.demo && !info.demo) return false;
    if (sel.pics && !(info.cover || info.gallery.length || info.guides.length)) return false;
    return HX.matches(info, sel.q);
  }
  R.all = function (list, route) {
    var params = route.params, sel = { q: params.q || HX.q || '', demo: params.demo === '1', pics: params.pics === '1' };
    FILTER_KEYS.forEach(function (k) { sel[k] = getSel(params, k); });
    var shown = list.filter(function (i) { return passes(i, sel); });
    var sort = params.sort || 'updated';
    shown.sort(sort === 'name' ? function (a, b) { return a.name.localeCompare(b.name); } : sort === 'size' ? function (a, b) { return (b.repo.size || 0) - (a.repo.size || 0); } : sort === 'purpose' ? function (a, b) { return HX.PURPOSES.indexOf(HX.PURPOSE[a.purpose]) - HX.PURPOSES.indexOf(HX.PURPOSE[b.purpose]) || HX.sortFriendly(a, b); } : HX.recent);
    function group(key, title, options) {
      if (!options.length) return '';
      return '<div class="hx-fgroup"><h4>' + esc(title) + '</h4>' + options.map(function (o) {
        var on = sel[key].indexOf(o.id) >= 0, n = list.filter(function (i) { return passes(i, sel, key) && o.test(i); }).length;
        return '<button type="button" class="hx-fopt" data-hx-f="' + key + '" data-hx-v="' + esc(o.id) + '" aria-pressed="' + on + '"' + (!n && !on ? ' disabled' : '') + '>' + (o.color ? '<i style="background:' + o.color + '"></i>' : '') + esc(o.label) + '<span class="n">' + n + '</span></button>';
      }).join('') + '</div>';
    }
    var idx = HX.index(list);
    var filters = '<aside class="hx-filters' + (params.open ? ' open' : '') + '"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b style="font-size:14px">Filter</b><span style="display:flex;gap:6px"><button type="button" class="hx-pill hx-filters-toggle" data-hx-ftoggle="1">Show filters</button><a class="hx-pill" href="' + href('all') + '">Clear</a></span></div>' +
      group('purpose', 'What it helps with', HX.PURPOSES.map(function (p) { return { id: p.id, label: p.label, color: HX.STAGE[p.stage].color, test: function (i) { return i.purpose === p.id; } }; })) +
      group('kind', 'Kind of project', HX.KIND_ORDER.filter(function (k) { return idx.kinds[k]; }).map(function (k) { return { id: k, label: HX.KINDS[k].plural, color: HX.KIND_COLOR[k], test: function (i) { return i.kind === k; } }; })) +
      group('with', 'Works with', Object.keys(idx.plats).sort(function (a, b) { return idx.plats[b].length - idx.plats[a].length; }).map(function (p) { return { id: p, label: p, test: function (i) { return i.works.indexOf(p) >= 0; } }; })) +
      group('site', 'Runs on', Object.keys(idx.sites).sort(function (a, b) { return idx.sites[b].items.length - idx.sites[a].items.length; }).map(function (s) { return { id: s, label: idx.sites[s].name, test: function (i) { return i.runs.some(function (r) { return r.site === s; }); } }; })) +
      group('helps', 'Helps', Object.keys(HX.HELPS).map(function (h) { return { id: h, label: HX.HELPS[h], test: function (i) { return i.helps.indexOf(h) >= 0; } }; })) +
      (HX.level === 'code' ? group('lang', 'Main language', (function () { var c = {}; list.forEach(function (i) { var l = i.repo.language === 'Hack' ? 'PHP' : i.repo.language; if (l) c[l] = 1; }); return Object.keys(c).sort(); })().map(function (l) { return { id: l, label: l, color: langColor(l), test: function (i) { return (i.repo.language === 'Hack' ? 'PHP' : i.repo.language) === l; } }; })) : '') +
      '<div class="hx-fgroup"><h4>Extras</h4>' +
        '<button type="button" class="hx-fopt" data-hx-t="demo" aria-pressed="' + sel.demo + '">Has a demo<span class="n">' + list.filter(function (i) { return i.demo; }).length + '</span></button>' +
        '<button type="button" class="hx-fopt" data-hx-t="pics" aria-pressed="' + sel.pics + '">Has pictures or guides<span class="n">' + list.filter(function (i) { return i.cover || i.gallery.length || i.guides.length; }).length + '</span></button>' +
        '<button type="button" class="hx-fopt" data-hx-t="extra" aria-pressed="' + HX.showExtra + '">Include archived and forks</button></div></aside>';
    var active = [];
    FILTER_KEYS.forEach(function (k) { sel[k].forEach(function (v) { var lab = k === 'purpose' ? HX.PURPOSE[v] && HX.PURPOSE[v].label : k === 'kind' ? HX.KINDS[v] && HX.KINDS[v].plural : k === 'site' ? (idx.sites[v] ? idx.sites[v].name : v) : k === 'helps' ? HX.HELPS[v] : v; active.push('<button type="button" class="hx-pill hx-pill-with" data-hx-f="' + k + '" data-hx-v="' + esc(v) + '">' + esc(lab || v) + ' ×</button>'); }); });
    if (sel.q) active.push('<span class="hx-pill">“' + esc(sel.q) + '”</span>');
    var layout = params.layout || 'cards';
    var head = '<div class="hx-results-head"><span class="hx-count">' + plural(shown.length, 'project', 'projects') + '</span><div class="hx-active-filters">' + active.join('') + '</div><span style="flex:1"></span>' +
      '<label class="sr-only" for="hx-sort">Sort</label><select id="hx-sort"><option value="updated"' + (sort === 'updated' ? ' selected' : '') + '>Recently updated</option><option value="name"' + (sort === 'name' ? ' selected' : '') + '>Name A to Z</option><option value="purpose"' + (sort === 'purpose' ? ' selected' : '') + '>By purpose</option>' + (HX.level !== 'overview' ? '<option value="size"' + (sort === 'size' ? ' selected' : '') + '>Largest first</option>' : '') + '</select>' +
      '<div class="hx-seg" role="radiogroup" aria-label="Layout"><button type="button" role="radio" data-hx-layout="cards" aria-checked="' + (layout === 'cards') + '">Cards</button><button type="button" role="radio" data-hx-layout="list" aria-checked="' + (layout === 'list') + '">List</button></div></div>';
    var body = !shown.length ? '<div class="hx-empty"><b>No projects match</b>Remove a filter or change the search words.</div>'
      : layout === 'list' ? '<div class="hx-rows">' + shown.map(function (i) { return row(i, HX.PURPOSE[i.purpose].label + ' · ' + i.tagline); }).join('') + '</div>'
      : HX.level === 'code' ? '<div class="hx-grid big" data-hx-dev="' + esc(shown.map(function (i) { return i.repo.name; }).join(',')) + '"></div>'
      : (sort === 'updated' || sort === 'name' || sort === 'size') && shown.length > 12 ? cardsAndRows(shown) : '<div class="hx-grid">' + shown.map(card).join('') + '</div>';
    return '<section class="hx-sec"><h2 class="hx-h2">All projects</h2><p class="hx-lede">Narrow the list with the filters. The numbers show how many projects each choice leaves.</p></section><div class="hx-all" style="margin-top:16px">' + filters + '<div>' + head + body + '</div></div>';
  };

  R.glossary = function (list) {
    var idx = HX.index(list);
    function termCard(k, t, x, link, n) { return '<div class="hx-term reveal"><span class="hx-term-k">' + esc(k) + '</span><b>' + esc(t) + '</b><p>' + esc(x) + '</p>' + (link && n ? '<a href="' + link + '">See ' + plural(n, 'project', 'projects') + ' →</a>' : '') + '</div>'; }
    var out = '<section class="hx-sec"><h2 class="hx-h2">Words explained</h2><p class="hx-lede">Short, plain explanations of the words on this page. Select a link to see the projects that each word applies to.</p></section>';
    out += '<section class="hx-sec">' + secHead('folder', '#0074B4', 'Kinds of project', 'What a project is made as, and where it runs.') + '<div class="hx-grid">' +
      HX.KIND_ORDER.map(function (k) { return termCard('Kind of project', HX.KINDS[k].label, HX.KINDS[k].explain, href('all', { kind: k }), idx.kinds[k] || 0); }).join('') + '</div></section>';
    out += '<section class="hx-sec">' + secHead('connections', '#27AAE1', 'Platforms we work with', 'The products and standards that our projects plug into.') + '<div class="hx-grid">' +
      Object.keys(HX.PLATFORMS).sort(function (a, b) { return ((idx.plats[b] || []).length - (idx.plats[a] || []).length) || a.localeCompare(b); }).map(function (p) { return termCard('Platform', p, HX.PLATFORMS[p], wHref(p), (idx.plats[p] || []).length); }).join('') + '</div></section>';
    var groups = {}; HX.TERMS.forEach(function (t) { (groups[t.group] = groups[t.group] || []).push(t); });
    Object.keys(groups).forEach(function (g) {
      out += '<section class="hx-sec">' + secHead('glossary', '#5B4FC4', g, '') + '<div class="hx-grid">' + groups[g].map(function (t) { return termCard(g, t.term, t.text); }).join('') + '</div></section>';
    });
    return out;
  };

  /* ---------------- Deeper pages ---------------- */
  R.purpose = function (list, route) {
    var p = HX.PURPOSE[route.arg]; if (!p) return R.discover(list);
    var st = HX.STAGE[p.stage], items = list.filter(function (i) { return i.purpose === p.id; }).sort(HX.sortFriendly);
    var idx = HX.index(items), plats = Object.keys(idx.plats).filter(function (x) { return !HX.EVERYWHERE[x]; }).sort(function (a, b) { return idx.plats[b].length - idx.plats[a].length; });
    var light = st.id === 'arrive' || st.id === 'join';
    var out = '<div class="hx-banner' + (light ? ' light' : '') + '" style="--hx-bg:linear-gradient(135deg,' + (light ? st.tint + ',' + st.color : HX.shade(st.color, .7) + ',' + st.color) + ')">' + bannerArt(light ? '#FFFFFF' : HX.shade(st.color, 1.5), HX.hash(p.id), !light) +
      '<a class="hx-kicker" style="color:inherit;text-decoration:none" href="' + href('journey') + '">' + I(st.icon).replace('<svg', '<svg width="15" height="15"') + 'Learner journey: ' + esc(st.label) + '</a><h1>' + esc(p.label) + '</h1><p>' + esc(p.blurb) + '</p>' +
      '<div class="hx-stats"><div class="hx-stat"><b>' + items.length + '</b><span>projects</span></div>' + HX.KIND_ORDER.filter(function (k) { return idx.kinds[k]; }).map(function (k) { return '<div class="hx-stat"><b>' + idx.kinds[k] + '</b><span>' + esc(HX.kindCount(k, idx.kinds[k]).replace(/^\d+ /, '')) + '</span></div>'; }).join('') + '</div>' +
      (plats.length ? '<div class="hx-chiprow">' + plats.slice(0, 8).map(function (x) { return '<a class="hx-pill" href="' + wHref(x) + '">' + esc(x) + ' · ' + idx.plats[x].length + '</a>'; }).join('') + '</div>' : '') + '</div>';
    var demos = items.filter(function (i) { return i.demo; });
    if (demos.length) out += '<section class="hx-sec">' + secHead('play', '#0074B4', 'Try it', 'Demos in this area.') + shelf(demos, true) + '</section>';
    out += '<section class="hx-sec">' + secHead('', '', 'Everything in this area', '') + (items.length ? cardsAndRows(items, { devCards: true }) : '<div class="hx-empty"><b>Nothing here yet</b></div>') + '</section>';
    var near = HX.PURPOSES.filter(function (q) { return q.id !== p.id && (q.stage === p.stage || HX.STAGES.indexOf(HX.STAGE[q.stage]) === HX.STAGES.indexOf(st) + 1); });
    if (near.length) out += '<section class="hx-sec">' + secHead('journey', '#27AAE1', 'Nearby on the journey', 'Areas at this step and the next one.') + '<div class="hx-doors">' + near.map(function (q) {
      var s2 = HX.STAGE[q.stage], n = list.filter(function (i) { return i.purpose === q.id; }).length, lt = s2.id === 'arrive' || s2.id === 'join';
      return '<a class="hx-door' + (lt ? ' light' : '') + '" style="min-height:140px;--hx-bg:linear-gradient(135deg,' + (lt ? s2.tint + ',' + s2.color : HX.shade(s2.color, .7) + ',' + s2.color) + ')" href="' + href('purpose/' + q.id) + '"><span class="hx-door-n">' + n + '</span><b>' + esc(q.label) + '</b><span>' + esc(q.blurb) + '</span></a>';
    }).join('') + '</div></section>';
    return out;
  };

  R['with'] = function (list, route) {
    var name = route.arg, idx = HX.index(list), items = (idx.plats[name] || []).slice().sort(HX.sortFriendly);
    var co = {}; items.forEach(function (i) { i.works.forEach(function (w) { if (w !== name && !HX.EVERYWHERE[w]) co[w] = (co[w] || 0) + 1; }); });
    var coList = Object.keys(co).sort(function (a, b) { return co[b] - co[a]; });
    var out = '<div class="hx-banner" style="--hx-bg:linear-gradient(135deg,#00507D,#0074B4 55%,#27AAE1)">' + bannerArt('#7FCBEF', HX.hash(name)) +
      '<span class="hx-kicker">' + I('connections').replace('<svg', '<svg width="15" height="15"') + 'Works with</span><h1>' + esc(name) + '</h1><p>' + esc(HX.PLATFORMS[name] || 'A platform that our projects use.') + '</p>' +
      '<div class="hx-stats"><div class="hx-stat"><b>' + items.length + '</b><span>projects work with it</span></div></div>' +
      (coList.length ? '<div class="hx-chiprow"><span style="font-size:12px;font-weight:700;opacity:.9;align-self:center">Often used with</span>' + coList.slice(0, 8).map(function (x) { return '<a class="hx-pill" href="' + wHref(x) + '">' + esc(x) + ' · ' + co[x] + '</a>'; }).join('') + '</div>' : '') + '</div>';
    if (!items.length) return out + '<div class="hx-empty"><b>No projects list ' + esc(name) + ' yet</b></div>';
    HX.PURPOSES.forEach(function (p) {
      var g = items.filter(function (i) { return i.purpose === p.id; }); if (!g.length) return;
      out += '<section class="hx-sec">' + secHead(p.icon, HX.STAGE[p.stage].color, p.label, plural(g.length, 'project', 'projects')) + cardsAndRows(g) + '</section>';
    });
    return out;
  };

  R.site = function (list, route) {
    var idx = HX.index(list), s = idx.sites[route.arg];
    if (!s) return '<div class="hx-empty"><b>We could not find that site</b>' + (ghToken ? 'No project lists it.' : 'Sign in to see where projects run.') + '</div>';
    var kinds = {}; s.items.forEach(function (it) { kinds[it.kind] = (kinds[it.kind] || 0) + 1; });
    var out = '<div class="hx-banner" style="--hx-bg:linear-gradient(135deg,#1E6B3D,#2D9E5A)">' + bannerArt('#8ED6A9', HX.hash(s.site)) +
      '<span class="hx-kicker">' + I('sitesview').replace('<svg', '<svg width="15" height="15"') + 'Where it runs</span><h1>' + esc(s.name) + '</h1><p>The work that runs on this site. <code style="background:rgba(255,255,255,.18);padding:1px 6px;border-radius:6px">' + esc(s.site) + '</code></p>' +
      '<div class="hx-stats"><div class="hx-stat"><b>' + s.items.length + '</b><span>projects</span></div>' + HX.KIND_ORDER.filter(function (k) { return kinds[k]; }).map(function (k) { return '<div class="hx-stat"><b>' + kinds[k] + '</b><span>' + esc(HX.kindCount(k, kinds[k]).replace(/^\d+ /, '')) + '</span></div>'; }).join('') + '</div></div>';
    HX.PURPOSES.forEach(function (p) {
      var g = s.items.filter(function (i) { return i.purpose === p.id; }).sort(HX.sortFriendly); if (!g.length) return;
      out += '<section class="hx-sec">' + secHead(p.icon, HX.STAGE[p.stage].color, p.label, plural(g.length, 'project', 'projects')) + cardsAndRows(g) + '</section>';
    });
    return out;
  };

  /* ---------------- Project page ---------------- */
  R.p = function (list, route) {
    var info = HX.byName(route.arg);
    if (!info) return '<div class="hx-empty"><b>We could not find that project</b>' + (ghToken ? 'It may have a new name, or you may not have access to it.' : 'It may be private. Sign in at the top of the page to see private projects.') + '</div>';
    var repo = info.repo, st = HX.STAGE[info.stage], tab = route.params.tab || (HX.level === 'overview' ? 'overview' : HX.level);
    var badges = kindPill(info);
    if (info.status !== 'live') badges += '<span class="hx-pill hx-pill-status">' + esc(info.status === 'in-progress' ? 'In progress' : info.status.charAt(0).toUpperCase() + info.status.slice(1)) + '</span>';
    if (repo.private) badges += '<span class="hx-pill hx-pill-status" data-tip="Only people in our organisation can see it.">Private</span>';
    var acc = accessLabel(repo); if (acc) badges += '<span class="hx-pill hx-pill-with" data-tip-title="Your access" data-tip="' + esc({ Admin: 'You can change it and its settings.', Maintain: 'You can change it and some settings.', Write: 'You can make changes.', Triage: 'You can manage issues.', Read: 'You can look, but not change it.' }[acc] || '') + '">' + esc(acc) + '</span>';
    info.helps.forEach(function (h) { badges += '<span class="hx-pill">' + I('users') + esc(HX.HELPS[h]) + '</span>'; });
    var actions = '';
    if (info.demo) actions += '<button type="button" class="hx-btn primary" data-hx-demo="' + esc(repo.name) + '">' + I('play') + 'Try the demo</button>';
    if (repo.has_pages) actions += '<a class="hx-btn' + (info.demo ? '' : ' primary') + '" href="' + esc(safeHttpUrl(pagesUrl(repo))) + '" target="_blank" rel="noopener">Open the live page' + I('ext') + '</a>';
    if (info.live_url) actions += '<a class="hx-btn" href="' + esc(info.live_url) + '" target="_blank" rel="noopener">Open the site' + I('ext') + '</a>';
    actions += '<a class="hx-btn" href="' + esc(safeHttpUrl(repo.html_url)) + '" target="_blank" rel="noopener">Open on GitHub' + I('ext') + '</a>';
    actions += '<button type="button" class="hx-btn" data-hx-copylink="1">' + I('link') + 'Copy link</button>';
    var facts = '<div class="hx-facts"><span>Updated <b>' + esc(timeAgo(repo.pushed_at || repo.updated_at)) + '</b></span>' + (info.runs.length ? '<span>Runs on <b>' + esc(info.runs.map(function (s) { return s.name; }).join(', ')) + '</b></span>' : '') + (info.owner ? '<span>Owner <b>' + esc(info.owner) + '</b></span>' : '') + '</div>';
    var thumbs = info.gallery.length > 1 ? '<div class="hx-thumbs">' + info.gallery.map(function (g, i) { return '<button type="button" class="hx-thumb" data-hx-lb="' + i + '" aria-label="' + esc(g.alt || g.caption || 'Picture ' + (i + 1)) + '"><img alt="" data-hx-img="' + esc(g.src) + '" data-hx-repo="' + esc(repo.name) + '"></button>'; }).join('') + '</div>' : '';
    var out = '<div class="hx-proj-hero"><div>' + purposeTag(info, true) + '<h1>' + esc(info.name) + '</h1><p class="hx-proj-tag">' + esc(info.tagline) + '</p><div class="hx-chiprow">' + badges + '</div>' + facts + '<div class="hx-proj-actions">' + actions + '</div></div>' +
      '<div class="hx-proj-media"><div class="hx-proj-cover">' + coverMedia(info) + '</div>' + thumbs + '</div></div>';
    out += '<div class="hx-ptabs" role="tablist">' + [['overview', 'Overview', 'What it does'], ['built', 'How it’s built', 'Languages and files'], ['code', 'Code', 'For developers']].map(function (t) {
      return '<button type="button" role="tab" class="hx-ptab" aria-selected="' + (tab === t[0]) + '" data-hx-ptab="' + t[0] + '">' + t[1] + '<small>' + t[2] + '</small></button>';
    }).join('') + '</div><div id="hx-ppane" style="--hx-c:' + st.color + '">' + projectPane(info, tab) + '</div>';
    out += related(info, list);
    return out;
  };
  function projectPane(info, tab) {
    var repo = info.repo, k = HX.KINDS[info.kind];
    var explain = '<div class="hx-explain">' + I('info') + '<div><b>This is ' + (/^[aeiou]/i.test(k.label) ? 'an ' : 'a ') + esc(k.label.charAt(0).toLowerCase() === k.label.charAt(0) || /^Word/.test(k.label) ? k.label : k.label.charAt(0).toLowerCase() + k.label.slice(1)) + '</b>' + esc(k.explain) + (info.kind === 'snippet' || info.kind === 'plugin' || info.kind === 'theme' ? ' The live site is the true version. The copy on GitHub is for review and history.' : '') + '</div></div>';
    var side = '';
    var w = info.works.filter(function (x) { return !HX.EVERYWHERE[x]; }).concat(info.works.filter(function (x) { return HX.EVERYWHERE[x]; }));
    if (w.length) side += '<div class="hx-box"><h3>Works with</h3><div class="hx-with">' + w.map(function (x) { return '<a href="' + wHref(x) + '"><b>' + esc(x) + '</b>' + (HX.PLATFORMS[x] ? '<span>' + esc(HX.PLATFORMS[x]) + '</span>' : '') + '</a>'; }).join('') + '</div></div>';
    if (info.runs.length) side += '<div class="hx-box"><h3>Where it runs</h3><div class="hx-chiprow">' + info.runs.map(function (s) { return '<a class="hx-pill hx-pill-site" href="' + href('site/' + encodeURIComponent(s.site)) + '">' + esc(s.name) + '</a>'; }).join('') + '</div></div>';
    if (tab === 'overview') {
      var main = explain;
      if (info.features.length) main += '<div class="hx-box" style="margin-top:16px"><h3>What you can do with it</h3><div class="hx-features">' + info.features.map(function (f, i) { return '<div class="hx-feature"><i>' + (i + 1) + '</i><span>' + HX.md(f) + '</span></div>'; }).join('') + '</div></div>';
      var wide = '';
      if (info.guides.length) wide += '<div class="hx-box" style="margin-top:22px"><h3>Step by step</h3><div id="hx-guide"></div></div>';
      if (info.gallery.length) wide += '<div class="hx-box"><h3>Pictures</h3><div class="hx-thumbs" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">' + info.gallery.map(function (g, i) { return '<figure style="margin:0"><button type="button" class="hx-thumb" style="width:100%" data-hx-lb="' + i + '" aria-label="' + esc(g.alt || g.caption || '') + '"><img alt="' + esc(g.alt || '') + '" data-hx-img="' + esc(g.src) + '" data-hx-repo="' + esc(repo.name) + '"></button><figcaption style="font-size:12.5px;color:#5A6470;line-height:1.45;margin-top:6px">' + esc(g.caption || '') + '</figcaption></figure>'; }).join('') + '</div></div>';
      else if (!info.cover) main += '<div class="hx-box" style="background:#F8F9FB"><h3>' + I('image').replace('<svg', '<svg width="16" height="16"') + 'No pictures yet</h3><p style="margin:0;font-size:13px;color:#5A6470;line-height:1.55">Screenshots and step-by-step guides make a project easier to understand. Add them to the <code>hub</code> folder of the repository, as the house standard describes.</p></div>';
      wide += '<div class="hx-box" style="margin-top:16px"><h3>Staff notes</h3><div class="hx-notes-grid"><div id="hx-notes" class="doc-body">' + docSkeleton() + '</div><aside class="hx-notes-side" id="hx-notes-side" aria-label="About these notes" hidden></aside></div></div>';
      return '<div class="hx-cols"><div>' + main + '</div><div>' + side + '</div></div>' + wide;
    }
    if (tab === 'built') {
      var tot = info.langs.reduce(function (s, l) { return s + l.size; }, 0);
      var langs = info.langs.length ? '<div class="hx-box"><h3>What it is written in</h3>' + langBar(info) + '<div style="margin-top:10px">' + langKey(info, true) + '</div><p style="margin:10px 0 0;font-size:12px;color:#6B6B6B">Measured by the amount of code: ' + esc(fmtBytes(tot)) + ' in total.</p></div>' : '';
      var kv = '<dl class="hx-kv"><dt>Repository</dt><dd>' + esc(repo.full_name) + '</dd><dt>Size</dt><dd>' + esc(fmtSize(repo.size)) + '</dd><dt>Created</dt><dd>' + esc(new Date(repo.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })) + '</dd>' +
        (info.last ? '<dt>Last change</dt><dd>' + esc(timeAgo(info.last.date)) + ': ' + esc(info.last.msg) + '</dd>' : '') + '<dt>Main branch</dt><dd>' + esc(repo.default_branch || '') + '</dd>' +
        ((repo.topics || []).length ? '<dt>Topics</dt><dd style="font-weight:600">' + esc(repo.topics.join(', ')) + '</dd>' : '') + '</dl>';
      return '<div class="hx-cols"><div>' + explain + '<div style="margin-top:16px">' + langs + '</div><div class="hx-box"><h3>Developer notes (README)</h3><div id="hx-readme" class="doc-body">' + docSkeleton() + '</div></div></div><div><div class="hx-box"><h3>Facts</h3>' + kv + '</div><div class="hx-box"><h3>Files at the top level</h3><div id="hx-files" class="hx-filelist"><div class="hx-skel" style="height:120px"></div></div></div>' + side + '</div></div>';
    }
    var clone = 'git clone ' + safeHttpUrl(repo.clone_url || (repo.html_url + '.git'));
    return '<div class="hx-cols"><div><div class="hx-box"><h3>Get the code</h3><div class="hx-clone"><code>' + esc(clone) + '</code><button type="button" data-hx-copy="' + esc(clone) + '">Copy</button></div>' +
      '<div class="hx-proj-actions"><button type="button" class="hx-btn primary" data-hx-explore="' + esc(repo.name) + '">' + I('code') + 'Browse code and files</button><a class="hx-btn" target="_blank" rel="noopener" href="' + esc(safeHttpUrl(repo.html_url + '/commits')) + '">History of changes' + I('ext') + '</a><a class="hx-btn" target="_blank" rel="noopener" href="' + esc(safeHttpUrl(repo.html_url + '/issues')) + '">Issues' + I('ext') + '</a></div></div>' +
      (info.langs.length ? '<div class="hx-box"><h3>Languages</h3>' + langBar(info) + '<div style="margin-top:10px">' + langKey(info) + '</div></div>' : '') +
      '<div class="hx-box"><h3>README</h3><div id="hx-readme" class="doc-body">' + docSkeleton() + '</div></div></div><div><div class="hx-box"><h3>Files at the top level</h3><div id="hx-files" class="hx-filelist"><div class="hx-skel" style="height:120px"></div></div></div>' + side + '</div></div>';
  }
  function fmtBytes(b) { return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : b > 1024 ? Math.round(b / 1024) + ' KB' : b + ' bytes'; }
  function related(info, list) {
    var scored = list.filter(function (o) { return o !== info; }).map(function (o) {
      var s = 0;
      if (o.purpose === info.purpose) s += 3;
      o.works.forEach(function (w) { if (!HX.EVERYWHERE[w] && info.works.indexOf(w) >= 0) s += 2; });
      o.runs.forEach(function (r) { if (info.runs.some(function (x) { return x.site === r.site; })) s += 2; });
      if (o.kind === info.kind) s += 1;
      return { o: o, s: s };
    }).filter(function (x) { return x.s >= 3; }).sort(function (a, b) { return b.s - a.s || HX.sortFriendly(a.o, b.o); }).slice(0, 12).map(function (x) { return x.o; });
    return related.length || scored.length ? '<section class="hx-sec">' + secHead('discover', '#27AAE1', 'More like this', 'Projects with the same purpose, platforms or site.') + shelf(scored) + '</section>' : '';
  }
  /* Beside the staff notes: a list of their sections, who to ask, and where the notes live. */
  function notesSide(info, notes) {
    var side = document.getElementById('hx-notes-side'); if (!side) return;
    var hs = Array.prototype.slice.call(notes.querySelectorAll('h2'));
    hs.forEach(function (h, i) { if (!h.id) h.id = 'hx-n-' + i; });
    var repo = info.repo, url = repo.html_url + '/blob/' + encodeURIComponent(repo.default_branch || 'main') + '/CLREADME.md';
    side.innerHTML = (hs.length > 1 ? '<nav class="hx-notes-toc" aria-label="In these notes"><b>In these notes</b><ol>' + hs.map(function (h) { return '<li><button type="button" data-hx-notes-go="' + esc(h.id) + '">' + esc(h.textContent.trim()) + '</button></li>'; }).join('') + '</ol></nav>' : '') +
      '<div class="hx-notes-facts"><b>About these notes</b>' +
      (info.owner ? '<span>Who to ask: <strong>' + esc(info.owner) + '</strong></span>' : '') +
      '<span>Last change to the project: ' + esc(timeAgo(repo.pushed_at || repo.updated_at)) + '</span>' +
      '<span>The notes are the file CLREADME.md in the project. <a href="' + esc(url) + '" target="_blank" rel="noopener">Open it on GitHub</a></span></div>';
    side.hidden = false;
  }
  function afterProject(info, tab) {
    var repo = info.repo;
    var notes = document.getElementById('hx-notes');
    if (notes) fetchRenderedCLReadme(repo.name).then(function (val) {
      if (!document.body.contains(notes)) return;
      if (!val) { notes.innerHTML = '<p class="text-body-muted">This project has no staff notes yet.</p>'; return; }
      notes.innerHTML = val.html || '';
      var h1 = notes.querySelector('h1'); if (h1) h1.remove();
      var sig = notes.querySelector('p'); if (sig && /^Cobblestone Learning\s*\u00b7/.test(sig.textContent.trim())) sig.remove();
      try { enhanceSharedNotes(notes, repo, val, function () { afterProject(info, tab); }); } catch (e) { console.error('shared notes', e); }
      notesSide(info, notes);
    });
    var rd = document.getElementById('hx-readme');
    if (rd) fetchRenderedReadme(repo.name).then(function (html) { if (document.body.contains(rd)) rd.innerHTML = html || '<p class="text-body-muted">This project has no README yet.</p>'; });
    var files = document.getElementById('hx-files');
    if (files) ghFetch('https://api.github.com/repos/' + repo.full_name + '/contents/').then(function (r) { return r.ok ? r.json() : []; }).then(function (items) {
      if (!document.body.contains(files)) return;
      if (!Array.isArray(items) || !items.length) { files.innerHTML = '<p class="text-body-muted" style="font-size:13px">No files to show.</p>'; return; }
      items.sort(function (a, b) { return (a.type === b.type ? 0 : a.type === 'dir' ? -1 : 1) || a.name.localeCompare(b.name); });
      files.innerHTML = items.slice(0, 40).map(function (f) { return '<div class="hx-file">' + I(f.type === 'dir' ? 'folder' : 'file').replace('<svg', '<svg width="14" height="14"') + esc(f.name) + (f.type === 'file' ? '<small>' + esc(fmtBytes(f.size)) + '</small>' : '') + '</div>'; }).join('') +
        '<button type="button" class="hx-btn sm" style="margin-top:8px" data-hx-explore="' + esc(repo.name) + '">' + I('code') + 'Browse all files</button>';
    }).catch(function () {});
    if (document.getElementById('hx-guide')) guideViewer(info, 0, 0);
  }
  function guideViewer(info, gi, si) {
    var box = document.getElementById('hx-guide'); if (!box) return;
    var g = info.guides[gi], steps = g.steps || [], step = steps[si] || {};
    var COL = { step: '#0074B4', area: '#0074B4', alt: '#E69B00', avoid: '#C0392B', focus: '#27AAE1' };
    var pick = info.guides.length > 1 ? '<div class="hx-chiprow" style="margin-bottom:12px">' + info.guides.map(function (x, i) { return '<button type="button" class="hx-pill' + (i === gi ? ' hx-pill-with' : '') + '" data-hx-guide="' + i + '">' + esc(x.title || 'Guide ' + (i + 1)) + '</button>'; }).join('') + '</div>' : '';
    var marks = (step.marks || []).map(function (m) {
      var c = COL[m.kind] || COL.step, num = function (v) { v = +v; return isFinite(v) ? Math.max(0, Math.min(100, v)) : 0; };
      var edge = (num(m.y) < 5 ? ' at-top' : '') + (num(m.x) < 3 ? ' at-left' : '') + (num(m.x) + num(m.w) > 82 ? ' at-right' : '') + (num(m.y) + num(m.h) > 90 ? ' at-bottom' : '');
      return '<div class="hx-mark' + (m.kind === 'focus' ? ' focus-only' : '') + edge + '" style="--hx-mc:' + c + ';left:' + num(m.x) + '%;top:' + num(m.y) + '%;width:' + num(m.w) + '%;height:' + num(m.h) + '%">' + (m.n && m.kind !== 'focus' ? '<span class="hx-mark-n">' + esc(m.n) + '</span>' : '') + (m.label ? '<span class="hx-mark-l" role="note">' + esc(m.label) + '</span>' : '') + '</div>';
    }).join('');
    box.innerHTML = pick + '<div class="hx-guide"><div><div class="hx-shot">' + (step.image ? '<img alt="' + esc(step.alt || String(step.text || '').replace(/\*\*/g, '')) + '" data-hx-img="' + esc(step.image) + '" data-hx-repo="' + esc(info.repo.name) + '" style="opacity:1">' : '<div style="aspect-ratio:16/10"></div>') + marks + '</div>' +
      '<div style="display:flex;gap:8px;margin-top:10px;align-items:center"><button type="button" class="hx-btn sm" data-hx-step="' + (si - 1) + '"' + (si <= 0 ? ' disabled' : '') + '>' + I('left') + 'Back</button><span style="font-size:12.5px;font-weight:700;color:#6B6B6B">Step ' + (si + 1) + ' of ' + steps.length + '</span><button type="button" class="hx-btn sm primary" data-hx-step="' + (si + 1) + '"' + (si >= steps.length - 1 ? ' disabled' : '') + '>Next' + I('right') + '</button></div></div>' +
      '<div class="hx-steps">' + (g.title ? '<b style="font-size:14px">' + esc(g.title) + '</b>' : '') + steps.map(function (s, i) { return '<button type="button" class="hx-step" data-hx-step="' + i + '"' + (i === si ? ' aria-current="step"' : '') + '><b>' + (i + 1) + '</b><span>' + HX.md(s.text || '') + '</span></button>'; }).join('') + '</div></div>';
    box.onclick = function (e) {
      var b = e.target.closest('[data-hx-step],[data-hx-guide]'); if (!b || b.disabled) return;
      if (b.hasAttribute('data-hx-guide')) guideViewer(info, +b.getAttribute('data-hx-guide'), 0);
      else guideViewer(info, gi, +b.getAttribute('data-hx-step'));
    };
    loadImages(box);
  }
  function lightbox(info, i) {
    var g = info.gallery; if (!g.length) return;
    var ov = document.createElement('div'); ov.className = 'hx-lightbox'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    function show() {
      var it = g[i];
      ov.innerHTML = '<img alt="' + esc(it.alt || '') + '"><p>' + esc(it.caption || '') + '</p><div class="hx-lb-bar"><button type="button" data-d="-1">Back</button><span style="color:#fff;font-weight:700;align-self:center;font-size:13px">' + (i + 1) + ' of ' + g.length + '</span><button type="button" data-d="1">Next</button><button type="button" data-d="0">Close</button></div>';
      HX.image(info.repo, it.src).then(function (u) { var im = ov.querySelector('img'); if (im) im.src = u; }).catch(function () {});
      var c = ov.querySelector('[data-d="0"]'); if (c) c.focus();
    }
    function close() { ov.remove(); document.removeEventListener('keydown', key); }
    function key(e) { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') { i = (i + 1) % g.length; show(); } if (e.key === 'ArrowLeft') { i = (i - 1 + g.length) % g.length; show(); } }
    ov.addEventListener('click', function (e) { var b = e.target.closest('[data-d]'); if (e.target === ov) return close(); if (!b) return; var d = +b.getAttribute('data-d'); if (!d) return close(); i = (i + d + g.length) % g.length; show(); });
    document.addEventListener('keydown', key); document.body.appendChild(ov); show();
  }

  /* ---------------- Images, tips, dev cards ---------------- */
  var imgObs = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { imgObs.unobserve(e.target); fetchImg(e.target); } });
  }, { rootMargin: '200px' }) : null;
  function fetchImg(img) {
    var info = HX.byName(img.getAttribute('data-hx-repo')); if (!info) return;
    HX.image(info.repo, img.getAttribute('data-hx-img')).then(function (u) { img.onload = function () { img.classList.add('ok'); }; img.src = u; }).catch(function () { img.remove(); });
  }
  function loadImages(scope) { scope.querySelectorAll('img[data-hx-img]:not([src])').forEach(function (img) { if (imgObs) imgObs.observe(img); else fetchImg(img); }); }

  var tip = null;
  function showTip(el, x, y) {
    if (!tip) { tip = document.createElement('div'); tip.className = 'hx-tip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); }
    var t = el.getAttribute('data-tip') || '', h = el.getAttribute('data-tip-title') || '', k = el.getAttribute('data-tip-k') || '';
    if (!t && !h) return;
    tip.innerHTML = (k ? '<em>' + esc(k) + '</em>' : '') + (h ? '<b>' + esc(h) + '</b>' : '') + esc(t);
    var r = tip.getBoundingClientRect(), px = Math.min(window.innerWidth - r.width - 10, Math.max(10, x + 14)), py = y + 18 + r.height > window.innerHeight ? y - r.height - 12 : y + 18;
    tip.style.left = px + 'px'; tip.style.top = py + 'px'; tip.classList.add('on');
  }
  function hideTip() { if (tip) tip.classList.remove('on'); }
  document.addEventListener('mouseover', function (e) { var el = e.target.closest && e.target.closest('[data-tip],[data-tip-title]'); if (el) showTip(el, e.clientX, e.clientY); else hideTip(); });
  document.addEventListener('mousemove', function (e) { if (tip && tip.classList.contains('on')) { var el = e.target.closest && e.target.closest('[data-tip],[data-tip-title]'); if (el) showTip(el, e.clientX, e.clientY); } });
  document.addEventListener('focusin', function (e) { var el = e.target.closest && e.target.closest('[data-tip],[data-tip-title]'); if (el) { var r = el.getBoundingClientRect(); showTip(el, r.left, r.bottom - 10); } else hideTip(); });
  document.addEventListener('scroll', hideTip, { passive: true });

  function mountDevCards(scope) {
    scope.querySelectorAll('[data-hx-dev]').forEach(function (grid) {
      var names = grid.getAttribute('data-hx-dev').split(',').filter(Boolean);
      names.forEach(function (n, i) { var info = HX.byName(n); if (info) grid.appendChild(buildRepoCard(info.repo, i)); });
    });
  }

  /* ---------------- Navigation bar ---------------- */
  function buildNav() {
    var tabs = document.getElementById('hx-tabs');
    if (tabs) tabs.innerHTML = VIEWS.map(function (v) { return '<a class="hx-tab" role="listitem" href="' + href(v.id) + '" data-hx-tab="' + v.id + '">' + I(v.icon) + esc(v.label) + '</a>'; }).join('');
    var seg = document.getElementById('hx-level');
    if (seg) seg.innerHTML = LEVELS.map(function (l) { return '<button type="button" role="radio" data-hx-level="' + l.id + '" aria-checked="' + (HX.level === l.id) + '">' + esc(l.label) + '</button>'; }).join('');
    var nav = document.getElementById('hx-nav');
    function navH() { if (nav) document.documentElement.style.setProperty('--hx-nav-h', nav.offsetHeight + 'px'); }
    navH(); window.addEventListener('resize', navH, { passive: true });
  }
  function setNav(route) {
    var cur = VIEW_BY[route.view] ? route.view : route.view === 'p' || route.view === 'purpose' || route.view === 'with' || route.view === 'site' ? '' : 'discover';
    document.querySelectorAll('[data-hx-tab]').forEach(function (a) { if (a.getAttribute('data-hx-tab') === cur) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.querySelectorAll('[data-hx-level]').forEach(function (b) { b.setAttribute('aria-checked', String(b.getAttribute('data-hx-level') === HX.level)); });
    var c = document.getElementById('hx-crumbs'); if (!c) return;
    var trail = [['Explore', href('discover')]];
    if (VIEW_BY[route.view] && route.view !== 'discover') trail.push([VIEW_BY[route.view].label]);
    if (route.view === 'purpose' && HX.PURPOSE[route.arg]) trail.push(['Learner journey', href('journey')], [HX.PURPOSE[route.arg].label]);
    if (route.view === 'with') trail.push(['Connections', href('connections')], [route.arg]);
    if (route.view === 'site') { var s = HX.index(HX.list()).sites[route.arg]; trail.push(['Sites', href('sites')], [s ? s.name : route.arg]); }
    if (route.view === 'p') { var info = HX.byName(route.arg); if (info) trail.push([HX.PURPOSE[info.purpose].label, href('purpose/' + info.purpose)], [info.name]); }
    c.innerHTML = trail.map(function (t, i) { return (i ? '<span class="sep">›</span>' : '') + (t[1] && i < trail.length - 1 ? '<a href="' + t[1] + '">' + esc(t[0]) + '</a>' : '<span class="cur">' + esc(t[0]) + '</span>'); }).join('');
  }

  /* search box: suggestions everywhere, live filtering on the map and the list */
  function wireSearch() {
    var wrap = document.getElementById('hx-search'), input = document.getElementById('hx-q'), sug = document.getElementById('hx-suggest'), clear = document.getElementById('hx-q-x');
    if (!input) return;
    var active = -1, t = null;
    function suggest() {
      var q = input.value.trim(); wrap.classList.toggle('has-q', !!q);
      var route = parseRoute();
      if (route.view === 'city') { sug.classList.remove('open'); clearTimeout(t); t = setTimeout(function () { var ci = document.getElementById('hx-city-q'); if (ci) ci.value = q; citySearch(q); }, 160); return; }
      if (route.view === 'map' || route.view === 'all') { sug.classList.remove('open'); clearTimeout(t); t = setTimeout(function () { HX.q = q; if (route.view === 'all') { var p = Object.assign({}, route.params, { q: q }); history.replaceState(null, '', href('all', p)); } HX.render(); }, 140); return; }
      if (!q) { sug.classList.remove('open'); return; }
      var hits = HX.list().filter(function (i) { return HX.matches(i, q); }).sort(HX.sortFriendly);
      sug.innerHTML = hits.slice(0, 7).map(function (i) { return '<a href="' + pHref(i) + '">' + HX.rowIcon(i) + '<span style="min-width:0"><span class="hx-sg-t">' + esc(i.name) + '</span><span class="hx-sg-s">' + esc(i.tagline) + '</span></span></a>'; }).join('') +
        '<a class="hx-sg-all" href="' + href('all', { q: q }) + '">' + (hits.length ? 'See all ' + plural(hits.length, 'result', 'results') : 'No matches. Search all projects') + '</a>';
      sug.classList.add('open'); active = -1;
    }
    input.addEventListener('input', suggest);
    input.addEventListener('focus', function () { if (input.value.trim()) suggest(); });
    input.addEventListener('keydown', function (e) {
      var links = sug.querySelectorAll('a');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { if (!links.length) return; e.preventDefault(); active = (active + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length; links.forEach(function (l, i) { l.classList.toggle('active', i === active); }); }
      else if (e.key === 'Enter' && parseRoute().view === 'city') { e.preventDefault(); if (city) city.frameMatches(); }
      else if (e.key === 'Enter') { e.preventDefault(); var q = input.value.trim(); sug.classList.remove('open'); if (active >= 0 && links[active]) location.hash = links[active].getAttribute('href'); else { HX.q = q; HX.go('all', { q: q }); } }
      else if (e.key === 'Escape') { sug.classList.remove('open'); }
    });
    document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) sug.classList.remove('open'); });
    sug.addEventListener('click', function () { sug.classList.remove('open'); });
    clear.addEventListener('click', function () { input.value = ''; HX.q = ''; wrap.classList.remove('has-q'); sug.classList.remove('open'); var r = parseRoute(); if (r.view === 'all') { delete r.params.q; HX.go('all', r.params); } else HX.render(); input.focus(); });
  }

  /* ---------------- Render ---------------- */
  var lastRoute = '', firstScroll = false;
  /* Bring the view into sight under the sticky header and explorer bar. The City is
     scrolled so that the whole stage shows; other views only when the reader is below them. */
  function scrollToView(route, force) {
    var nav = document.getElementById('hx-nav'), hh = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 68;
    var top = document.getElementById('explore').getBoundingClientRect().top + window.scrollY - hh + 1;
    if (route.view === 'city') { var stg = document.getElementById('hx-city'); if (stg) top = stg.getBoundingClientRect().top + window.scrollY - hh - (nav ? nav.offsetHeight : 0) - 12; }
    if (force || window.scrollY > top || route.view === 'p' || route.view === 'city' || HX._scrollNext) window.scrollTo({ top: top, behavior: force || matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  HX.render = function () {
    var mount = document.getElementById('hx-view'); if (!mount) return;
    var route = parseRoute();
    setNav(route);
    if (!ALL_REPOS.length) { mount.innerHTML = skeleton(); return; }
    var list = HX.list();
    var fn = R[route.view] || R.discover;
    if (graphStop) { graphStop(); graphStop = null; }
    mount.innerHTML = fn(list, route);
    mount.setAttribute('aria-busy', 'false');
    mountDevCards(mount); loadImages(mount); observeReveals(mount);
    if (route.view === 'journey') drawRoad(list);
    if (route.view === 'city') afterCity(list, route);
    else { if (city && city.walking) city.exitWalk(true); if (document.body.classList.contains('hx-city-full')) cityFull(false); }
    if (route.view === 'connections') { drawGraph(list, HX._gAll); graphPanel(list, null); var tg = document.getElementById('hx-g-all'); if (tg) tg.setAttribute('aria-pressed', String(!!HX._gAll)); }
    if (route.view === 'p') { var info = HX.byName(route.arg); if (info) afterProject(info, route.params.tab || (HX.level === 'overview' ? 'overview' : HX.level)); }
    var key = route.view + '/' + route.arg;
    if (firstScroll) { firstScroll = false; setTimeout(function () { scrollToView(parseRoute(), true); }, 30); setTimeout(function () { var r = parseRoute(); if (r.view === 'city') scrollToView(r, true); }, 900); }   /* again once the header above has settled */
    else if (key !== lastRoute && lastRoute) scrollToView(route, false);
    lastRoute = key; HX._scrollNext = false;
    var st = document.getElementById('repo-status'); if (st) announceStatus(st, (VIEW_BY[route.view] ? VIEW_BY[route.view].label : 'Page') + ' shown.');
  };

  /* ---------------- Events (delegated, bound once) ---------------- */
  function wire() {
    document.addEventListener('click', function (e) {
      var t = e.target;
      var demo = t.closest('[data-hx-demo]'); if (demo) { e.preventDefault(); e.stopPropagation(); var di = HX.byName(demo.getAttribute('data-hx-demo')); if (di) openDemo(di.repo); return; }
      var lv = t.closest('[data-hx-level]'); if (lv) { HX.setLevel(lv.getAttribute('data-hx-level')); return; }
      var so = t.closest('#scope-toggle .view-opt'); if (so) { var sc2 = so.getAttribute('data-scope'); if (sc2 && sc2 !== SCOPE) { SCOPE = sc2; try { localStorage.setItem('cb_scope', SCOPE); } catch (e2) {} updateScopeUI(); HX.render(); } return; }
      var sc = t.closest('[data-hx-scroll]'); if (sc) { e.preventDefault(); var tg = document.getElementById(sc.getAttribute('data-hx-scroll')); if (tg) tg.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      var sh = t.closest('[data-hx-shelf]'); if (sh) { var tr = sh.parentNode.querySelector('.hx-shelf-track'); tr.scrollBy({ left: +sh.getAttribute('data-hx-shelf') * tr.clientWidth * .85, behavior: 'smooth' }); return; }
      var route = parseRoute();
      var f = t.closest('[data-hx-f]'); if (f) { var k = f.getAttribute('data-hx-f'), v = f.getAttribute('data-hx-v'), cur = getSel(route.params, k), at = cur.indexOf(v); if (at >= 0) cur.splice(at, 1); else cur.push(v); var p = Object.assign({}, route.params); p[k] = cur.join(','); HX.go('all', p); return; }
      var tgl = t.closest('[data-hx-t]'); if (tgl) { var key = tgl.getAttribute('data-hx-t'); if (key === 'extra') { HX.showExtra = !HX.showExtra; HX.render(); return; } var p2 = Object.assign({}, route.params); p2[key] = route.params[key] === '1' ? '' : '1'; HX.go('all', p2); return; }
      var ft = t.closest('[data-hx-ftoggle]'); if (ft) { ft.closest('.hx-filters').classList.toggle('open'); return; }
      var lay = t.closest('[data-hx-layout]'); if (lay) { var p3 = Object.assign({}, route.params, { layout: lay.getAttribute('data-hx-layout') }); HX.go('all', p3); return; }
      var pt = t.closest('[data-hx-ptab]'); if (pt) { var p4 = Object.assign({}, route.params, { tab: pt.getAttribute('data-hx-ptab') }); history.replaceState(null, '', href(route.view + '/' + encodeURIComponent(route.arg), p4)); HX.render(); return; }
      var ex = t.closest('[data-hx-explore]'); if (ex) { var ei = HX.byName(ex.getAttribute('data-hx-explore')); if (ei) { lastFocused = ex; showRepoExplore(ei.repo); openModal(); } return; }
      var ng = t.closest('[data-hx-notes-go]'); if (ng) { var hd = document.getElementById(ng.getAttribute('data-hx-notes-go')); if (hd) { var nav = document.getElementById('hx-nav'), off = (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 68) + (nav ? nav.offsetHeight : 0) + 14; window.scrollTo({ top: hd.getBoundingClientRect().top + window.scrollY - off, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); } return; }
      var cp = t.closest('[data-hx-copy]'); if (cp) { copyText(cp.getAttribute('data-hx-copy'), function (ok) { if (ok) { cp.textContent = 'Copied'; setTimeout(function () { cp.textContent = 'Copy'; }, 1500); } }); return; }
      var cl = t.closest('[data-hx-copylink]'); if (cl) { copyText(location.href, function (ok) { if (ok) showToast('Link copied. Paste it anywhere to share this page.'); }); return; }
      var lb = t.closest('[data-hx-lb]'); if (lb) { var li = HX.byName(route.arg); if (li) lightbox(li, +lb.getAttribute('data-hx-lb')); return; }
      var hub = t.closest('[data-hx-hub]'); if (hub && route.view === 'connections') { e.preventDefault(); if (HX._graphSelect) HX._graphSelect(hub.getAttribute('data-hx-hub') || null); return; }
      var gAll = t.closest('#hx-g-all'); if (gAll) { HX._gAll = !HX._gAll; HX.render(); return; }
      var cty = t.closest('[data-hx-city]'); if (cty) { e.preventDefault(); cityAction(cty.getAttribute('data-hx-city'), cty); return; }
      var go = t.closest('[data-hx-go]'); if (go && !t.closest('a[href]:not([data-hx-go]),button:not([data-hx-go])')) { e.preventDefault(); HX._scrollNext = !!go.closest('.cin-card'); location.hash = '#/' + go.getAttribute('data-hx-go'); return; }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var go = e.target.closest && e.target.closest('.cin-card[data-hx-go]'); if (go && e.target === go) { e.preventDefault(); HX._scrollNext = true; location.hash = '#/' + go.getAttribute('data-hx-go'); }
    });
    document.addEventListener('change', function (e) { if (e.target.id === 'hx-sort') { var r = parseRoute(); HX.go('all', Object.assign({}, r.params, { sort: e.target.value })); } });
    window.addEventListener('hashchange', function () { if (location.hash && !/^#\//.test(location.hash)) return; var r = parseRoute(); if (r.view === 'all' && r.params.q != null) { HX.q = r.params.q; var i = document.getElementById('hx-q'); if (i && i.value !== HX.q) { i.value = HX.q; document.getElementById('hx-search').classList.toggle('has-q', !!HX.q); } } HX.render(); });
    var rz = null; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { var r = parseRoute(); if (r.view === 'journey') drawRoad(HX.list()); if (r.view === 'connections') { drawGraph(HX.list(), HX._gAll); } }, 200); }, { passive: true });
  }

  HX.setLevel = function (lv) {
    if (lv === HX.level) return;
    HX.level = lv; VIEW = lv === 'code' ? 'dev' : 'staff';
    try { localStorage.setItem('cb_level', lv); } catch (e) {}
    var r = parseRoute();
    if (r.view === 'p' && r.params.tab) { delete r.params.tab; history.replaceState(null, '', href('p/' + encodeURIComponent(r.arg), r.params)); }
    HX.render(); HX.updateHero();
  };

  /* ---------------- The cinematic header, fed with explorer data ---------------- */
  HX.updateHero = function () {
    if (typeof window.cinRender !== 'function') return;
    var repos = ALL_REPOS.filter(function (r) { return !r._personal; }), list = repos.map(HX.info).filter(function (i) { return !HX.isCopy(i); });
    var now = Date.now(), latest = 0, a7 = 0, a30 = 0, DAYS = 91, daily = [], i;
    for (i = 0; i < DAYS; i++) daily.push(0);
    var mid = new Date(); mid.setHours(0, 0, 0, 0);
    var kinds = {}, demos = [];
    list.forEach(function (info) {
      kinds[info.kind] = (kinds[info.kind] || 0) + 1;
      if (info.demo) demos.push({ name: info.name, demoRepo: info.repo });
      else if (info.repo.has_pages) demos.push({ name: info.name, url: pagesUrl(info.repo) });
      var t = new Date(info.repo.pushed_at || info.repo.updated_at).getTime();
      if (!isNaN(t)) { if (t > latest) latest = t; if (t > now - 7 * 864e5) a7++; if (t > now - 30 * 864e5) a30++; var dm = new Date(t); dm.setHours(0, 0, 0, 0); var age = Math.round((mid - dm) / 864e5); if (age >= 0 && age < DAYS) daily[DAYS - 1 - age]++; }
    });
    var comp, palette = ['#27AAE1', '#0074B4', '#3D3D3D', '#FFC20E', '#2D9E5A', '#1582AB', '#8A6500'];
    if (HX.level === 'overview') {
      var idx = HX.index(list), names = Object.keys(idx.plats).filter(function (p) { return !HX.EVERYWHERE[p]; }).sort(function (a, b) { return idx.plats[b].length - idx.plats[a].length; });
      var tot = names.reduce(function (s, n) { return s + idx.plats[n].length; }, 0) || 1;
      comp = { count: names.length, items: names.map(function (n, k) { return { name: n, pct: idx.plats[n].length / tot * 100, color: palette[k % palette.length] }; }) };
    } else {
      var bytes = {}, colours = {};
      list.forEach(function (info) { info.langs.forEach(function (l) { bytes[l.name] = (bytes[l.name] || 0) + l.size; colours[l.name] = l.color; }); });
      var ln = Object.keys(bytes).sort(function (a, b) { return bytes[b] - bytes[a]; }), bt = ln.reduce(function (s, n) { return s + bytes[n]; }, 0) || 1;
      if (!ln.length) { list.forEach(function (info) { var l = info.repo.language === 'Hack' ? 'PHP' : info.repo.language; if (l) bytes[l] = (bytes[l] || 0) + 1; }); ln = Object.keys(bytes).sort(function (a, b) { return bytes[b] - bytes[a]; }); bt = ln.reduce(function (s, n) { return s + bytes[n]; }, 0) || 1; }
      comp = { count: ln.length, items: ln.map(function (n) { return { name: n, pct: bytes[n] / bt * 100, color: colours[n] || langColor(n) }; }) };
    }
    var order = HX.KIND_ORDER.filter(function (k) { return kinds[k]; }), cubeColors = [];
    order.forEach(function (k) { for (var j = 0; j < kinds[k]; j++) cubeColors.push(HX.KIND_COLOR[k]); });
    window.cinRender({ repositories: repos.length, languages: comp, lastUpdateMins: latest ? Math.max(0, Math.round((now - latest) / 60000)) : 0,
      activity: { daily: daily, active7: a7, active30: a30 }, liveDemos: { count: demos.length, items: demos }, cubeColors: cubeColors });
    var fr = document.getElementById('cin-f-repos');
    var top3 = order.slice().sort(function (a, b) { return kinds[b] - kinds[a]; }).slice(0, 3), rest = repos.length - top3.reduce(function (t, k) { return t + kinds[k]; }, 0);
    if (fr) fr.innerHTML = top3.map(function (k) { return '<span class="hx-kind-key"><i style="background:' + HX.KIND_COLOR[k] + '"></i>' + esc(HX.kindCount(k, kinds[k])) + '</span>'; }).join('') + (rest > 0 ? '<span class="hx-kind-key"><i style="background:#C9D2DC"></i>' + rest + ' other</span>' : '');
    function txt(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }
    var ov = HX.level === 'overview';
    txt('cin-k-langs', ov ? 'Works with' : 'Composition');
    txt('cin-l-langs', ov ? 'Platforms' : 'Languages');
    txt('cin-s-langs', ov ? 'that our projects plug into' : 'by amount of code');
  };

  /* Called by index.html once the repo list has loaded. */
  HX.onRepos = function () {
    HX._cache = {};
    HX.render(); HX.updateHero();
    if (!ghToken) HX.extra = {};
    HX.loadExtras().then(function () { HX._cache = {}; HX.render(); HX.updateHero(); });
  };
  HX.init = function () {
    VIEW = HX.level === 'code' ? 'dev' : 'staff';
    buildNav(); wireSearch(); wire();
    var r = parseRoute(); if (r.params.q) { HX.q = r.params.q; var i = document.getElementById('hx-q'); if (i) { i.value = HX.q; document.getElementById('hx-search').classList.add('has-q'); } }
    HX.render();
    if (location.hash && /^#\//.test(location.hash)) firstScroll = true;   /* done by the first render that has the view's content */
  };
})();
