/* ==========================================================================
   Repository hub: project data for the explorer.
   Everything here is generic: no client names, sites or private details. Those
   come at run time from the repos the viewer can see (hub/project.json,
   CLREADME.md, topics), so they never sit in this public file.
   Text follows LMS-CTE100 (British English, short sentences, plain words).
   Relies on globals from index.html: ghFetch, ghToken, ORG, ALL_REPOS,
   scopedRepos, CURATED, escapeHtml, langColor, safeAtob.
   ========================================================================== */
(function () {
  var HX = window.HX = window.HX || {};

  function I(p) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }
  HX.svg = I;

  var ICON = {
    look: '<circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.75 1.5-1.66 0-.43-.17-.81-.43-1.1-.26-.29-.42-.67-.42-1.1 0-.92.75-1.64 1.66-1.64H16c3.31 0 6-2.69 6-6 0-4.96-4.49-8.5-10-8.5z"/>',
    access: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    enrol: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
    courses: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    translation: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    engage: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    certify: '<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>',
    reports: '<path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/>',
    sites: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    tools: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    arrive: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>',
    stay: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    backstage: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    discover: '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
    city: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
    map: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
    journey: '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
    connections: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
    sitesview: '<rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>',
    news: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    all: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    glossary: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    play: '<polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none"/>',
    ext: '<line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    arrow: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
    left: '<polyline points="15 18 9 12 15 6"/>',
    right: '<polyline points="9 18 15 12 9 6"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    x: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'
  };
  HX.ICON = ICON;
  HX.icon = function (k) { return I(ICON[k] || ICON.info); };

  /* ---- The learner's journey: the order a learner meets our work ---- */
  HX.STAGES = [
    { id: 'arrive', label: 'Arrive and sign in', color: '#E0A800', tint: '#FFF6D6', ink: '#6B5000', icon: 'arrive',
      text: 'A learner finds the site, sees our branding and signs in.' },
    { id: 'join', label: 'Join and pay', color: '#E07B00', tint: '#FFEBD6', ink: '#7A4300', icon: 'enrol',
      text: 'The learner buys a course or joins a group, and gets access.' },
    { id: 'learn', label: 'Learn', color: '#27AAE1', tint: '#E3F4FC', ink: '#0B5F86', icon: 'courses',
      text: 'The learner works through lessons, videos, packages and quizzes.' },
    { id: 'stay', label: 'Stay on track', color: '#2D9E5A', tint: '#E2F5E9', ink: '#1E6B3D', icon: 'stay',
      text: 'Reminders, emails and the community keep the learner going.' },
    { id: 'finish', label: 'Finish and get certified', color: '#0074B4', tint: '#E0EEF7', ink: '#00507D', icon: 'certify',
      text: 'The learner completes the training and gets a certificate or CPD hours.' },
    { id: 'track', label: 'Report and improve', color: '#5B4FC4', tint: '#ECEAFB', ink: '#3A318A', icon: 'reports',
      text: 'Managers and clients see progress and results, and we improve the training.' },
    { id: 'backstage', label: 'Behind the scenes', color: '#4E6476', tint: '#E8EEF3', ink: '#3D4F5E', icon: 'backstage',
      text: 'Work that keeps the sites fast and safe, and tools that our team uses.' }
  ];
  HX.STAGE = {}; HX.STAGES.forEach(function (s) { HX.STAGE[s.id] = s; });

  /* ---- Purposes: what a project helps with. Order = order on the page. ---- */
  HX.PURPOSES = [
    { id: 'look', stage: 'arrive', label: 'How sites look', icon: 'look',
      blurb: 'Themes, styles and branding. They decide how a site looks on every page.' },
    { id: 'access', stage: 'arrive', label: 'Signing in, accounts and privacy', icon: 'access',
      blurb: 'Sign-in, registration, profiles and privacy. They control who gets in and what other people can see.' },
    { id: 'enrol', stage: 'join', label: 'Enrolment, shop and groups', icon: 'enrol',
      blurb: 'Checkout, enrolment and groups. They decide how a learner gets access to a course.' },
    { id: 'courses', stage: 'learn', label: 'Building courses and content', icon: 'courses',
      blurb: 'Tools and blocks for building lessons, packages, quizzes and activities.' },
    { id: 'translation', stage: 'learn', label: 'Translating content', icon: 'translation',
      blurb: 'Tools that translate courses, subtitles and other content into other languages.' },
    { id: 'engage', stage: 'stay', label: 'Reminders, emails and community', icon: 'engage',
      blurb: 'Reminder emails, notifications and community features that keep learners active.' },
    { id: 'certify', stage: 'finish', label: 'Certificates and compliance', icon: 'certify',
      blurb: 'Certificates, CPD hours, assessments and expiry dates for training that people must complete.' },
    { id: 'reports', stage: 'track', label: 'Reports and dashboards', icon: 'reports',
      blurb: 'Reports and dashboards that show progress and results to managers and clients.' },
    { id: 'sites', stage: 'backstage', label: 'Running and protecting sites', icon: 'sites',
      blurb: 'Speed, security, admin screens and fixes that keep our sites working well.' },
    { id: 'tools', stage: 'backstage', label: 'Our own helper tools', icon: 'tools',
      blurb: 'Tools that our own team uses to plan, check and publish work.' }
  ];
  HX.PURPOSE = {}; HX.PURPOSES.forEach(function (p) { HX.PURPOSE[p.id] = p; });
  HX.purposeColor = function (id) { var p = HX.PURPOSE[id] || HX.PURPOSE.sites; return HX.STAGE[p.stage]; };

  /* ---- Kinds: what a project is made as (size = stone size on the map) ---- */
  HX.KINDS = {
    app:     { label: 'Browser tool', plural: 'Browser tools', size: 3, explain: 'A tool that opens in a web browser. You do not need to install anything.' },
    website: { label: 'Website', plural: 'Websites', size: 3, explain: 'A website or web page that people open in a browser.' },
    plugin:  { label: 'WordPress plugin', plural: 'Plugins', size: 2, explain: 'An add-on that gives a WordPress site new features. Someone installs it on the site.' },
    theme:   { label: 'WordPress theme', plural: 'Themes', size: 2, explain: 'The design layer of a WordPress site. It controls how the pages look.' },
    package: { label: 'Course package', plural: 'Course packages', size: 2, explain: 'A packaged course or activity, for example SCORM, that a learning site can play.' },
    library: { label: 'Library', plural: 'Libraries', size: 2, explain: 'Shared code or blocks that another project uses.' },
    snippet: { label: 'Snippet', plural: 'Snippets', size: 1, explain: 'A short piece of code that runs on one site. An administrator switches it on or off in WPCode.' },
    scripts: { label: 'Scripts', plural: 'Scripts', size: 1, explain: 'Small scripts or bookmarklets that run in your browser to do one task.' }
  };
  HX.KIND_UNITS = { app: ['browser tool', 'browser tools'], website: ['website', 'websites'], plugin: ['plugin', 'plugins'], theme: ['theme', 'themes'],
    package: ['course package', 'course packages'], library: ['library', 'libraries'], snippet: ['snippet', 'snippets'], scripts: ['set of scripts', 'sets of scripts'] };
  HX.kindCount = function (k, n) { var u = HX.KIND_UNITS[k] || ['item', 'items']; return n + ' ' + (n === 1 ? u[0] : u[1]); };
  HX.KIND_ORDER = ['app', 'website', 'plugin', 'theme', 'package', 'library', 'snippet', 'scripts'];
  HX.KIND_COLOR = { app: '#27AAE1', website: '#46B9E8', plugin: '#0074B4', theme: '#FFC20E', package: '#2D9E5A', library: '#1582AB', snippet: '#8FD3F0', scripts: '#5B4FC4' };

  HX.HELPS = { 'learners': 'Learners', 'course builders': 'Course builders', 'admins': 'Administrators', 'managers': 'Managers', 'our team': 'Our team' };

  /* ---- Platforms (the "Works with" list) and other words worth knowing ---- */
  HX.PLATFORMS = {
    'LearnDash': 'The WordPress plugin that runs our courses. It handles lessons, quizzes, groups, progress and certificates.',
    'BuddyBoss': 'A WordPress platform for learning communities. It adds profiles, groups, forums and activity feeds.',
    'WooCommerce': 'The WordPress shop plugin. Learners use it to buy courses and pay at the checkout.',
    'Uncanny Automator': 'A WordPress plugin that connects other plugins. It does an action when something happens, for example when a learner completes a course.',
    'Tin Canny': 'Tin Canny LearnDash Reporting. It records what learners do in SCORM and xAPI packages and shows reports.',
    'H5P': 'A tool for interactive content inside a course, such as quizzes, drag-and-drop tasks and interactive videos.',
    'Elementor': 'A page builder for WordPress. Editors design pages from blocks without writing code.',
    'Gutenberg': 'The WordPress block editor. Editors build pages from blocks, such as headings, images and buttons.',
    'WPCode': 'A WordPress plugin that keeps short code snippets and switches each one on or off for a site.',
    'WordPress': 'The website platform that most of our learning sites run on.',
    'MemberPress': 'A WordPress plugin for memberships and paid access to content.',
    'DeepL': 'An online translation service. Our translation tools send text to DeepL and get the translation back.',
    'Articulate Rise': 'Rise 360, an online tool for building e-learning courses. It can export a course as XLIFF for translation.',
    'SCORM': 'Sharable Content Object Reference Model (SCORM). A standard format for e-learning packages, so any learning site can play them and record results.',
    'xAPI': 'Experience API (xAPI), also called Tin Can. A standard way to record learning activity, inside or outside a learning site.',
    'Microsoft Entra ID': 'The Microsoft sign-in and user directory. Many organisations use it for staff accounts.',
    'SiteGround': 'The hosting company that runs most of our WordPress sites.',
    'GitHub': 'The service where we keep the code for every project, with the full history of changes.',
    'Bulma': 'A CSS framework: ready-made styles for layouts, buttons and forms.',
    'WpProQuiz': 'The quiz engine inside LearnDash. LearnDash quiz exports use its format.',
    'Gravity Forms': 'A WordPress plugin for building forms.',
    'Vimeo': 'A video hosting service. Courses can show Vimeo videos.',
    'YouTube': 'A video hosting service. Courses can show YouTube videos.'
  };
  /* Platforms that nearly every project touches: kept out of the network so it stays readable. */
  HX.EVERYWHERE = { 'WordPress': 1, 'WPCode': 1 };
  var TOPIC_PLATFORM = { 'learndash': 'LearnDash', 'buddyboss': 'BuddyBoss', 'woocommerce': 'WooCommerce', 'uncanny-automator': 'Uncanny Automator',
    'tin-canny': 'Tin Canny', 'h5p': 'H5P', 'elementor': 'Elementor', 'gutenberg': 'Gutenberg', 'wpcode': 'WPCode', 'wordpress': 'WordPress',
    'memberpress': 'MemberPress', 'deepl': 'DeepL', 'scorm': 'SCORM', 'xapi': 'xAPI', 'entra-id': 'Microsoft Entra ID', 'siteground': 'SiteGround',
    'github': 'GitHub', 'bulma': 'Bulma', 'wpproquiz': 'WpProQuiz', 'gravity-forms': 'Gravity Forms', 'vimeo': 'Vimeo', 'youtube': 'YouTube' };

  HX.TERMS = [
    { term: 'Repository', group: 'GitHub words', text: 'A project folder on GitHub. It holds the files and the history of every change. People often say "repo".' },
    { term: 'Staff notes', group: 'GitHub words', text: 'Plain-language notes about a project for our team. Each project keeps them in a file called CLREADME.md.' },
    { term: 'README', group: 'GitHub words', text: 'The notes for developers: how the code is set up and how to change it.' },
    { term: 'Demo', group: 'GitHub words', text: 'A copy of a tool that opens in your browser, so you can try it safely.' },
    { term: 'Live site', group: 'GitHub words', text: 'The real website that people use. For anything that runs on a site, the live site is the true version.' },
    { term: 'Mirror', group: 'GitHub words', text: 'A copy of the code from a live site, kept on GitHub for review and history. A change to a mirror does not change the site.' },
    { term: 'LMS', group: 'Learning words', text: 'Learning Management System (LMS). The website where learners take courses and where we track their progress.' },
    { term: 'CPD', group: 'Learning words', text: 'Continuing Professional Development (CPD). Learning that professionals record to keep their skills current.' },
    { term: 'XLIFF', group: 'Learning words', text: 'XML Localisation Interchange File Format (XLIFF). A standard file format for sending text to translation.' },
    { term: 'Shortcode', group: 'WordPress words', text: 'A short tag in square brackets, for example [course_list]. WordPress replaces it with content on the page.' },
    { term: 'Child theme', group: 'WordPress words', text: 'A small theme that sits on top of another theme. It changes only what we need and keeps the rest.' },
    { term: 'Block', group: 'WordPress words', text: 'One part of a page in the WordPress editor, such as a heading, an image or a button.' }
  ];

  /* Plain words for programming languages (How it's built). Hack = GitHub's label for short PHP files. */
  HX.LANG_WORDS = {
    'PHP': 'the language WordPress runs on the server', 'JavaScript': 'makes pages interactive in the browser',
    'TypeScript': 'JavaScript with extra checks', 'CSS': 'controls colours, spacing and layout', 'SCSS': 'a form of CSS',
    'HTML': 'the structure of a web page', 'Python': 'scripts and tools', 'Shell': 'command-line scripts', 'Less': 'a form of CSS'
  };

  /* ---- State ---- */
  HX.extra = {};          // repo name (lower) -> { cl, hub, langs, langTotal, last }
  HX.extraReady = false;
  HX.level = 'overview';  // overview | built | code
  try { var lv = localStorage.getItem('cb_level'); if (lv === 'built' || lv === 'code' || lv === 'overview') HX.level = lv; } catch (e) {}

  function hash(s) { var h = 2166136261; s = String(s || ''); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  HX.hash = hash;
  HX.rand = function (seed, i) { var x = Math.imul((seed ^ (i + 1) * 2654435761) >>> 0, 1597334677) >>> 0; x ^= x >>> 15; return (x % 10000) / 10000; };

  /* ---- Bulk details: one GraphQL query per 50 repos (signed in only) ---- */
  var Q = 'query($org:String!,$after:String,$since:GitTimestamp!){organization(login:$org){repositories(first:50,after:$after){pageInfo{hasNextPage endCursor}nodes{name ' +
    'cl:object(expression:"HEAD:CLREADME.md"){...on Blob{text}} hub:object(expression:"HEAD:hub/project.json"){...on Blob{text}} ' +
    'languages(first:8,orderBy:{field:SIZE,direction:DESC}){totalSize edges{size node{name color}}} ' +
    'defaultBranchRef{target{...on Commit{history(first:1){nodes{committedDate messageHeadline}} recent:history(since:$since){totalCount}}}}}}}}';
  HX.loadExtras = function () {
    if (!ghToken) { HX.extraReady = true; return Promise.resolve(); }
    var out = {};
    function page(after, n) {
      return ghFetch('https://api.github.com/graphql', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: Q, variables: { org: ORG, after: after || null, since: new Date(Date.now() - 30 * 864e5).toISOString() } }) })
        .then(function (r) { if (!r.ok) throw new Error('graphql ' + r.status); return r.json(); })
        .then(function (j) {
          var repos = j && j.data && j.data.organization && j.data.organization.repositories;
          if (!repos) throw new Error('graphql: no data');
          repos.nodes.forEach(function (n) {
            var hub = null;
            if (n.hub && n.hub.text) { try { hub = JSON.parse(n.hub.text); } catch (e) { hub = null; } }
            var langs = ((n.languages && n.languages.edges) || []).map(function (e) { return { name: e.node.name === 'Hack' ? 'PHP' : e.node.name, size: e.size, color: e.node.name === 'Hack' ? '#4F5D95' : (e.node.color || langColor(e.node.name)) }; });
            var merged = {}; langs.forEach(function (l) { if (merged[l.name]) merged[l.name].size += l.size; else merged[l.name] = l; });
            var hist = n.defaultBranchRef && n.defaultBranchRef.target && n.defaultBranchRef.target.history && n.defaultBranchRef.target.history.nodes;
            out[n.name.toLowerCase()] = {
              cl: (n.cl && n.cl.text) || '', hub: hub,
              langs: Object.keys(merged).map(function (k) { return merged[k]; }).sort(function (a, b) { return b.size - a.size; }),
              langTotal: (n.languages && n.languages.totalSize) || 0,
              last: hist && hist[0] ? { date: hist[0].committedDate, msg: hist[0].messageHeadline } : null,
              recent: (n.defaultBranchRef && n.defaultBranchRef.target && n.defaultBranchRef.target.recent && n.defaultBranchRef.target.recent.totalCount) || 0   /* changes in the last 30 days */
            };
          });
          if (repos.pageInfo.hasNextPage && n < 10) return page(repos.pageInfo.endCursor, n + 1);
        });
    }
    return page(null, 0).then(function () { HX.extra = out; HX.extraReady = true; HX._cache = {}; })
      .catch(function (e) { console.warn('hub details', e); HX.extraReady = true; });
  };

  /* ---- Reading a CLREADME ---- */
  function parseCL(md) {
    var res = { title: '', intro: '', features: [], sites: [] };
    if (!md) return res;
    var m = md.match(/^#\s+(.+?)\s*$/m);
    if (m) res.title = m[1].replace(/\s*[:\u2014\u2013-]\s*Staff Notes\s*$/i, '').trim();
    var body = md.split(/^##\s/m)[0].split('\n').slice(1).join('\n');
    var paras = body.split(/\n\s*\n/).map(function (p) { return p.replace(/\s+/g, ' ').trim(); })
      .filter(function (p) { return p && !/^Cobblestone Learning\s*·/.test(p) && !/^#/.test(p); });
    res.intro = paras[0] || '';
    var f = md.match(/^##\s+What you can do with it\s*\n([\s\S]*?)(?=^##\s|$(?![\s\S]))/m);
    if (f) res.features = f[1].split('\n').map(function (l) { var x = l.match(/^\s*[-*]\s+(.+)/); return x ? x[1].replace(/\*\*/g, '').trim() : ''; }).filter(Boolean).slice(0, 6);
    var re = /`(csl-[a-z0-9-]+)`/g, s, seen = {};
    while ((s = re.exec(md))) { if (!seen[s[1]]) { seen[s[1]] = 1; res.sites.push(s[1]); } }
    return res;
  }
  HX.parseCL = parseCL;
  function firstSentence(t) {
    if (!t) return '';
    var m = t.match(/^(.+?[.!?])(\s|$)/);
    var s = (m ? m[1] : t).replace(/\*\*/g, '').replace(/`/g, '');
    return s.length > 170 ? s.slice(0, 167).replace(/\s+\S*$/, '') + '…' : s;
  }
  function stripMd(t) { return String(t || '').replace(/\*\*/g, '').replace(/`/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); }
  function prettySite(alias) {
    var a = alias.replace(/^csl-/, '');
    if (a.length <= 4) return a.toUpperCase();
    return a.split('-').map(function (w) { return w.length <= 3 && w !== 'lms' ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
  }
  HX.prettySite = prettySite;

  /* ---- Fallback guesses, used only until a repo has hub/project.json ---- */
  function guessKind(repo, cat, text) {
    if (cat === 'cat-plugin') return 'plugin';
    if (cat === 'cat-theme') return 'theme';
    if (cat === 'cat-snippet') return 'snippet';
    if (/wordpress plugin/i.test(text)) return 'plugin';
    if (/scorm/i.test(text) && /package/i.test(text)) return 'package';
    if (/bookmarklet|devtools scripts|console/i.test(text)) return 'scripts';
    if (cat === 'cat-web') return 'website';
    return 'app';
  }
  var KEYWORDS = [
    ['certify', /certificat|\bcpd\b|assessment|compliance|expiry/],
    ['translation', /translat|xliff|subtitle|deepl/],
    ['reports', /report|dashboard|analytics/],
    ['enrol', /woocommerce|checkout|enrol|purchase|\bgroups?\b|membership/],
    ['access', /login|log in|sign in|sign-in|privacy|registration|register|profile|entra|password/],
    ['engage', /remind|email|notif|community|forum|buddyboss/],
    ['courses', /h5p|video|scorm|quiz|gutenberg|block|lesson|course content|journal/],
    ['look', /\bcss\b|branding|style|theme|colour|color|font|layout/],
    ['sites', /security|seo|admin|bugfix|debug|speed|cache|performance|hosting|fix/]
  ];
  function guessPurpose(repo, cat, text, topics) {
    var byCat = { 'cat-reporting': 'reports', 'cat-authoring': 'courses', 'cat-translation': 'translation', 'cat-tools': 'tools', 'cat-web': 'tools', 'cat-theme': 'look' };
    if (byCat[cat]) return byCat[cat];
    var hay = (topics.join(' ') + ' ' + text).toLowerCase();
    for (var i = 0; i < KEYWORDS.length; i++) if (KEYWORDS[i][1].test(hay)) return KEYWORDS[i][0];
    return 'sites';
  }

  /* ---- One merged picture of a project ---- */
  HX._cache = {};
  /* A path inside the repo, as a card may give it: relative, no "..", no scheme, no backslash.
     Anything else is dropped, so a card can never point the viewer's own GitHub access at
     another part of the API. */
  function safePath(p) {
    if (typeof p !== 'string') return '';
    p = p.trim();
    if (!p || p.length > 300 || /^[a-z][a-z0-9+.-]*:/i.test(p) || /^[\/\\]/.test(p) || /\\/.test(p) || /(^|\/)\.\.?(\/|$)/.test(p) || /[\u0000-\u001f?#%]/.test(p)) return '';
    return p;
  }
  HX.safePath = safePath;
  HX.info = function (repo) {
    if (!repo) return null;
    var key = repo.name.toLowerCase();
    if (HX._cache[key]) return HX._cache[key];
    var ex = HX.extra[key] || {};
    var ov = (window.HUB_OVERRIDES && window.HUB_OVERRIDES.repos && window.HUB_OVERRIDES.repos[repo.name]) || null;   /* local preview only */
    /* A card that is not valid JSON, or still has {{placeholders}}, is ignored (the standard says so). */
    var hub = (ex.hub && typeof ex.hub === 'object' && JSON.stringify(ex.hub).indexOf('{{') < 0) ? ex.hub : null;
    if (ov && ov.friendly_name) ov = Object.assign({}, ov, { name: ov.friendly_name });
    var src = hub || ov || {};
    var cl = parseCL(ex.cl);
    var cur = (typeof CURATED !== 'undefined' && CURATED[key]) || {};
    var topics = (repo.topics || []).map(function (t) { return String(t).toLowerCase(); });
    var cat = ''; topics.forEach(function (t) { if (/^cat-/.test(t)) cat = t; });
    var text = (repo.description || '') + ' ' + (cl.intro || '');
    var topicPurpose = ''; topics.forEach(function (t) { var m = t.match(/^purpose-([a-z]+)$/); if (m && HX.PURPOSE[m[1]]) topicPurpose = m[1]; });

    var purpose = (HX.PURPOSE[src.purpose] && src.purpose) || topicPurpose || guessPurpose(repo, cat, text, topics);
    var kind = (HX.KINDS[src.kind] && src.kind) || guessKind(repo, cat, text);

    var withSet = {}, works = [];
    function addW(n) { if (n && !withSet[n]) { withSet[n] = 1; works.push(n); } }
    (Array.isArray(src.works_with) ? src.works_with : []).forEach(addW);
    if (!src.works_with) { topics.forEach(function (t) { addW(TOPIC_PLATFORM[t]); }); (cur.integrations || []).forEach(addW); if (kind === 'snippet') { addW('WPCode'); addW('WordPress'); } }

    var repoNames = {}; (window.ALL_REPOS || []).forEach(function (r) { repoNames[r.name.toLowerCase()] = 1; });
    var siteNames = (window.HUB_OVERRIDES && window.HUB_OVERRIDES.sites) || {};
    var runs = [];
    if (Array.isArray(src.runs_on)) runs = src.runs_on.map(function (s) { return typeof s === 'string' ? { site: s, name: siteNames[s] || prettySite(s) } : { site: String(s.site || ''), name: String(s.name || siteNames[s.site] || prettySite(String(s.site || ''))) }; }).filter(function (s) { return s.site; });
    else runs = cl.sites.filter(function (a) { return !repoNames[a]; }).map(function (a) { return { site: a, name: siteNames[a] || prettySite(a) }; });

    var name = stripMd(src.name || cl.title || repo.name);
    var tagline = stripMd(src.tagline || firstSentence(cl.intro) || cur.summary || repo.description || '');
    var summary = stripMd(src.summary || cl.intro || cur.summary || repo.description || '');
    var status = src.status || (repo.archived ? 'retired' : 'live');
    var demo = safePath(src.demo) || cur.demo || null;

    var info = {
      repo: repo, key: key, name: name, tagline: tagline, summary: summary,
      purpose: purpose, stage: HX.PURPOSE[purpose].stage, kind: kind,
      helps: Array.isArray(src.helps) ? src.helps.filter(function (h) { return HX.HELPS[h]; }) : [],
      works: works, runs: runs, status: status,
      features: (Array.isArray(src.features) && src.features.length ? src.features : cl.features).map(String),   /* keeps **labels**, rendered by HX.md */
      demo: demo, live_url: (typeof src.live_url === 'string' && /^https:\/\//.test(src.live_url)) ? src.live_url : '',
      cover: safePath(src.cover),
      icon: /\.svg$/i.test(safePath(src.icon)) ? safePath(src.icon) : '',   /* hub/icon.svg: the project's statue in the City */
      gallery: Array.isArray(src.gallery) ? src.gallery.filter(function (g) { return g && safePath(g.src); }) : [],
      guides: Array.isArray(src.guides) ? src.guides.filter(function (g) { return g && Array.isArray(g.steps); }) : [],
      owner: (hub && hub.owner) || '', hasCard: !!hub, langs: ex.langs || [], langTotal: ex.langTotal || 0, last: ex.last || null,
      recent: ex.recent || 0, hasNotes: !!ex.cl
    };
    info.search = [info.name, repo.name, info.tagline, info.summary, HX.PURPOSE[purpose].label, HX.KINDS[kind].label,
      works.join(' '), runs.map(function (s) { return s.name + ' ' + s.site; }).join(' '), topics.join(' '), (info.features || []).join(' ')].join(' ').toLowerCase();
    HX._cache[key] = info;
    return info;
  };
  /* Text from a card: shown exactly as typed, except **Label** marks a real interface label. */
  HX.md = function (t) { return escapeHtml(String(t == null ? '' : t)).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>'); };
  HX.demoFor = function (repo) { var i = HX.info(repo); return i && i.demo; };

  HX.list = function () { return scopedRepos().filter(function (r) { return !r.fork && !r.archived || HX.showExtra; }).map(HX.info); };
  HX.showExtra = false;
  HX.byName = function (name) {
    var n = String(name || '').toLowerCase();
    for (var i = 0; i < ALL_REPOS.length; i++) if (ALL_REPOS[i].name.toLowerCase() === n) return HX.info(ALL_REPOS[i]);
    return null;
  };
  HX.matches = function (info, q) {
    if (!q) return true;
    return q.toLowerCase().split(/\s+/).filter(Boolean).every(function (w) { return info.search.indexOf(w) !== -1; });
  };
  HX.sortFriendly = function (a, b) {
    var ka = HX.KINDS[a.kind].size, kb = HX.KINDS[b.kind].size;
    return (kb - ka) || a.name.localeCompare(b.name);
  };
  HX.recent = function (a, b) { return new Date(b.repo.pushed_at || 0) - new Date(a.repo.pushed_at || 0); };

  /* All sites, platforms and counts across the visible projects. */
  HX.index = function (list) {
    var sites = {}, plats = {}, purposes = {}, kinds = {};
    list.forEach(function (i) {
      purposes[i.purpose] = (purposes[i.purpose] || 0) + 1;
      kinds[i.kind] = (kinds[i.kind] || 0) + 1;
      i.works.forEach(function (w) { (plats[w] = plats[w] || []).push(i); });
      i.runs.forEach(function (s) { var e = sites[s.site] = sites[s.site] || { site: s.site, name: s.name, items: [] }; e.items.push(i); });
    });
    return { sites: sites, plats: plats, purposes: purposes, kinds: kinds };
  };

  /* ---- Images inside private repos: fetched with the viewer's token, shown as blob URLs ---- */
  var imgCache = {};
  HX.image = function (repo, path) {
    if (!safePath(path)) return Promise.reject(new Error('not a path in the repo'));
    var k = repo.full_name + '/' + path;
    if (imgCache[k]) return imgCache[k];
    var p = String(path).replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');
    imgCache[k] = ghFetch('https://api.github.com/repos/' + repo.full_name + '/contents/' + p, { headers: { 'Accept': 'application/vnd.github.raw' } })
      .then(function (r) { if (!r.ok) throw new Error('img ' + r.status); return r.blob(); })
      .then(function (b) { if (!/^image\//.test(b.type) && !/\.(png|jpe?g|webp|gif)$/i.test(path)) throw new Error('not an image'); return URL.createObjectURL(b); });
    return imgCache[k];
  };

  /* ---- Generated cover art: an isometric cobblestone cluster in the purpose colour ---- */
  function shade(hex, f) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return hex;
    var n = parseInt(m[1], 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    function c(v) { return Math.max(0, Math.min(255, Math.round(f >= 1 ? v + (255 - v) * (f - 1) : v * f))); }
    return 'rgb(' + c(r) + ',' + c(g) + ',' + c(b) + ')';
  }
  HX.shade = shade;
  function cubeSVG(x, y, W, D, H, col) {
    var top = x + ',' + (y - D) + ' ' + (x + W) + ',' + y + ' ' + x + ',' + (y + D) + ' ' + (x - W) + ',' + y;
    var left = (x - W) + ',' + y + ' ' + x + ',' + (y + D) + ' ' + x + ',' + (y + D + H) + ' ' + (x - W) + ',' + (y + H);
    var right = (x + W) + ',' + y + ' ' + x + ',' + (y + D) + ' ' + x + ',' + (y + D + H) + ' ' + (x + W) + ',' + (y + H);
    return '<polygon points="' + left + '" fill="' + col.l + '"/><polygon points="' + right + '" fill="' + col.r + '"/><polygon points="' + top + '" fill="' + col.t + '" stroke="' + col.e + '" stroke-width=".8" stroke-linejoin="round"/>';
  }
  HX.cubeSVG = cubeSVG;
  HX.coverSVG = function (info, opts) {
    opts = opts || {};
    var st = HX.STAGE[info.stage], c = st.color, seed = hash(info.repo.name), R = function (i) { return HX.rand(seed, i); };
    var W = 320, Hh = 200, cx = 168, cy = 118, tw = 17, td = 8.5;
    var colour = { t: shade(c, 1.35), l: shade(c, .72), r: c, e: shade(c, .8) };
    var white = { t: '#FFFFFF', l: '#D5DCE5', r: '#E9EDF3', e: '#D5DCE5' };
    var pale = { t: shade(c, 1.82), l: shade(c, 1.45), r: shade(c, 1.62), e: shade(c, 1.5) };
    var size = HX.KINDS[info.kind].size, n = size === 3 ? 9 : size === 2 ? 6 : 3;
    var cells = [], used = {};
    var spots = [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1], [2, 0], [0, 2], [2, 1], [1, 2]];
    for (var i = 0; i < spots.length && cells.length < n; i++) {
      if (i > 0 && R(i) < .22) continue;
      var gx = spots[i][0], gy = spots[i][1]; if (used[gx + ',' + gy]) continue; used[gx + ',' + gy] = 1;
      var tall = i === 0 ? (size === 1 ? 26 : 38 + R(50) * 26) : 8 + R(i + 20) * (size === 1 ? 10 : 26);
      cells.push({ gx: gx, gy: gy, h: Math.round(tall), col: i === 0 ? colour : (R(i + 40) < .45 ? colour : R(i + 60) < .5 ? white : pale) });
    }
    cells.sort(function (a, b) { return (a.gx + a.gy) - (b.gx + b.gy) || a.gx - b.gx; });
    var floor = '';
    for (var fx = -5; fx <= 5; fx++) for (var fy = -5; fy <= 5; fy++) {
      var x = cx + (fx - fy) * tw, y = cy + 26 + (fx + fy) * td;
      if (x < -20 || x > W + 20 || y < 40 || y > Hh + 20) continue;
      var lit = R(100 + (fx + 5) * 11 + fy) < .1;
      floor += '<polygon points="' + x + ',' + (y - td) + ' ' + (x + tw) + ',' + y + ' ' + x + ',' + (y + td) + ' ' + (x - tw) + ',' + y + '" fill="' + (lit ? shade(c, 1.6) : '#FFFFFF') + '" stroke="' + shade(c, 1.7) + '" stroke-width=".8"/>';
    }
    /* each block has its own rhythm: the delay runs front to back like a wave, with a little
       jitter, and its own speed and height, as the blocks in the header do */
    var cubes = cells.map(function (k, i) {
      var x = cx + (k.gx - k.gy) * tw, base = cy + 26 + (k.gx + k.gy) * td;
      var d = ((k.gx + k.gy + 3) * 0.14 + R(200 + i) * 0.3).toFixed(2), dur = (2 + R(220 + i) * 1.4).toFixed(2), amp = (-(3 + R(240 + i) * 6)).toFixed(1);
      return '<g class="hx-cb" style="--wd:' + d + 's;--wdur:' + dur + 's;--amp:' + amp + 'px">' + cubeSVG(x, base - k.h, tw - 1.5, td - .75, k.h, k.col) + '</g>';
    }).join('');
    var icon = '<g transform="translate(20 142)"><rect width="40" height="40" rx="12" fill="#fff" stroke="' + shade(c, 1.5) + '"/><g transform="translate(9 9) scale(.92)" fill="none" stroke="' + c + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICON[HX.PURPOSE[info.purpose].icon] + '</g></g>';
    return '<svg class="hx-gen" viewBox="0 0 ' + W + ' ' + Hh + '" preserveAspectRatio="xMidYMid slice" role="img" aria-label="' + escapeHtml(info.name) + '">' +
      '<defs><linearGradient id="g' + seed + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + st.tint + '"/><stop offset="1" stop-color="#FFFFFF"/></linearGradient></defs>' +
      '<rect width="' + W + '" height="' + Hh + '" fill="url(#g' + seed + ')"/>' + floor +
      '<g class="hx-rise">' + cubes + '</g>' + (opts.noIcon ? '' : icon) + '</svg>';
  };

  /* Purpose icon tile for compact rows. */
  HX.rowIcon = function (info) {
    var st = HX.STAGE[info.stage];
    return '<svg class="hx-row-ico" viewBox="0 0 34 34" aria-hidden="true"><rect width="34" height="34" rx="10" fill="' + st.tint + '"/><g transform="translate(8 8) scale(.75)" fill="none" stroke="' + st.color + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + ICON[HX.PURPOSE[info.purpose].icon] + '</g></svg>';
  };
})();
