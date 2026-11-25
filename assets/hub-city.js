/* ==========================================================================
   Repository hub: the City view (#/city).
   An ES module that hub-views.js loads only when someone opens the City, so
   the rest of the hub never downloads three.js. It grew from the v2 hub's
   Estate (new-csl-dash/assets/city.js), with a grammar that needs no code
   knowledge:

     the island        everything we have built
     a neighbourhood   one purpose (the job its projects do), coloured by its
                       stage of the learner's journey, with a bronze statue of
                       its icon on the square
     a block           one project. Its MAIN BUILDING's form is the kind of
                       project (towers are browser tools, cottages are
                       snippets); around it stand its files:
                         code and docs   smaller buildings (form = file type)
                         font files      marble columns carved in that font
                         SVG files       bronze statues on stone pillars
                         pictures        carved into standing stones
                         tests           a hedged garden, a tree per test
                         its cover       a billboard
     a projector       a demo: point at it and a hologram preview rises
     flags             the platforms the project works with
     a crane           work in progress;  ruins: a retired project
     the cable car     the learner's journey: it links the neighbourhoods in the
                       order a learner meets them, stopping at each square
     small islands     the live sites, each with a lighthouse; a ferry for
                       every project that runs there
     people            changes made in the last 30 days, round their block
     birds             open issues and pull requests, round their building
     a cloud           a project nobody has changed for over a year
     a tree by a door  the project has plain-English staff notes

   Nothing is decoration: every object stands for something in the data.

   Daylight, no bloom: colour and form carry the information. It talks to
   hub-views.js only through the handlers given to mountCity() and the
   methods below; it never reads page globals or the sign-in token.
   ========================================================================== */
import * as THREE from 'three';
import { OrbitControls } from './vendor/three/addons/OrbitControls.js';
import { PointerLockControls } from './vendor/three/addons/PointerLockControls.js';
import { CSS2DRenderer, CSS2DObject } from './vendor/three/addons/CSS2DRenderer.js';
import { RoomEnvironment } from './vendor/three/addons/RoomEnvironment.js';
import { mergeGeometries } from './vendor/three/addons/BufferGeometryUtils.js';
import { variantGeometry, variantFor, fileColor, familyFor, extOf, signatureOf, KEY, KEY_GLYPH } from './city-architecture.js?v=1';
import { layoutPoly, plotToSite, blobPolygon, polyCentroid, inradiusAt, polyArea, seedPlan } from './city-plan.js?v=1';
import * as P from './city-props.js?v=1';

export { KEY, KEY_GLYPH };

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');
const CAP = 240;               /* the island, edge to edge */
const MAX_H = 34;
const WALK_EYE = 2.0;
const YAXIS = new THREE.Vector3(0, 1, 0);
const VIEW_DIR = new THREE.Vector3(0.5, 0.5, 0.68).normalize();     /* the standard view: from the south-east, about 30 degrees up */
const FACE = Math.atan2(VIEW_DIR.x, VIEW_DIR.z);                    /* statues and boards turn to face it */
const DOWN_DIR = new THREE.Vector3(VIEW_DIR.x * 0.42, 0.9, VIEW_DIR.z * 0.42).normalize();   /* steeper, to see into a garden past tall neighbours */
const clamp = THREE.MathUtils.clamp;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/* What each kind of project is built as. */
export const FORM = {
  app:     { family: 'tower',    tier: [1, 3], crown: ['spire', 'antenna'], h: [15, 34],   plot: 5,   foot: 12, label: 'Towers', what: 'browser tools' },
  website: { family: 'drum',     tier: [1, 2], crown: ['none'],             h: [8, 13],    plot: 4,   foot: 13, label: 'Round halls', what: 'websites' },
  plugin:  { family: 'monolith', tier: [0, 3], crown: ['flat', 'flat', 'pediment', 'lantern'], h: [6, 24], plot: 3, foot: 10, label: 'Office blocks', what: 'plugins' },
  theme:   { family: 'pavilion', tier: [1, 1], crown: ['none'],             h: [7, 12],    plot: 3,   foot: 11, label: 'Domed pavilions', what: 'themes' },
  package: { family: 'silo',     tier: [0, 1], crown: ['none'],             h: [6, 11],    plot: 2.5, foot: 8,  label: 'Silos', what: 'course packages' },
  library: { family: 'hall',     tier: [1, 3], crown: ['dome'],             h: [7, 13],    plot: 3,   foot: 11, label: 'Columned halls', what: 'libraries' },
  snippet: { family: 'house',    tier: [0, 0], crown: ['none'],             h: [2.4, 4.4], plot: 1,   foot: 5.2, label: 'Cottages', what: 'snippets' },
  scripts: { family: 'works',    tier: [0, 1], crown: ['none'],             h: [4, 8],     plot: 1.5, foot: 6,  label: 'Workshops', what: 'scripts' }
};

function hash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
const unit = (str, salt) => (hash32(str + '|' + salt) % 10000) / 10000;

export function fmtBytes(n) {
  if (!n) return 'empty';
  if (n < 1024) return n + ' bytes';
  if (n < 1048576) return (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB';
  return (n / 1048576).toFixed(1) + ' MB';
}
const FAMILY_LABEL = {}; KEY.forEach((k) => { FAMILY_LABEL[k.arch] = k.label; });
export function fileTypeLabel(path) {
  const fam = familyFor(path);
  if (fam === 'hall' && !/^(css|scss|sass|less)$/.test(extOf(path))) return 'Other';   /* unknown types are drawn as halls */
  return FAMILY_LABEL[fam] || 'Other';
}

/* File kinds that become props rather than buildings. */
const IS_FONT = /\.(woff2?|ttf|otf)$/i, IS_SVG = /\.svg$/i, IS_IMG = /\.(png|jpe?g|gif|webp)$/i;
const IS_TEST = /(^|\/)(tests?|spec|__tests__)\//i;
const IS_VENDOR = /(^|\/)(node_modules|vendor|dist|build|\.git|\.github)\//i;
const IS_JUNK = /(^|\/)(license|licence|license\.md|license\.txt|\.gitignore|\.gitattributes|\.editorconfig|package-lock\.json|composer\.lock|yarn\.lock)$|\.min\.(js|css)$|\.map$/i;
/* A font file's name as people would say it, and how to draw with it. */
function fontInfo(path) {
  const base = path.split('/').pop().replace(/\.(woff2?|ttf|otf)$/i, '');
  const stem = base.split(/[-_]/)[0].toLowerCase();
  const title = base.replace(/[-_]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/Deja Vu/g, 'DejaVu').replace(/\b(latin|normal)\b/gi, '').replace(/\s+/g, ' ').trim();
  const num = /(^|[-_ ])([1-9]00)([-_ ]|$)/.exec(base);
  const weight = num ? +num[2] : /black|heavy/i.test(base) ? 900 : /bold/i.test(base) ? 700 : /light/i.test(base) ? 300 : 400;
  const italic = /italic|oblique/i.test(base);
  return { stem, title: title.charAt(0).toUpperCase() + title.slice(1), weight, italic };
}

/* A file list ({p: path, s: size, h: sha}) as a folder tree. */
function toTree(files) {
  const root = { dirs: new Map(), files: [], value: 0, count: 0 };
  files.forEach((f) => {
    const parts = f.p.split('/');
    const v = Math.max(120, f.s || 120);
    let node = root;
    node.value += v; node.count++;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!node.dirs.has(parts[i])) node.dirs.set(parts[i], { dirs: new Map(), files: [], value: 0, count: 0, name: parts[i] });
      node = node.dirs.get(parts[i]);
      node.value += v; node.count++;
    }
    node.files.push({ path: f.p, name: parts[parts.length - 1], size: f.s || 0, sha: f.h, value: v });
  });
  return root;
}
function descend(node, path) {
  let n = node;
  for (const p of path.split('/')) { if (!n || !n.dirs.has(p)) return null; n = n.dirs.get(p); }
  return n;
}
function inPoly(poly, x, z) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

/* One material for every building. Windows are drawn in the shader, with rows
   from the building's real height, and only "lit" (search, hover, selection)
   makes them emit. From the v2 hub. */
function towerMaterial() {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.66, metalness: 0.04 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uGlow = { value: new THREE.Color(0x27aae1) };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float aLit; attribute float aH; attribute float aSeed;
        varying float vLit; varying float vH; varying float vSeed;
        varying vec3 vLocal; varying vec3 vObjN;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vLit = aLit; vH = aH; vSeed = aSeed; vLocal = position; vObjN = normal;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uGlow;
        varying float vLit; varying float vH; varying float vSeed;
        varying vec3 vLocal; varying vec3 vObjN;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec3 glowCol = uGlow;
        #if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
          glowCol = vColor;
        #endif
        float rows = max(2.0, floor(vH / 2.2));
        float band = fract(vLocal.y * rows + vSeed * 0.37);
        float cols = fract((vLocal.x + vLocal.z) * 7.0 + vSeed * 2.1);
        float win = step(0.30, band) * step(band, 0.72) * step(0.28, cols) * step(cols, 0.70);
        win *= 1.0 - step(0.5, abs(vObjN.y));
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.45 + vec3(0.04, 0.07, 0.10), win * 0.8);
        totalEmissiveRadiance += glowCol * win * vLit * 1.6;
        diffuseColor.rgb *= mix(0.88, 1.06, clamp(vLocal.y, 0.0, 1.0));`);
  };
  return mat;
}

/* Cobblestones, of course: a tiling canvas texture for the streets. */
function cobbleTexture(renderer) {
  const S = 256, N = 8, cell = S / N;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#A3AEB9'; g.fillRect(0, 0, S, S);
  let seed = 11;
  const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const stone = (x, y, w, h, r, fill) => {
    g.beginPath();
    g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
    g.fillStyle = fill; g.fill();
  };
  for (let row = 0; row < N; row++) {
    const off = (row % 2) * cell * 0.5;
    for (let col = 0; col < N; col++) {
      const w = cell * (0.80 + rnd() * 0.1), h = cell * (0.76 + rnd() * 0.1);
      const x = col * cell + off + (cell - w) / 2, y = row * cell + (cell - h) / 2;
      const l = 196 + Math.floor(rnd() * 30);
      const fill = 'rgb(' + (l - 7) + ',' + l + ',' + (l + 6) + ')';
      [x, x - S].forEach((xx) => stone(xx, y, w, h, cell * 0.24, fill));
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}

function treeGeometry() {
  return mergeGeometries([
    P.paint(new THREE.CylinderGeometry(0.09, 0.12, 0.5, 6).translate(0, 0.25, 0), 0x8A6A4F),
    P.paint(new THREE.ConeGeometry(0.5, 0.9, 7).translate(0, 0.85, 0), 0x3E9B5F),
    P.paint(new THREE.ConeGeometry(0.36, 0.7, 7).translate(0, 1.3, 0), 0x52AE70)
  ], false);
}

export class City {
  constructor(host, handlers = {}) {
    this.host = host;
    this.h = Object.assign({
      onSelect() {}, onLevel() {}, onWalk() {}, onOpen() {}, onOpenSite() {}, onTour() {},
      fetchBlob() { return Promise.resolve(null); }, loadImage() { return Promise.resolve(null); }, demoPreview() { return Promise.resolve(null); }
    }, handlers);
    this.items = []; this.hoods = []; this.platforms = []; this.sites = [];
    this.files = new Map(); this.roots = new Map(); this.sigs = new Map(); this.names = new Map();
    this.level = { kind: 'estate' };
    this.districts = []; this.towers = []; this.batches = new Map(); this.labels = [];
    this.pickables = []; this.anims = []; this.spinners = []; this.later = []; this.movers = [];
    this.filter = null; this._filterSig = null;
    this.selected = null; this.hoodSel = null; this.hover = null;
    this.linksOn = false; this.walking = false;
    this.running = false; this.userMoved = false; this.flight = null; this.wave = null;
    this.pointer = new THREE.Vector2(-10, -10); this.hasPointer = false;
    this.baseY = 0.5; this.plate = CAP; this.frame = 0; this.gen = 0;
    this.jobs = []; this.active = 0; this.fontFaces = new Map(); this.fontBytes = 0;
    this.uniforms = { uTime: { value: 0 } };
    this._initScene();
    this._bind();
  }

  /* ================= scene ================= */
  _initScene() {
    const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.92;
    r.domElement.className = 'hx-city-gl';
    r.domElement.setAttribute('role', 'img');
    this.host.appendChild(r.domElement);
    this.renderer = r;

    const l = new CSS2DRenderer();
    l.domElement.className = 'hx-city-labels';
    this.host.appendChild(l.domElement);
    this.labelRenderer = l;

    this.tip = document.createElement('div');
    this.tip.className = 'hx-tip hx-city-tip';
    this.tip.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.tip);
    this.hint = document.createElement('div');
    this.hint.className = 'hx-city-hint';
    this.hint.textContent = 'To zoom, hold Ctrl and scroll, pinch, or use the + and − buttons.';
    this.host.appendChild(this.hint);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xdde9f2, CAP * 2.6, CAP * 7);
    this.scene.background = this._sky();
    const pmrem = new THREE.PMREMGenerator(r);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.42;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.5, 5000);
    this.camera.position.set(CAP * 0.5, CAP * 0.55, CAP * 0.78);
    const c = new OrbitControls(this.camera, r.domElement);
    c.enableDamping = true; c.dampingFactor = 0.08;
    c.rotateSpeed = 0.55; c.zoomSpeed = 0.9; c.panSpeed = 0.8;
    c.screenSpacePanning = false;
    c.minDistance = 6; c.maxDistance = CAP * 4;
    c.minPolarAngle = 0.12; c.maxPolarAngle = Math.PI / 2 - 0.1;
    c.target.set(0, 4, 0);
    c.addEventListener('start', () => { this.userMoved = true; this.flight = null; if (this.tour && !this.tour.paused) this.pauseTour(true); });
    this.controls = c;

    const key = new THREE.DirectionalLight(0xfff2de, 1.9);
    key.position.set(-CAP * 0.55, CAP * 0.95, CAP * 0.45);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 20; key.shadow.camera.far = CAP * 3;
    const s = CAP * 0.6;
    key.shadow.camera.left = -s; key.shadow.camera.right = s; key.shadow.camera.top = s; key.shadow.camera.bottom = -s;
    key.shadow.bias = -0.0012; key.shadow.normalBias = 0.4;
    this.scene.add(key);
    this.scene.add(new THREE.HemisphereLight(0xd8e8f6, 0x8f9cab, 0.78));
    const rim = new THREE.DirectionalLight(0xa9d8f0, 0.35);
    rim.position.set(CAP * 0.6, CAP * 0.3, -CAP * 0.6);
    this.scene.add(rim);

    this.rig = new THREE.Group();
    this.scene.add(this.rig);
    this.props = new THREE.Group();
    this.rig.add(this.props);

    const sea = new THREE.Mesh(new THREE.CircleGeometry(CAP * 9, 64),
      new THREE.MeshStandardMaterial({ color: 0x8FD0EC, roughness: 0.55, metalness: 0.05 }));
    sea.rotation.x = -Math.PI / 2; sea.position.y = -2.4; sea.receiveShadow = true;
    this.scene.add(sea);

    const cob = cobbleTexture(r);
    cob.repeat.set((CAP * 1.04) / 9, (CAP * 1.04) / 9);
    const top = new THREE.MeshStandardMaterial({ map: cob, roughness: 0.95, metalness: 0 });
    const side = new THREE.MeshStandardMaterial({ color: 0x8E9AA6, roughness: 0.9, metalness: 0 });
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(CAP * 0.52, CAP * 0.545, 5, 64), [side, top, side]);
    deck.position.y = -2.5; deck.receiveShadow = true;
    this.rig.add(deck);
    this.deck = deck;
    this.cobble = cob;

    this.ring = new THREE.Mesh(new THREE.RingGeometry(1, 1.14, 64),
      new THREE.MeshBasicMaterial({ color: 0x0074B4, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    this.ring.rotation.x = -Math.PI / 2;
    this.rig.add(this.ring);
    this.wavering = new THREE.Mesh(new THREE.RingGeometry(1, 1.03, 96),
      new THREE.MeshBasicMaterial({ color: 0x27AAE1, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    this.wavering.rotation.x = -Math.PI / 2; this.wavering.position.y = 0.7;
    this.rig.add(this.wavering);

    this.towerMat = towerMaterial();
    this.treeGeo = treeGeometry(); this.treeGeo.userData.keep = true;
    this.treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 }); this.treeMat.userData.keep = true;
    this.propMat = P.propMaterial(); this.propMat.userData.keep = true;
    this.ruinMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });
    this.bronzeMat = P.bronze(); this.bronzeMat.userData.keep = true;
    this.plinthGeo = P.plinthGeometry(); this.plinthGeo.userData.keep = true;
    const cp = P.columnParts(); this.colRest = cp.rest; this.colShaft = cp.shaft; cp.rest.userData.keep = cp.shaft.userData.keep = true;
    this.raycaster = new THREE.Raycaster();

    /* the hologram that rises out of a demo building */
    this.holoBeam = P.holoBeam();
    this.holoBeam.visible = false;
    this.scene.add(this.holoBeam);
    const he = document.createElement('div');
    he.className = 'hx-holo';
    he.innerHTML = '<div class="hx-holo-in"><div class="hx-holo-screen"></div><div class="hx-holo-scan"></div><div class="hx-holo-cap"></div></div>';
    this.holoObj = new CSS2DObject(he);
    this.holoObj.visible = false;
    this.scene.add(this.holoObj);
    this.holo = { el: he, screen: he.querySelector('.hx-holo-screen'), cap: he.querySelector('.hx-holo-cap'), t: null, a: 0, cache: new Map() };
    this._resize();
  }

  _sky() {
    const c = document.createElement('canvas'); c.width = 4; c.height = 256;
    const g = c.getContext('2d'), grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#9ECBEA'); grad.addColorStop(0.5, '#CFE3F2'); grad.addColorStop(1, '#E7EFF6');
    g.fillStyle = grad; g.fillRect(0, 0, 4, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.mapping = THREE.EquirectangularReflectionMapping;
    return t;
  }

  /* ================= data ================= */
  /* items: [{key, name, tagline, purpose, kind, kindLabel, size, demo, works[], status, retired, runs[], cover, icon}]
     hoods: [{id, label, color, icon}] in journey order;  platforms: [{id, label, color}];  sites: [{id, name, count}] */
  setProjects(items, hoods, platforms, sites) {
    const sig = items.map((i) => [i.key, i.purpose, i.kind, i.demo ? 1 : 0, Math.round((i.size || 0) / 4096), i.status, i.retired ? 1 : 0, (i.runs || []).join('+'), i.cover, i.icon, i.recent, i.issues, i.stale ? 1 : 0, i.notes ? 1 : 0].join(':')).sort().join('|') +
      '#' + (sites || []).map((s) => s.id).join(',');
    this.items = items; this.hoods = hoods; this.platforms = platforms || []; this.sites = sites || [];
    this.byKey = new Map(items.map((i) => [i.key, i]));
    items.forEach((i) => this.names.set(i.key, i.name));
    if (sig === this._sig) return false;
    this._sig = sig;
    if (this.level.kind === 'estate') this._build();
    return true;
  }
  /* A project's file list, as it arrives: its block fills in around the main building. */
  addFiles(key, files) {
    if (!files) return;
    this.files.set(key, files);
    if (this.level.kind !== 'estate') return;
    const t = this.towers.find((x) => x.type === 'project' && x.item.key === key);
    if (t) this._fillBlock(t, files, false);
  }
  enterProject(key, files, name) {
    this.files.set(key, files || []);
    this.roots.set(key, toTree(files || []));
    this.sigs.set(key, signatureOf(key, files || []));
    if (name) this.names.set(key, name);
    this.go({ kind: 'repo', repo: key });
  }

  /* ================= levels ================= */
  go(level) {
    if (this.walking) this.exitWalk(true);
    this.level = level;
    this._build();
    this.resetView();
  }
  home() { this.go({ kind: 'estate' }); }
  up() {
    const lv = this.level;
    if (lv.kind === 'estate') return false;
    if (lv.kind === 'repo') { this.home(); return true; }
    const parts = lv.path.split('/'); parts.pop();
    this.go(parts.length ? { kind: 'dir', repo: lv.repo, path: parts.join('/') } : { kind: 'repo', repo: lv.repo });
    return true;
  }
  crumbs() {
    const lv = this.level, out = [{ label: 'The city', level: { kind: 'estate' } }];
    if (lv.kind === 'estate') return out;
    out.push({ label: this.names.get(lv.repo) || lv.repo, level: { kind: 'repo', repo: lv.repo } });
    if (lv.kind === 'dir') {
      const parts = lv.path.split('/');
      parts.forEach((p, i) => out.push({ label: p, level: { kind: 'dir', repo: lv.repo, path: parts.slice(0, i + 1).join('/') } }));
    }
    return out;
  }
  goCrumb(i) { const c = this.crumbs()[i]; if (c) this.go(c.level); }
  _summary() {
    if (this.level.kind === 'estate') {
      /* Count as the header and the lists do (archived repos are not projects there); the archived ruins come after. */
      const n = this.districts.length, all = this.towers.filter((t) => t.type === 'project');
      const gone = all.filter((t) => t.item && t.item.archived).length, p = all.length - gone;
      return p + (p === 1 ? ' project' : ' projects') + ' in ' + n + (n === 1 ? ' neighbourhood' : ' neighbourhoods') +
        (gone ? ', plus ' + gone + ' archived, shown as ruins' : '');
    }
    const dirs = this.districts.filter((d) => d.target).length, f = this.towers.length + (this._propFiles || 0);
    return (dirs ? dirs + (dirs === 1 ? ' folder, ' : ' folders, ') : '') + f + (f === 1 ? ' file' : ' files');
  }

  _build() {
    this._clear();
    if (this.level.kind === 'estate') this._buildEstate(); else this._buildInside();
    this._buildGround();
    this._buildTrees();
    if (this.level.kind === 'estate') {
      if (this.linksOn) this._buildLinks();
      if (this.filter) this._applyFilter(false);
      this._buildCable();
      this._buildSites();
      this._buildLife();
      if (REDUCED.matches) this._stepMovers(performance.now(), 0);   /* still shown, just not moving */
      this.later.push({ at: performance.now() + (REDUCED.matches ? 0 : 2400), fn: () => { this._buildFlags(); this._buildCranes(); } });
    }
    this.renderer.domElement.setAttribute('aria-label', 'A 3D city: ' + this._summary() + '. The labels over the city are buttons. The Map and All projects list the same projects.');
    this.h.onSelect(null);
    this.h.onLevel(this.crumbs(), this._summary(), this.level);
  }

  _setPlate(size) {
    this.plate = size;
    const k = size / CAP;
    this.deck.scale.set(k, 1, k);
    this.cobble.repeat.set((size * 1.04) / 9, (size * 1.04) / 9);
  }

  /* ---- the estate: neighbourhoods of project blocks ---- */
  _buildEstate() {
    this._setPlate(CAP);
    this.baseY = 0.5;
    const now = performance.now();
    const byKind = {};
    this.items.forEach((it) => { (byKind[it.kind] = byKind[it.kind] || []).push(it); });
    Object.keys(byKind).forEach((k) => {
      const list = byKind[k].slice().sort((a, b) => (a.size || 0) - (b.size || 0));
      list.forEach((it, i) => { it._pct = list.length > 1 ? i / (list.length - 1) : 0.5; });
    });
    /* a block's ground grows with its code, so a project with many files has room for them */
    const weight = (it) => it.retired ? 1.4 : (FORM[it.kind] || FORM.plugin).plot * (0.8 + 0.4 * (it._pct || 0)) + 1.3 * clamp(Math.log10((it.size || 0) + 1) - 3, 0, 3);
    const hoods = this.hoods
      .map((h) => ({ ...h, items: this.items.filter((i) => i.purpose === h.id) }))
      .filter((h) => h.items.length)
      .map((h) => ({ ...h, value: Math.max(6, h.items.reduce((s, i) => s + weight(i), 0)) }));
    const island = blobPolygon(CAP * 0.47, 30, 0.12, 0x0BB1E5);
    seedPlan(0x51D0C2);
    this.trees_ = [];
    let order = 0;
    layoutPoly(island, hoods, (h, poly) => {
      const c = polyCentroid(poly);
      const d = {
        key: 'hood:' + h.id, hood: h, label: h.label, color: h.color, plot: poly, cx: c[0], cz: c[1],
        radius: Math.max(inradiusAt(poly, c), Math.sqrt(polyArea(poly)) * 0.42),
        towers: [], lots: [], count: h.items.length,
        t0: REDUCED.matches ? now - 9999 : now + order++ * 170
      };
      this.districts.push(d);
      const entries = h.items.slice().sort((a, b) => weight(b) - weight(a)).map((it) => ({ it, value: weight(it) }));
      entries.splice(Math.floor(entries.length / 2), 0, { plaza: true, value: Math.max(3, h.value * 0.09) });
      layoutPoly(poly, entries, (x, plot) => (x.plaza ? this._addPlaza(d, plot) : this._addProject(d, x.it, plot)),
        { pad: 1.6, leafPad: 1.1, jitter: 0.5 });
      this._hoodLabel(d);
    }, { pad: 4.2, leafPad: 3.0, jitter: 0.3 });
  }

  /* The square at the heart of a neighbourhood: its icon in bronze on a pillar. */
  _addPlaza(d, plot) {
    const s = plotToSite(plot);
    d.plaza = { x: s.x, z: s.z, r: s.r, plot };
    const grp = new THREE.Group();
    grp.position.set(s.x, this.baseY, s.z);
    const ped = new THREE.Mesh(this.plinthGeo, this.propMat);
    ped.scale.set(2.6, 2.6, 2.6); ped.castShadow = true; ped.receiveShadow = true;
    grp.add(ped);
    let top = 2.6;
    const geo = P.svgGeometry(d.hood.icon);
    if (geo) {
      const st = new THREE.Mesh(geo, this.bronzeMat);
      st.scale.setScalar(5.2); st.position.y = 2.6; st.rotation.y = FACE; st.castShadow = true;
      grp.add(st);
      top += 5.2;
    }
    d.monumentTop = this.baseY + top;
    this._pickable(grp, { type: 'hood', id: d.hood.id, kindLabel: 'Neighbourhood statue', title: d.label, text: 'Select it to list the projects here.' });
    this._pop(grp, d.t0 + 300);
    this.props.add(grp);
  }

  _addProject(d, it, plot) {
    const f = FORM[it.kind] || FORM.plugin;
    d.lots.push(plot);
    /* the main building takes part of the block; its files fill the rest */
    let mainPlot = plot, rest = null;
    if (!it.retired) {
      const share = it.kind === 'snippet' ? 0.5 : 0.42, parts = {};
      layoutPoly(plot, [{ k: 'main', value: share }, { k: 'rest', value: 1 - share }], (x, p) => { parts[x.k] = p; }, { pad: 0, leafPad: 0.3, jitter: 0.4 });
      if (parts.main) { mainPlot = parts.main; rest = parts.rest || null; }
    }
    const site = plotToSite(mainPlot);
    const pct = it._pct || 0;
    let arch, geoFn = null, h, col, foot;
    if (it.retired) {
      const v = hash32(it.key) % 4;
      arch = 'ruin:' + v; geoFn = () => P.ruinGeometry(v + 1);
      foot = Math.max(1.4, Math.min(Math.sqrt(site.area) * 0.6, site.r * 1.8, 7)); h = 3 + pct * 2;
      col = new THREE.Color(0xffffff);              /* the stone and ivy are in the geometry */
    } else {
      const tier = Math.round(f.tier[0] + (f.tier[1] - f.tier[0]) * pct);
      const crown = f.crown[Math.min(f.crown.length - 1, Math.round(pct * (f.crown.length - 1)))];
      arch = f.family + ':' + tier + ':' + crown;
      foot = Math.max(1.4, Math.min(Math.sqrt(site.area) * 0.66, site.r * 1.85, f.foot));
      h = Math.min(f.h[0] + (f.h[1] - f.h[0]) * Math.pow(pct, 0.9), foot * 7.5);
      col = new THREE.Color(d.color);
      col.offsetHSL((unit(it.key, 'h') - 0.5) * 0.02, -0.04, (unit(it.key, 'l') - 0.5) * 0.12);
    }
    const t = this._place(arch, { type: 'project', item: it, district: d, x: site.x, z: site.z, w: foot, dd: foot,
      rot: site.angle, h, col, order: d.towers.length / Math.max(1, d.count), seed: unit(it.key, 's') }, geoFn);
    t.rest = rest; t.plot = plot; t.mainPlot = mainPlot;
    for (let k = 0; k < (it.notes && !it.retired ? mainPlot.length : 0); k++) {   /* a tree by the door: it has staff notes */
      const q = mainPlot[(k + (hash32(it.key) % mainPlot.length)) % mainPlot.length];
      const x = site.x + (q[0] - site.x) * 0.74, z = site.z + (q[1] - site.z) * 0.74;
      if (Math.hypot(x - site.x, z - site.z) > foot * 0.78 + 0.9) { this.trees_.push({ x, z, s: 1.2 + unit(it.key, 'ts') * 1.2, rnd: unit(it.key, 'tc') }); break; }
    }
    if (it.demo && !it.retired) {
      const pj = P.projector();
      pj.scale.setScalar(clamp(foot * 0.3, 1.2, 2.6));
      pj.position.set(t.x, this.baseY, t.z);
      t.proj = pj;
      this.props.add(pj);
      this.spinners.push({ o: pj.userData.play, v: 0.9 }, { o: pj.userData.ring, v: -0.4, axis: 'z' });
      this._pickable(pj, { type: 'project', main: t, kindLabel: 'Demo to try', title: it.name, text: 'Point at the building to see a preview. Select it to open the demo.' });
    }
    this._buildingLabel(t);
    if (this.files.has(it.key)) this._fillBlock(t, this.files.get(it.key), true);
  }

  /* Fill a block with the project's files: buildings, columns, statues, a garden, a billboard. */
  _fillBlock(t, files, withIntro) {
    if (t.filled || !t.rest || t.item.retired) return;
    t.filled = true;
    const it = t.item, t0 = withIntro ? t.district.t0 + 650 : performance.now();
    const area = polyArea(t.rest);
    const fonts = [], svgs = [], imgs = [], code = [];
    let tests = 0;
    const seen = new Set();
    files.forEach((f) => {
      if (IS_FONT.test(f.p)) { const n = f.p.split('/').pop(); if (!seen.has(n)) { seen.add(n); fonts.push(f); } return; }
      if (IS_TEST.test(f.p)) { tests++; return; }
      if (IS_VENDOR.test(f.p) || IS_JUNK.test(f.p)) return;
      if (/^hub\//.test(f.p)) return;                       /* the card's own pictures and shot list */
      if (IS_SVG.test(f.p)) svgs.push(f);
      else if (IS_IMG.test(f.p)) imgs.push(f);
      else code.push(f);
    });
    fonts.sort((a, b) => (a.s || 0) - (b.s || 0));
    code.sort((a, b) => (b.s || 0) - (a.s || 0));
    const cells = [];
    if (it.icon) cells.push({ kind: 'icon', value: 1.7 });
    if (it.cover) cells.push({ kind: 'cover', value: 2.0 });
    if (tests || imgs.length) cells.push({ kind: 'garden', value: 1.3 + 0.07 * Math.min(tests, 12) + 0.7 * Math.min(imgs.length, 3), tests, imgs: imgs.slice(0, 3) });
    fonts.slice(0, 8).forEach((f) => cells.push({ kind: 'font', value: 0.8, file: f }));
    svgs.slice(0, 3).forEach((f) => cells.push({ kind: 'svg', value: 1.0, file: f }));
    const maxCells = Math.round(clamp(area / 2.4, 2, 17));
    const room = Math.max(0, maxCells - cells.length);
    const maxS = Math.max(1, ...code.map((f) => f.s || 0));
    code.slice(0, Math.max(room, Math.min(2, code.length))).forEach((f, i, arr) => cells.push({ kind: 'code', file: f, value: 0.55 + 1.3 * Math.sqrt((f.s || 0) / maxS), rank: arr.length > 1 ? 1 - i / (arr.length - 1) : 1 }));
    if (!cells.length) return;
    const list = cells.slice(0, Math.max(maxCells, 2)).sort((a, b) => b.value - a.value);
    let n = 0;
    layoutPoly(t.rest, list, (c, plot) => this._fillCell(t, c, plot, t0 + (n++) * 40), { pad: 0, leafPad: 0.28, jitter: 0.55 });
  }

  _fillCell(t, c, plot, t0) {
    const site = plotToSite(plot), it = t.item, d = t.district;
    const foot = Math.max(0.35, Math.min(Math.sqrt(site.area) * 0.62, site.r * 1.85));
    const owner = { main: t, repo: it.key };
    if (c.kind === 'code') {
      const f = c.file, depth = (f.p.match(/\//g) || []).length;
      const arch = variantFor(f.p, c.rank, false, { files: 20 }, depth);
      const h = Math.max(1.1, Math.min(t.h * (0.22 + 0.5 * c.rank), foot * 6.5, MAX_H * 0.7));
      const col = new THREE.Color(d.color).lerp(new THREE.Color(fileColor(f.p)), 0.3).lerp(new THREE.Color(0xffffff), 0.16);
      this._place(arch, { type: 'file', item: it, main: t, file: f, district: d, x: site.x, z: site.z, w: foot * 0.92, dd: foot * 0.92,
        rot: site.angle, h, col, order: 0, seed: unit(f.p, 's'), t0 });
    } else if (c.kind === 'font') this._column(c.file, site, foot, t0, owner);
    else if (c.kind === 'svg') this._statue({ sha: c.file.h, path: c.file.p }, site, t0, owner, 2.2);
    else if (c.kind === 'icon') this._statue({ path: it.icon }, site, t0, owner, 3.4);
    else if (c.kind === 'garden') this._garden(t, plot, c, t0);
    else if (c.kind === 'cover') this._billboard(t, site, t0);
  }

  /* ---------------- props ---------------- */
  _pickable(obj, ref) { if (!ref.obj) ref.obj = obj; obj.traverse((o) => { if (o.isMesh) { o.userData.ref = ref; this.pickables.push(o); } }); }
  _pop(obj, t0) {
    obj.userData.full = obj.scale.clone();
    if (REDUCED.matches) return;
    obj.scale.multiplyScalar(0.001);
    this.anims.push({ o: obj, t0 });
  }
  _job(fn) {
    const gen = this.gen;
    this.jobs.push(() => fn().catch((e) => { if (gen === this.gen) console.warn('City: a prop could not load', e); }));
    this._pump();
  }
  /* Eight props at a time: each is a download of about a second and a few milliseconds of drawing.
     Three at a time took about 18 s for the 42 billboards and the stones (2026-11-25). */
  _pump() {
    while (this.active < 8 && this.jobs.length) {
      const run = this.jobs.shift();
      this.active++;
      Promise.resolve().then(run).finally(() => { this.active--; this._pump(); });
    }
  }
  _ownerRef(owner, kindLabel, title, text, file) {
    return owner.main ? { type: 'project', main: owner.main, kindLabel, title, text, file } : { type: 'file', repo: owner.repo, kindLabel, title, text, file };
  }

  /* A font file: a marble column, its own letters carved round the shaft. */
  _column(file, site, foot, t0, owner) {
    const fi = fontInfo(file.p);
    const h = 5 + clamp(Math.log2((file.s || 1) / 15000 + 1), 0, 4);
    const R = clamp(foot * 0.45, 0.7, 1.15);
    const css = (fam) => (fi.italic ? 'italic ' : '') + fi.weight + ' {size} ' + fam;
    const aspect = (h * 0.78) / (2 * Math.PI * R * 1.05);          /* shaft height over its circumference */
    const tex0 = P.carvedTexture(css('Georgia, serif'), fi.title, aspect);
    const mat = new THREE.MeshStandardMaterial({ map: tex0.map, bumpMap: tex0.bump, bumpScale: 3.2, roughness: 0.55 });
    const grp = new THREE.Group();
    grp.add(new THREE.Mesh(this.colRest, this.propMat), new THREE.Mesh(this.colShaft, mat));
    grp.children.forEach((m) => { m.castShadow = true; m.receiveShadow = true; });
    grp.scale.set(R * 2, h, R * 2);
    grp.position.set(site.x, this.baseY, site.z);
    grp.rotation.y = site.angle;
    this._pickable(grp, this._ownerRef(owner, 'Font column', fi.title, 'A font file in ' + (this.names.get(owner.repo) || 'this project') + ': ' + file.p, file));
    this._pop(grp, t0);
    this.props.add(grp);
    this._propFiles = (this._propFiles || 0) + 1;
    const gen = this.gen;
    this._loadFont(file, fi, owner.repo).then((family) => {
      if (!family || gen !== this.gen) return;
      const oldMap = mat.map, oldBump = mat.bumpMap, tex = P.carvedTexture(css('"' + family + '"'), fi.title, aspect);
      mat.map = tex.map; mat.bumpMap = tex.bump;
      mat.needsUpdate = true;
      if (oldMap) oldMap.dispose();
      if (oldBump) oldBump.dispose();
    });
  }
  /* One face per family name, the smallest file of each, and no more than about 4 MB in all. */
  _loadFont(file, fi, repo) {
    if (this.fontFaces.has(fi.stem)) return this.fontFaces.get(fi.stem);
    if (!file.h || (file.s || 0) > 1400000 || this.fontBytes + (file.s || 0) > 4200000) return Promise.resolve(null);
    this.fontBytes += file.s || 0;
    /* fetched directly, not through the prop queue, so a rebuild never strands it */
    const p = this.h.fetchBlob(repo, file.h).then((buf) => {
      if (!buf) return null;
      const family = 'hxcf-' + file.h.slice(0, 10);
      return new FontFace(family, buf).load().then((f) => { document.fonts.add(f); return family; });
    }).catch(() => null);
    this.fontFaces.set(fi.stem, p);
    return p;
  }

  /* An SVG: bronze, on a stone pillar. `src` is a blob sha or a path in the repo. */
  _statue(src, site, t0, owner, size) {
    const grp = new THREE.Group();
    grp.position.set(site.x, this.baseY, site.z);
    const ped = new THREE.Mesh(this.plinthGeo, this.propMat);
    ped.scale.set(size * 0.55, size * 0.6, size * 0.55); ped.castShadow = true;
    grp.add(ped);
    const isIcon = owner.main && src.path === owner.main.item.icon;
    const ref = this._ownerRef(owner, isIcon ? 'The project’s icon' : 'Statue', src.path.split('/').pop(), 'An SVG picture in ' + (this.names.get(owner.repo) || 'this project') + ': ' + src.path, { p: src.path, s: 0, h: src.sha });
    this._pickable(grp, ref);
    this._pop(grp, t0);
    this.props.add(grp);
    this._propFiles = (this._propFiles || 0) + 1;
    const gen = this.gen;
    this._job(() => this.h.fetchBlob(owner.repo, src.sha || null, src.path).then((buf) => {
      if (!buf || gen !== this.gen) return;
      const text = typeof buf === 'string' ? buf : new TextDecoder().decode(buf);
      const geo = P.svgGeometry(text);
      if (!geo) return;
      const st = new THREE.Mesh(geo, this.bronzeMat);
      st.scale.setScalar(size); st.position.y = size * 0.6; st.rotation.y = FACE; st.castShadow = true;
      grp.add(st);
      this._pickable(st, ref);
    }));
  }

  /* Tests and pictures: a hedged garden, a tree for each test, the pictures carved in stone. */
  _garden(t, plot, c, t0) {
    const s = plotToSite(plot), y = this.baseY;
    const k = 0.9, poly = plot.map((q) => [s.x + (q[0] - s.x) * k, s.z + (q[1] - s.z) * k]);
    const grp = new THREE.Group();
    const shape = new THREE.Shape();
    poly.forEach((q, i) => (i ? shape.lineTo(q[0], q[1]) : shape.moveTo(q[0], q[1])));
    const lawn = new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: false });
    lawn.rotateX(Math.PI / 2); lawn.translate(0, y + 0.08, 0);
    const lawnM = new THREE.Mesh(lawn, new THREE.MeshStandardMaterial({ color: 0x9CCB8A, roughness: 0.95 }));
    lawnM.receiveShadow = true;
    grp.add(lawnM);
    const hedge = P.hedgeGeometry(poly, y);
    if (hedge) { const hm = new THREE.Mesh(hedge, this.propMat); hm.castShadow = true; grp.add(hm); }
    const spots = [], stones = c.imgs || [];
    stones.forEach((f, i) => {
      const along = (i - (stones.length - 1) / 2) * 3.4;
      const x = s.x + Math.cos(s.angle) * along, z = s.z + Math.sin(s.angle) * along;
      if (!inPoly(poly, x, z)) return;
      spots.push([x, z, 1.8]);
      this._stone(f, x, z, t0 + i * 120, { main: t, repo: t.item.key }, grp);
    });
    const want = Math.min(Math.max(c.tests, stones.length ? 2 : 0), 12);
    const trees = [];
    let tries = 0;
    const bb = poly.reduce((m, q) => [Math.min(m[0], q[0]), Math.min(m[1], q[1]), Math.max(m[2], q[0]), Math.max(m[3], q[1])], [1e9, 1e9, -1e9, -1e9]);
    while (trees.length < want && tries++ < 200) {
      const x = bb[0] + unit(t.item.key, 'gx' + tries) * (bb[2] - bb[0]), z = bb[1] + unit(t.item.key, 'gz' + tries) * (bb[3] - bb[1]);
      if (!inPoly(poly, x, z)) continue;
      if (spots.some((p) => Math.hypot(p[0] - x, p[1] - z) < p[2] + 0.6)) continue;
      if (trees.some((p) => Math.hypot(p[0] - x, p[1] - z) < 1.1)) continue;
      trees.push([x, z]);
    }
    if (trees.length) {
      const im = new THREE.InstancedMesh(this.treeGeo, this.treeMat, trees.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), cc = new THREE.Color();
      trees.forEach(([x, z], i) => {
        const r = unit(t.item.key, 'gt' + i), sz = 1.1 + r * 0.9;
        p.set(x, y + 0.08, z); sc.set(sz, sz * (0.9 + r * 0.4), sz); q.setFromAxisAngle(YAXIS, r * 6.28);
        m.compose(p, q, sc); im.setMatrixAt(i, m);
        cc.setHSL(0.33 + (r - 0.5) * 0.08, 0.25, 0.9 + r * 0.1); im.setColorAt(i, cc);
      });
      im.castShadow = true;
      grp.add(im);
    }
    this._pickable(grp, { type: 'project', main: t, kindLabel: 'Garden', title: t.item.name, at: new THREE.Vector3(s.x, y + 1, s.z),
      text: (c.tests ? c.tests + (c.tests === 1 ? ' test keeps' : ' tests keep') + ' this project healthy: a tree for each. ' : '') + (stones.length ? 'The stones carry its pictures.' : '') });
    this._pop(grp, t0);
    this.props.add(grp);
  }
  /* A picture from the repo, carved into a standing stone. */
  _stone(file, x, z, t0, owner, parent) {
    const holder = new THREE.Group();
    holder.position.set(x, this.baseY + (parent ? 0.08 : 0), z);
    holder.rotation.y = FACE;
    (parent || this.props).add(holder);
    if (!parent) this._propFiles = (this._propFiles || 0) + 1;
    const gen = this.gen;
    if (!file.h || (file.s || 0) > 900000) return;
    this._job(() => this.h.fetchBlob(owner.repo, file.h).then((buf) => {
      if (!buf || gen !== this.gen) return null;
      const type = /\.png$/i.test(file.p) ? 'image/png' : /\.gif$/i.test(file.p) ? 'image/gif' : /\.webp$/i.test(file.p) ? 'image/webp' : 'image/jpeg';
      return P.engraveImage(new Blob([buf], { type }));
    }).then((tex) => {
      if (!tex || gen !== this.gen) return;
      const st = P.carvedStone(tex);
      holder.add(st);
      this._pickable(st, this._ownerRef(owner, 'Carved stone', file.p.split('/').pop(), 'A picture in ' + (this.names.get(owner.repo) || 'this project') + ', carved in stone: ' + file.p, file));
      this._pop(st, performance.now());
    }));
  }
  /* The project's cover picture on a billboard. */
  _billboard(t, site, t0) {
    const gen = this.gen;
    this._job(() => this.h.loadImage(t.item.key, t.item.cover).then((url) => {
      if (!url || gen !== this.gen) return null;
      return new Promise((resolve) => new THREE.TextureLoader().load(url, resolve, undefined, () => resolve(null)));
    }).then((tex) => {
      if (!tex || gen !== this.gen) return;
      tex.colorSpace = THREE.SRGBColorSpace;
      const w = clamp(Math.sqrt(site.area) * 1.2, 4, 9), h = w / ((tex.image && tex.image.width / tex.image.height) || 1.6);
      const b = P.billboard(tex, w, h);
      b.position.set(site.x, this.baseY, site.z); b.rotation.y = FACE;
      this._pickable(b, { type: 'project', main: t, kindLabel: 'Billboard', title: t.item.name, text: 'The project’s own picture.' });
      this._pop(b, Math.max(t0, performance.now()));
      this.props.add(b);
    }));
  }

  /* ---- flags (platforms) and cranes (work in progress), after the city has risen ---- */
  _buildFlags() {
    if (this.level.kind !== 'estate') return;
    const colour = new Map(this.platforms.map((p) => [p.id, p.color]));
    const spots = [];
    this.towers.forEach((t) => {
      if (t.type !== 'project' || t.item.retired) return;
      const ws = (t.item.works || []).filter((w) => colour.has(w)).slice(0, 3);
      const fx = Math.cos(t.rot), fz = Math.sin(t.rot), sx = -fz, sz = fx;
      const out = t.w * 0.5 + 0.9;
      ws.forEach((w, i) => {
        const lat = (i - (ws.length - 1) / 2) * 1.25;
        spots.push({ x: t.x + fx * out + sx * lat, z: t.z + fz * out + sz * lat, c: colour.get(w), h: t.item.kind === 'snippet' ? 3.6 : 5.6, w, t });
      });
    });
    if (!spots.length) return;
    const poleGeo = new THREE.CylinderGeometry(0.05, 0.06, 1, 6).translate(0, 0.5, 0);
    const poles = new THREE.InstancedMesh(poleGeo, new THREE.MeshStandardMaterial({ color: 0xD5DBE1, metalness: 0.5, roughness: 0.4 }), spots.length);
    const cloth = new THREE.InstancedMesh(P.flagGeometry(), P.flagMaterial(this.uniforms), spots.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), c = new THREE.Color();
    const wind = -0.7;
    spots.forEach((s, i) => {
      p.set(s.x, this.baseY, s.z); sc.set(1, s.h, 1); q.identity(); m.compose(p, q, sc); poles.setMatrixAt(i, m);
      const fw = s.h * 0.3;
      p.set(s.x, this.baseY + s.h - fw * 0.36, s.z); sc.set(fw, fw, fw); q.setFromAxisAngle(YAXIS, wind); m.compose(p, q, sc); cloth.setMatrixAt(i, m);
      cloth.setColorAt(i, c.set(s.c));
    });
    poles.castShadow = cloth.castShadow = true;
    this.props.add(poles, cloth);
    this._pickable(cloth, { type: 'flags', spots });
    this._pop(poles, performance.now()); this._pop(cloth, performance.now() + 150);
  }
  _buildCranes() {
    if (this.level.kind !== 'estate') return;
    this.towers.forEach((t) => {
      if (t.type !== 'project' || !/in-progress|experimental/.test(t.item.status || '')) return;
      const cr = P.crane();
      const corner = t.mainPlot.reduce((best, q) => (Math.hypot(q[0] - t.x, q[1] - t.z) > Math.hypot(best[0] - t.x, best[1] - t.z) ? q : best), t.mainPlot[0]);
      cr.position.set(t.x + (corner[0] - t.x) * 0.7, this.baseY, t.z + (corner[1] - t.z) * 0.7);
      cr.scale.setScalar(clamp(t.h / 14, 0.55, 1.5));
      this.spinners.push({ o: cr.userData.jib, v: 0.12 });
      this._pickable(cr, { type: 'project', main: t, kindLabel: 'Crane', title: t.item.name, text: t.item.status === 'experimental' ? 'An experiment: work on it is still going on.' : 'Work in progress: not finished yet.' });
      this._pop(cr, performance.now());
      this.props.add(cr);
    });
  }

  /* ---- the learner's journey: a golden cable car between the squares, in order ---- */
  _buildCable() {
    const stops = this.hoods.map((h) => this.districts.find((d) => d.hood && d.hood.id === h.id)).filter((d) => d && d.plaza);
    if (stops.length < 2) return;
    const pts = [];
    stops.forEach((d, i) => {
      pts.push(new THREE.Vector3(d.plaza.x, d.monumentTop + 4.5, d.plaza.z));
      if (i < stops.length - 1) {
        const n = stops[i + 1];
        pts.push(new THREE.Vector3((d.plaza.x + n.plaza.x) / 2, MAX_H + 9, (d.plaza.z + n.plaza.z) / 2));
      }
    });
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const gold = new THREE.MeshStandardMaterial({ color: 0xE0A800, emissive: 0x6B5000, emissiveIntensity: 0.35, metalness: 0.45, roughness: 0.35 });
    this.props.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 700, 0.2, 6), gold));
    stops.forEach((d) => {
      const h = 5.1;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, h, 6).translate(0, h / 2, 0), gold);
      pole.position.set(d.plaza.x, d.monumentTop - 0.6, d.plaza.z);
      this.props.add(pole);
    });
    const N = 900, samples = [];
    for (let i = 0; i <= N; i++) samples.push(curve.getPointAt(i / N));
    const stopU = pts.filter((_, i) => i % 2 === 0).map((p) => {
      let bi = 0, bd = Infinity;
      samples.forEach((q, i) => { const dd = q.distanceToSquared(p); if (dd < bd) { bd = dd; bi = i; } });
      return bi / N;
    });
    const car = P.cableCar();
    car.scale.setScalar(1.7);
    this.props.add(car);
    this._pickable(car, { type: 'info', kindLabel: 'The learner’s journey', title: 'The golden cable car',
      text: 'It stops at each neighbourhood in the order a learner meets our work: from signing in to the final report.' });
    this.cable = { curve, stopU, car, i: 0, dir: 1, t0: performance.now(), phase: 'wait', u: stopU[0], names: stops.map((d) => d.label), counts: stops.map((d) => d.count) };
  }
  _stepCable(now) {
    const c = this.cable;
    if (!c) return;
    const move = 6500, wait = 1800;
    let u = c.stopU[c.i];
    if (!REDUCED.matches) {
      if (c.phase === 'wait' && now - c.t0 > wait) {
        if (c.i + c.dir < 0 || c.i + c.dir >= c.stopU.length) c.dir = -c.dir;
        c.phase = 'move'; c.t0 = now;
      }
      if (c.phase === 'move') {
        const k = Math.min(1, (now - c.t0) / move), a = c.stopU[c.i], b = c.stopU[c.i + c.dir];
        u = a + (b - a) * easeInOut(k);
        if (k >= 1) { c.i += c.dir; c.phase = 'wait'; c.t0 = now; u = b; }
      }
    }
    const uu = clamp(u, 0, 1), p = c.curve.getPointAt(uu), tg = c.curve.getTangentAt(uu);
    c.u = uu;
    c.car.position.set(p.x, p.y - 2.3 * c.car.scale.y, p.z);
    c.car.rotation.y = Math.atan2(tg.x, tg.z) - Math.PI / 2;
    if (this.ride) {
      /* ride along: sit just behind the car, looking down the line */
      const dir = tg.clone().multiplyScalar(c.dir), car = c.car.position;
      const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
      const eye = car.clone().addScaledVector(dir, -16).addScaledVector(side, 4); eye.y += 7;
      const look = car.clone().addScaledVector(dir, 24); look.y -= 9;
      this.camera.position.lerp(eye, 0.12);
      this.controls.target.lerp(look, 0.12);
      this.camera.lookAt(this.controls.target);
      const at = c.phase === 'wait' ? c.i : -1;
      if (at !== this.ride.at) {
        this.ride.at = at;
        this.h.onTour({ kind: 'cable', ride: true, i: Math.max(0, c.i), n: c.stopU.length, moving: at < 0,
          title: at < 0 ? 'On the way to ' + c.names[c.i + c.dir] : c.names[at],
          text: at < 0 ? 'The next stop in the learner’s journey.' : 'Stop ' + (at + 1) + ' of ' + c.stopU.length + ': ' + c.counts[at] + (c.counts[at] === 1 ? ' project' : ' projects') + ' here.' });
      }
    }
  }

  /* ---- the live sites: small islands with lighthouses, and a ferry to each ---- */
  _buildSites() {
    this.siteObjs = new Map();
    const n = this.sites.length;
    if (!n) return;
    const R = CAP * 0.76;
    this.sites.forEach((s, i) => {
      const a = (i / n) * Math.PI * 2 + 0.35, x = Math.cos(a) * R, z = Math.sin(a) * R;
      const r = 6 + Math.min(8, s.count || 1) * 0.55;
      const blob = blobPolygon(r, 14, 0.3, hash32(s.id));
      const shape = new THREE.Shape();
      blob.forEach((q, k) => (k ? shape.lineTo(q[0], q[1]) : shape.moveTo(q[0], q[1])));
      const g = new THREE.ExtrudeGeometry(shape, { depth: 2.8, bevelEnabled: false });
      g.rotateX(Math.PI / 2); g.translate(0, 0.4, 0);
      const grp = new THREE.Group();
      grp.position.set(x, 0, z);
      const land = new THREE.Mesh(P.paint(g, 0xE6DCC3), this.propMat);
      const grassG = new THREE.ExtrudeGeometry(new THREE.Shape(blob.map((q) => new THREE.Vector2(q[0] * 0.72, q[1] * 0.72))), { depth: 0.12, bevelEnabled: false });
      grassG.rotateX(Math.PI / 2); grassG.translate(0, 0.52, 0);
      const grass = new THREE.Mesh(P.paint(grassG, 0x8FC27D), this.propMat);
      land.receiveShadow = grass.receiveShadow = true;
      const lh = P.lighthouse(); lh.position.y = 0.5;
      grp.add(land, grass, lh);
      this.props.add(grp);
      this._pickable(grp, { type: 'site', id: s.id, kindLabel: 'Live site', title: s.name, text: (s.count || 0) + ((s.count || 0) === 1 ? ' project runs here.' : ' projects run here.') + ' Select it to see them.' });
      const el = document.createElement('a');
      el.className = 'hx-cl hx-cl-site';
      el.href = '#/site/' + encodeURIComponent(s.id);
      el.innerHTML = '<span class="hx-cl-dot" style="background:#C0392B;border-radius:50%"></span><span class="hx-cl-name"></span><span class="hx-cl-n">' + (s.count || 0) + '</span>';
      el.querySelector('.hx-cl-name').textContent = s.name;
      this._addLabel(el, x, 11, z, { role: 'site', site: s });
      this.siteObjs.set(s.id, { lamp: lh.userData.lamp, x, z, a, r, name: s.name });
    });
    /* a ferry for every project that runs on a site, in its neighbourhood's colour */
    const trips = [];
    this.towers.forEach((t) => {
      if (t.type !== 'project' || t.item.retired) return;
      (t.item.runs || []).forEach((id) => { const o = this.siteObjs.get(id); if (o) trips.push({ t, o, id }); });
    });
    if (!trips.length) return;
    const boats = new THREE.InstancedMesh(P.boatGeometry(), this.propMat, trips.length);
    const c = new THREE.Color();
    trips.forEach((tr, i) => {
      const k = trips.filter((x) => x.id === tr.id).indexOf(tr), side = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 2.2;
      const nx = -Math.sin(tr.o.a), nz = Math.cos(tr.o.a);
      tr.from = new THREE.Vector3(Math.cos(tr.o.a) * CAP * 0.56 + nx * side, -2.25, Math.sin(tr.o.a) * CAP * 0.56 + nz * side);
      tr.to = new THREE.Vector3(tr.o.x - Math.cos(tr.o.a) * (tr.o.r + 2) + nx * side * 0.4, -2.25, tr.o.z - Math.sin(tr.o.a) * (tr.o.r + 2) + nz * side * 0.4);
      tr.period = 15000 + unit(tr.t.item.key + tr.id, 'b') * 9000; tr.phase = unit(tr.t.item.key + tr.id, 'p');
      boats.setColorAt(i, c.set(tr.t.district.color).lerp(new THREE.Color(0xffffff), 0.35));
    });
    boats.castShadow = true; boats.frustumCulled = false;
    this.props.add(boats);
    this._pickable(boats, { type: 'boats', trips });
    this.movers.push({ kind: 'boats', o: boats, trips });
  }
  /* The selected project's sites light up, with a dashed route from its building. */
  _lightSites(t) {
    if (this.siteRoutes) { this.props.remove(this.siteRoutes); this.siteRoutes.geometry.dispose(); this.siteRoutes.material.dispose(); this.siteRoutes = null; }
    if (!this.siteObjs) return;
    const on = new Set(t && t.type === 'project' ? (t.item.runs || []) : []);
    this.siteObjs.forEach((o, id) => { o.lamp.material.emissiveIntensity = on.has(id) ? 2.2 : 0.25; });
    if (!on.size) return;
    const pts = [];
    on.forEach((id) => {
      const o = this.siteObjs.get(id);
      if (!o) return;
      const a = new THREE.Vector3(t.x, this.baseY + t.h, t.z), b = new THREE.Vector3(o.x, 9, o.z);
      const mid = a.clone().lerp(b, 0.5); mid.y += 18;
      const cv = new THREE.QuadraticBezierCurve3(a, mid, b).getPoints(40);
      for (let i = 0; i < cv.length - 1; i++) pts.push(cv[i], cv[i + 1]);
    });
    if (!pts.length) return;
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    this.siteRoutes = new THREE.LineSegments(g, new THREE.LineDashedMaterial({ color: 0xC0392B, dashSize: 1.6, gapSize: 1.1, transparent: true, opacity: 0.85 }));
    this.siteRoutes.computeLineDistances();
    this.props.add(this.siteRoutes);
  }

  /* ---- life in the city, all from the data ----
     people: changes in the last 30 days, walking round their project's block
     birds:  open issues and pull requests, circling the project's building
     clouds: a project nobody has changed for over a year */
  _buildLife() {
    const projects = this.towers.filter((t) => t.type === 'project' && !t.item.retired);
    /* people */
    const walkers = [];
    projects.forEach((t) => {
      const n = Math.min(t.item.recent || 0, 6);
      if (!n) return;
      const s = plotToSite(t.plot), c = [s.x, s.z];
      const pts = t.plot.map((q) => { const dx = q[0] - c[0], dz = q[1] - c[1], L = Math.hypot(dx, dz) || 1; return [q[0] + dx / L * 0.75, q[1] + dz / L * 0.75]; });
      const lens = [0];
      for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; lens.push(lens[i] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
      const loop = { pts, lens, total: lens[lens.length - 1] };
      if (loop.total < 4) return;
      for (let i = 0; i < n; i++) walkers.push({ t, loop, s: unit(t.item.key, 'w' + i), v: (0.8 + unit(t.item.key, 'v' + i) * 0.6) * (i % 2 ? 1 : -1), off: (unit(t.item.key, 'o' + i) - 0.5) * 0.5 });
    });
    if (walkers.length) {
      const people = new THREE.InstancedMesh(P.personGeometry(), this.propMat, walkers.length);
      const pal = [0x0074B4, 0x27AAE1, 0xFFC20E, 0x2D9E5A, 0xC0392B, 0x5B4FC4, 0xE07B00, 0x3D3D3D], c = new THREE.Color();
      walkers.forEach((w, i) => people.setColorAt(i, c.set(pal[hash32(w.t.item.key + i) % pal.length])));
      people.castShadow = true; people.frustumCulled = false;
      this.props.add(people);
      this._pickable(people, { type: 'people', walkers });
      this.movers.push({ kind: 'people', o: people, walkers });
    }
    /* birds */
    const flock = [];
    projects.forEach((t) => { for (let i = 0; i < Math.min(t.item.issues || 0, 5); i++) flock.push({ t, i, n: Math.min(t.item.issues, 5) }); });
    if (flock.length) {
      const birds = new THREE.InstancedMesh(P.birdGeometry(), new THREE.MeshStandardMaterial({ color: 0x3D4A57, side: THREE.DoubleSide }), flock.length);
      birds.frustumCulled = false;
      this.props.add(birds);
      this._pickable(birds, { type: 'birds', flock });
      this.movers.push({ kind: 'birds', o: birds, flock });
    }
    /* clouds */
    projects.filter((t) => t.item.stale).forEach((t) => {
      const cl = new THREE.Mesh(P.cloudGeometry(hash32(t.item.key) % 997), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, transparent: true, opacity: 0.9 }));
      cl.scale.setScalar(0.32);
      const y = this.baseY + t.h + 7;
      cl.position.set(t.x, y, t.z);
      this.props.add(cl);
      const when = t.item.lastChange ? new Date(t.item.lastChange).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'over a year ago';
      this._pickable(cl, { type: 'project', main: t, kindLabel: 'A cloud', title: t.item.name, text: 'Nobody has changed it for over a year. The last change was in ' + when + '.' });
      this.movers.push({ kind: 'cloud', o: cl, x: t.x, z: t.z, y, ph: unit(t.item.key, 'c') * 6 });
    });
  }
  _stepMovers(now, dt) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
    this.movers.forEach((mv) => {
      if (mv.kind === 'cloud') {
        mv.o.position.set(mv.x + Math.sin(now * 0.0003 + mv.ph) * 1.2, mv.y + Math.sin(now * 0.0007 + mv.ph) * 0.3, mv.z + Math.cos(now * 0.00025 + mv.ph) * 1.2);
      } else if (mv.kind === 'boats') {
        mv.trips.forEach((tr, i) => {
          const k = ((now / tr.period) + tr.phase) % 1, back = k > 0.5, u = back ? (1 - k) * 2 : k * 2;
          p.lerpVectors(tr.from, tr.to, easeInOut(u));
          p.y = -2.3 + Math.sin(now * 0.002 + tr.phase * 9) * 0.08;
          const dx = (tr.to.x - tr.from.x) * (back ? -1 : 1), dz = (tr.to.z - tr.from.z) * (back ? -1 : 1);
          q.setFromAxisAngle(YAXIS, Math.atan2(-dz, dx)); s.set(1.3, 1.3, 1.3);
          m.compose(p, q, s); mv.o.setMatrixAt(i, m);
        });
        mv.o.instanceMatrix.needsUpdate = true;
        mv.o.boundingSphere = null;
      } else if (mv.kind === 'birds') {
        mv.flock.forEach((b, i) => {
          const t = b.t, a = now * 0.0006 * (1 + (b.i % 3) * 0.12) + (b.i / b.n) * Math.PI * 2, r = t.w * 0.7 + 2.5 + (b.i % 2) * 1.2;
          p.set(t.x + Math.cos(a) * r, this.baseY + t.h + 3 + Math.sin(now * 0.0015 + b.i) * 0.8 + b.i * 0.4, t.z + Math.sin(a) * r);
          q.setFromAxisAngle(YAXIS, -a);
          s.set(0.9, 0.35 + Math.abs(Math.sin(now * 0.012 + b.i * 1.3)) * 0.8, 0.9);
          m.compose(p, q, s); mv.o.setMatrixAt(i, m);
        });
        mv.o.instanceMatrix.needsUpdate = true;
        mv.o.boundingSphere = null;
      } else if (mv.kind === 'people') {
        mv.walkers.forEach((w, i) => {
          const L = w.loop;
          w.s = (w.s + (w.v * dt) / L.total + 1) % 1;
          const d = w.s * L.total;
          let k = 1; while (k < L.lens.length - 1 && L.lens[k] < d) k++;
          const a = L.pts[k - 1], b = L.pts[k % L.pts.length], f = (d - L.lens[k - 1]) / Math.max(1e-6, L.lens[k] - L.lens[k - 1]);
          const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) || 1;
          p.set(a[0] + dx * f - dz / len * w.off, 0.02 + Math.abs(Math.sin(now * 0.008 + i)) * 0.05, a[1] + dz * f + dx / len * w.off);
          q.setFromAxisAngle(YAXIS, Math.atan2(dx * Math.sign(w.v), dz * Math.sign(w.v)));
          s.set(1.2, 1.2, 1.2);
          m.compose(p, q, s); mv.o.setMatrixAt(i, m);
        });
        mv.o.instanceMatrix.needsUpdate = true;
        mv.o.boundingSphere = null;
      }
    });
  }

  /* ---- inside a project: folders are blocks, files are buildings (v2 grammar) ---- */
  _plateFor(n) { return clamp(Math.sqrt(Math.max(1, n)) * 5.4, 72, CAP); }

  _layoutSubtree(node, poly, out, depth = 0) {
    const items = [];
    node.dirs.forEach((dd) => items.push({ kind: 'dir', node: dd, value: dd.value }));
    node.files.forEach((f) => items.push({ kind: 'file', file: f, value: f.value }));
    if (!items.length) return;
    items.sort((a, b) => b.value - a.value);
    const PL = this.plate;
    layoutPoly(poly, items, (it, plot) => {
      if (it.kind === 'dir') this._layoutSubtree(it.node, plot, out, depth + 1);
      else out.push({ file: it.file, site: plotToSite(plot) });
    }, { pad: depth === 0 ? PL * 0.010 : PL * 0.005, leafPad: PL * 0.004, jitter: 0.55 });
  }

  _buildInside() {
    const lv = this.level, root = this.roots.get(lv.repo);
    this.baseY = 0.35;
    this.trees_ = [];
    this._propFiles = 0;
    if (!root) return;
    const node = lv.kind === 'repo' ? root : descend(root, lv.path);
    if (!node) return;
    const items = [];
    node.dirs.forEach((dd, name) => items.push({ kind: 'dir', name, node: dd, value: dd.value }));
    if (node.files.length) items.push({ kind: 'files', name: lv.kind === 'repo' ? 'Top level' : 'In this folder', files: node.files, value: node.files.reduce((s, f) => s + f.value, 0) });
    if (!items.length) return;
    items.sort((a, b) => b.value - a.value);
    const PL = this._plateFor(node.count);
    this._setPlate(PL);
    const island = blobPolygon(PL * 0.47, 22, 0.14, 0x51D0C2);
    seedPlan(0x0BB1E5);
    const sig = this.sigs.get(lv.repo) || { verticality: 1, slender: 0.9, twist: 0, hueShift: 0 };
    const now = performance.now();
    let order = 0;
    layoutPoly(island, items, (it, plot) => {
      const cells = [];
      if (it.kind === 'dir') this._layoutSubtree(it.node, plot, cells);
      else layoutPoly(plot, it.files.map((f) => ({ file: f, value: f.value })),
        (x, fp) => cells.push({ file: x.file, site: plotToSite(fp) }), { pad: PL * 0.010, leafPad: PL * 0.006, jitter: 0.55 });
      if (!cells.length) return;
      const c = polyCentroid(plot);
      const path = (lv.kind === 'repo' ? '' : lv.path + '/') + it.name;
      const d = {
        key: path, label: it.kind === 'dir' ? it.name + '/' : it.name,
        sub: (it.kind === 'dir' ? it.node.count : it.files.length) + ' files',
        color: it.kind === 'dir' ? '#27AAE1' : '#8FA3B8', plot, cx: c[0], cz: c[1],
        radius: Math.max(inradiusAt(plot, c), Math.sqrt(polyArea(plot)) * 0.42),
        target: it.kind === 'dir' ? { kind: 'dir', repo: lv.repo, path } : null,
        towers: [], lots: [], count: cells.length,
        t0: REDUCED.matches ? now - 9999 : now + order++ * 90
      };
      this.districts.push(d);
      this._addFiles(d, cells, sig);
      this._dirLabel(d);
    }, { pad: PL * 0.020, leafPad: PL * 0.014, jitter: 0.42 });
    this._rankLabels();
  }

  _addFiles(d, cells, sig) {
    let maxSize = 1;
    cells.forEach((c) => { maxSize = Math.max(maxSize, c.file.size || 0); });
    const ranked = cells.slice().sort((a, b) => (a.file.size || 0) - (b.file.size || 0));
    const pctOf = new Map();
    ranked.forEach((c, i) => pctOf.set(c, ranked.length > 1 ? i / (ranked.length - 1) : 1));
    const landmark = ranked[ranked.length - 1];
    const owner = { repo: this.level.repo };
    cells.forEach((c) => {
      const f = c.file, raw = { p: f.path, s: f.size, h: f.sha };
      const foot = Math.min(13, Math.max(0.4, Math.min(Math.sqrt(c.site.area) * 0.62, c.site.r * 1.9) * (sig.slender || 0.9)));
      /* the same props as in the city: fonts are columns, SVGs statues, pictures carved stones */
      if (IS_FONT.test(f.path)) { this._column(raw, c.site, foot, d.t0, owner); return; }
      if (IS_SVG.test(f.path)) { this._statue({ sha: f.sha, path: f.path }, c.site, d.t0, owner, clamp(foot * 0.8, 1.2, 3)); return; }
      if (IS_IMG.test(f.path) && (f.size || 0) <= 900000) { this._stone(raw, c.site.x, c.site.z, d.t0, owner, null); return; }
      const depth = (f.path.match(/\//g) || []).length;
      const arch = variantFor(f.path, pctOf.get(c), c === landmark, sig, depth);
      const mag = Math.pow((f.size || 0) / maxSize, 0.38);
      const h = Math.min((1.4 + mag * MAX_H) * (sig.verticality || 1), foot * 7.5, MAX_H * 1.5);
      const col = new THREE.Color(fileColor(f.path));
      col.offsetHSL(sig.hueShift || 0, 0, 0);
      this._place(arch, { type: 'file', item: f, district: d, x: c.site.x, z: c.site.z, w: foot, dd: foot,
        rot: c.site.angle + (sig.twist || 0) * (unit(f.path, 'tw') - 0.5), h, col,
        order: d.towers.length / Math.max(1, cells.length), seed: unit(f.path, 's') });
    });
  }

  /* Put one building into the instanced batch for its form. */
  _place(arch, t, geoFn) {
    const b = this._batch(arch, 1, geoFn);
    const i = b.n++;
    b.hs[i] = t.h; b.seeds[i] = t.seed || 0;
    b.mesh.setColorAt(i, t.col);
    Object.assign(t, { batch: b, i, lit: 0, litTarget: 0, delay: 0, baseCol: t.col.clone() });
    b.towers[i] = t;
    t.district.towers.push(t);
    this.towers.push(t);
    b.dirty = true;
    return t;
  }

  _batch(arch, want, geoFn) {
    let b = this.batches.get(arch);
    const need = (b ? b.n : 0) + want;
    if (!b || b.cap < need) {
      const cap = Math.max(need * 2, 32);
      const geo = geoFn ? geoFn() : variantGeometry(arch).clone();
      const mesh = new THREE.InstancedMesh(geo, geoFn ? this.ruinMat : this.towerMat, cap);   /* ruins have no windows */
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      const lit = new Float32Array(cap), hs = new Float32Array(cap), seeds = new Float32Array(cap);
      geo.setAttribute('aLit', new THREE.InstancedBufferAttribute(lit, 1));
      geo.setAttribute('aH', new THREE.InstancedBufferAttribute(hs, 1));
      geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
      const next = { arch, mesh, cap, lit, hs, seeds, towers: [], n: 0, litAttr: geo.getAttribute('aLit'), dirty: true };
      mesh.setColorAt(0, new THREE.Color(1, 1, 1));
      if (b) {
        const c = new THREE.Color();
        for (let i = 0; i < b.n; i++) {
          next.hs[i] = b.hs[i]; next.seeds[i] = b.seeds[i]; next.lit[i] = b.lit[i];
          next.towers[i] = b.towers[i]; b.towers[i].batch = next;
          b.mesh.getColorAt(i, c); mesh.setColorAt(i, c);
        }
        next.n = b.n;
        this.rig.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.dispose();
      }
      mesh.count = next.n;
      this.rig.add(mesh);
      this.batches.set(arch, next);
      b = next;
    }
    return b;
  }

  /* Neighbourhood plates (tinted by stage), a lighter lot under each project, a paved square. */
  _buildGround() {
    const geos = [];
    const col = new THREE.Color(), light = new THREE.Color(0xF1F4F7), white = new THREE.Color(0xffffff);
    const slab = (poly, y0, depth, c) => {
      if (!poly || poly.length < 3) return;
      const shape = new THREE.Shape();
      poly.forEach((q, i) => (i ? shape.lineTo(q[0], q[1]) : shape.moveTo(q[0], q[1])));
      shape.closePath();
      const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
      g.rotateX(Math.PI / 2);
      g.translate(0, y0 + depth, 0);
      g.deleteAttribute('uv');
      const n = g.getAttribute('position').count, a = new Float32Array(n * 3);
      for (let k = 0; k < n; k++) { a[k * 3] = c.r; a[k * 3 + 1] = c.g; a[k * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(a, 3));
      geos.push(g.index ? g.toNonIndexed() : g);
    };
    const estate = this.level.kind === 'estate';
    this.districts.forEach((d) => {
      col.set(d.color).lerp(light, estate ? 0.55 : 0.5);
      slab(d.plot, 0, estate ? 0.32 : 0.33, col.clone());
      if (estate) {
        const lot = new THREE.Color(d.color).lerp(white, 0.8);
        d.lots.forEach((p) => slab(p, 0.32, 0.16, lot));
        if (d.plaza) slab(d.plaza.plot, 0.32, 0.16, new THREE.Color(d.color).lerp(white, 0.9));
      }
    });
    if (!geos.length) return;
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) return;
    this.ground = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 }));
    this.ground.receiveShadow = true;
    this.rig.add(this.ground);
  }

  _buildTrees() {
    const list = this.trees_ || [];
    if (!list.length) return;
    const mesh = new THREE.InstancedMesh(this.treeGeo, this.treeMat, list.length);
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
    list.forEach((t, i) => {
      p.set(t.x, this.baseY, t.z); s.set(t.s, t.s, t.s); q.setFromAxisAngle(YAXIS, t.rnd * 6.28);
      m.compose(p, q, s); mesh.setMatrixAt(i, m);
      c.setHSL(0.36 + (t.rnd - 0.5) * 0.06, 0.2, 0.92 + t.rnd * 0.08); mesh.setColorAt(i, c);
    });
    this.treeMesh = mesh;
    this.rig.add(mesh);
  }

  /* ================= labels ================= */
  _addLabel(el, x, y, z, data) {
    const o = new CSS2DObject(el);
    o.position.set(x, y, z);
    o.userData = Object.assign({ a: -1 }, data);
    el.style.visibility = 'hidden'; el.style.opacity = '0';
    this.rig.add(o); this.labels.push(o);
    return o;
  }
  _setA(o, a) {
    if (Math.abs(o.userData.a - a) < 0.02) return;
    o.userData.a = a;
    const s = o.element.style;
    s.opacity = a.toFixed(2);
    s.visibility = a > 0.02 ? 'visible' : 'hidden';
    s.pointerEvents = a > 0.5 ? 'auto' : 'none';
  }
  _hoodLabel(d) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'hx-cl hx-cl-hood';
    el.innerHTML = '<span class="hx-cl-ico" style="background:' + d.color + '">' + (d.hood.icon || '') + '</span><span class="hx-cl-name"></span><span class="hx-cl-n"></span>';
    el.querySelector('.hx-cl-name').textContent = d.label;
    el.querySelector('.hx-cl-n').textContent = d.count;
    el.setAttribute('aria-label', d.label + ': ' + d.count + (d.count === 1 ? ' project' : ' projects'));
    el.addEventListener('click', (e) => { e.stopPropagation(); this.selectHood(d.hood.id); });
    const at = d.plaza ? [d.plaza.x, (d.monumentTop || 8) + 2.5, d.plaza.z] : [d.cx, this.baseY + 14, d.cz];
    d.label_ = this._addLabel(el, at[0], at[1], at[2], { role: 'hood', district: d });
  }
  _buildingLabel(t) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'hx-cl hx-cl-b' + (t.item.retired ? ' is-ruin' : '');
    el.tabIndex = -1;
    el.innerHTML = (t.item.demo ? '<span class="hx-cl-play" aria-hidden="true"></span>' : '') + '<span class="hx-cl-name"></span>';
    el.querySelector('.hx-cl-name').textContent = t.item.name;
    el.addEventListener('click', (e) => { e.stopPropagation(); this.select(t.item.key); });
    t.label = this._addLabel(el, t.x, this.baseY + t.h + (t.item.demo ? 6 : 2.4), t.z, { role: 'building', tower: t });
  }
  _dirLabel(d) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'hx-cl hx-cl-dir' + (d.target ? '' : ' is-leaf');
    el.innerHTML = '<span class="hx-cl-dot" style="background:' + d.color + '"></span><span class="hx-cl-name"></span><span class="hx-cl-n"></span>';
    el.querySelector('.hx-cl-name').textContent = d.label;
    el.querySelector('.hx-cl-n').textContent = d.sub;
    el.addEventListener('click', (e) => { e.stopPropagation(); if (d.target) this.go(d.target); else this._flyTo(new THREE.Vector3(d.cx, 6, d.cz), Math.max(24, d.radius * 3)); });
    const top = d.towers.reduce((m, t) => Math.max(m, t.h), 0);
    d.label_ = this._addLabel(el, d.cx, this.baseY + Math.min(top, MAX_H * 0.6) + 3, d.cz, { role: 'dir', district: d, area: d.radius * d.radius });
  }

  _updateLabels() {
    const cam = this.camera.position, tg = this.controls.target;
    const dist = cam.distanceTo(tg);
    if (this.walking) {
      if (this.frame % 6 === 0 || !this._shown) {
        const near = this.labels.filter((o) => o.userData.role === 'building')
          .map((o) => [o, Math.hypot(o.position.x - cam.x, o.position.z - cam.z)]).filter((x) => x[1] < 34)
          .sort((a, b) => a[1] - b[1]).map((x) => x[0]);
        this._shown = this._declutter(near);
      }
      this.labels.forEach((o) => this._setA(o, this._shown.has(o) ? 1 : 0));
      return;
    }
    if (this.level.kind === 'estate') {
      const hoodA = clamp((dist - CAP * 0.30) / (CAP * 0.2), 0, 1);
      if (this.frame % 6 === 0 || !this._shown) {
        const want = [];
        const hov = this.hover && this.hover.tower;
        if (this.selected && this.selected.label) want.push(this.selected.label);
        if (hov && hov.label && hov !== this.selected) want.push(hov.label);
        const hoods = this.labels.filter((o) => o.userData.role === 'hood')
          .sort((a, b) => (this.hoodSel === b.userData.district.hood.id) - (this.hoodSel === a.userData.district.hood.id) || b.userData.district.count - a.userData.district.count);
        const hoodList = hoodA > 0.05 ? hoods : hoods.filter((o) => this.hoodSel === o.userData.district.hood.id);
        const sites = this.labels.filter((o) => o.userData.role === 'site').sort((a, b) => (b.userData.site.count || 0) - (a.userData.site.count || 0));
        let pool = this.towers.filter((t) => t.type === 'project');
        if (this.filter) pool = pool.filter((t) => this.filter[t.item.key]);
        const K = dist < CAP * 0.95 ? Math.round(clamp(2600 / dist, 3, 18)) : 0;
        const near = pool.map((t) => [t, Math.hypot(t.x - tg.x, t.z - tg.z)]).sort((a, b) => a[1] - b[1]);
        const bl = [];
        if (this.filter && pool.length <= 12) near.forEach(([t]) => bl.push(t.label));
        else near.slice(0, K).forEach(([t, dd]) => { if (dd < CAP * 0.32) bl.push(t.label); });
        const hubs = (this.hubLabels || []).slice().sort((a, b) => b.userData.count - a.userData.count);
        if (dist < CAP * 0.55) want.push(...bl, ...hubs, ...hoodList, ...sites); else want.push(...hubs, ...hoodList, ...bl, ...sites);
        this._shown = this._declutter(want);
      }
      (this.hubLabels || []).forEach((o) => this._setA(o, this._shown.has(o) ? 1 : 0));
      this.labels.forEach((o) => {
        const u = o.userData;
        if (!this._shown.has(o)) { this._setA(o, 0); return; }
        if (u.role === 'hood') {
          let a = this.hoodSel === u.district.hood.id ? 1 : hoodA;
          if (this.filter && !u.matches) a *= 0.5;
          this._setA(o, a);
        } else this._setA(o, 1);
      });
      return;
    }
    const k = Math.round(clamp(1600 / Math.max(dist, 1), 4, 30));
    const near = this.plate * 0.34;
    const hoverD = this.hover && this.hover.tower ? this.hover.tower.district : null;
    if (this.frame % 6 === 0 || !this._shown) {
      const want = this.labels.filter((o) => {
        const d2 = Math.hypot(o.position.x - tg.x, o.position.z - tg.z);
        return o.userData.district === hoverD || o.userData.rank < k || (dist < this.plate * 0.55 && d2 < near);
      }).sort((a, b) => (b.userData.district === hoverD) - (a.userData.district === hoverD) || a.userData.rank - b.userData.rank);
      this._shown = this._declutter(want);
    }
    const a = clamp((dist - 10) / 30, 0, 1);
    this.labels.forEach((o) => this._setA(o, this._shown.has(o) ? a : 0));
  }
  _declutter(list) {
    const placed = [], ok = new Set(), v = new THREE.Vector3();
    for (const o of list) {
      if (!o || ok.has(o)) continue;
      v.copy(o.position).project(this.camera);
      if (v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) continue;
      const x = (v.x + 1) / 2 * this._w, y = (1 - v.y) / 2 * this._h;
      const el = o.element;
      if (el.offsetWidth) { o.userData.ew = el.offsetWidth; o.userData.eh = el.offsetHeight; }
      const w = (o.userData.ew || 150) / 2 + 3, h = (o.userData.eh || 26) / 2 + 2;
      const r = [x - w, y - h, x + w, y + h];
      if (r[0] < -8 || r[2] > this._w + 8 || r[1] < -8 || r[3] > this._h + 8) continue;
      if (placed.some((p) => r[0] < p[2] && r[2] > p[0] && r[1] < p[3] && r[3] > p[1])) continue;
      placed.push(r); ok.add(o);
    }
    return ok;
  }
  _rankLabels() {
    const dirs = this.labels.filter((o) => o.userData.role === 'dir').sort((a, b) => b.userData.area - a.userData.area);
    dirs.forEach((o, i) => { o.userData.rank = i; });
  }

  /* ================= selection ================= */
  select(key, fly = true) {
    if (this.tour || this.ride) this.stopTour(true), this.h.onTour(null);
    const t = this.towers.find((x) => x.type === 'project' && x.item.key === key) || null;
    this.hoodSel = null;
    this._setSelected(t);
    if (!t) { this.h.onSelect(null); return; }
    if (fly) this._flyTo(new THREE.Vector3(t.x, this.baseY + t.h * 0.45, t.z), Math.max(34, t.h * 2.4 + 20));
    this.h.onSelect({ type: 'project', key });
  }
  selectHood(id) {
    const d = this.districts.find((x) => x.hood && x.hood.id === id);
    if (!d) return;
    this._setSelected(null);
    this.hoodSel = id;
    this._flyTo(new THREE.Vector3(d.cx, 4, d.cz), Math.max(80, d.radius * 4.6));
    this.h.onSelect({ type: 'hood', id });
  }
  _selectFile(file) {
    const path = file.path || file.p, size = file.size != null ? file.size : file.s;
    this.h.onSelect({ type: 'file', repo: this.level.repo, path, name: path.split('/').pop(), size, sizeText: fmtBytes(size), typeLabel: fileTypeLabel(path) });
  }
  clearSelection() { this._setSelected(null); this.hoodSel = null; if (!this.tour) this.tourRing = false; this.h.onSelect(null); }
  _restLit(t) { return this.filter && t.item && this.filter[t.item.key] ? 1 : 0; }
  _setSelected(t) {
    if (this.selected && this.selected !== t) this.selected.litTarget = this._restLit(this.selected);
    this.selected = t;
    this._shown = null;
    if (t) {
      t.litTarget = 1.4; t.delay = 0;
      this.ring.position.set(t.x, this.baseY + 0.06, t.z);
      this.ring.scale.setScalar(t.w * 0.82 + 1.3);
      this.ring.material.opacity = 0.95;
    } else this.ring.material.opacity = 0;
    if (this.level.kind === 'estate') this._lightSites(t);
    this._holoPick();
  }

  /* ================= the demo hologram ================= */
  /* Point at a demo building (or select it) and a preview rises out of its roof:
     the project's own picture if it has one, otherwise the demo itself, small and
     sealed off (a sandboxed frame with no access to this page or the sign-in). */
  _holoPick() {
    const hov = this.hover && this.hover.tower;
    const sel = this.selected;
    const want = hov && hov.type === 'project' && hov.item.demo && !hov.item.retired ? hov : (sel && sel.type === 'project' && sel.item.demo ? sel : null);
    if (want === this.holo.t) return;
    this.holo.t = want;
    this.holo.a = 0;
    clearTimeout(this._holoT);
    if (!want) return;
    this.holo.cap.textContent = want.item.name;
    this.holo.screen.innerHTML = '<div class="hx-holo-wait">Loading the preview</div>';
    this._holoT = setTimeout(() => this._holoFill(want), want === sel ? 0 : 280);
  }
  _holoFill(t) {
    const key = t.item.key, cached = this.holo.cache.get(key);
    const show = (node) => { if (this.holo.t !== t) return; this.holo.screen.textContent = ''; this.holo.screen.appendChild(node); };
    if (cached) { show(cached); return; }
    this.h.demoPreview(key).then((pv) => {
      let node = null;
      if (pv && pv.img) { node = document.createElement('img'); node.alt = ''; node.src = pv.img; }
      else if (pv && pv.html) {
        node = document.createElement('div'); node.className = 'hx-holo-frame';
        const f = document.createElement('iframe');
        f.setAttribute('sandbox', 'allow-scripts');
        f.setAttribute('tabindex', '-1'); f.setAttribute('aria-hidden', 'true'); f.setAttribute('title', 'Demo preview');
        f.srcdoc = pv.html;
        node.appendChild(f);
      }
      if (!node) { node = document.createElement('div'); node.className = 'hx-holo-wait'; node.textContent = 'Select the building, then Try the demo'; }
      this.holo.cache.set(key, node);
      show(node);
    }).catch(() => {});
  }
  _stepHolo(now, dt) {
    const H = this.holo, t = H.t;
    const visible = t && !this.walking && this.level.kind === 'estate';
    H.a = clamp(H.a + (visible ? dt * 2.2 : -dt * 4), 0, 1);
    const on = H.a > 0.01 && t;
    this.holoBeam.visible = !!on;
    this.holoObj.visible = !!on;
    if (!on) { H.el.style.opacity = '0'; return; }
    const e = easeOut(H.a), top = this.baseY + t.h + (t.proj ? t.proj.scale.y * 1.4 : 0.5);
    const rise = 10 + t.w * 0.4, wide = 2.2 + t.w * 0.2;
    this.holoBeam.position.set(t.x, top, t.z);
    this.holoBeam.scale.set(wide, Math.max(0.01, rise * e), wide);
    this.holoBeam.material.uniforms.uTime.value = now / 1000;
    this.holoBeam.material.uniforms.uAlpha.value = H.a;
    this.holoObj.position.set(t.x, top + rise * e, t.z);
    H.el.style.opacity = String(H.a);
    /* keep the screen inside the stage: slide it down over the building if it would be cut off */
    const v = this.holoObj.position.clone().project(this.camera), y = (1 - v.y) / 2 * this._h;
    const inner = H.inner || (H.inner = H.el.firstElementChild), hh = inner.offsetHeight || 210;
    const shift = Math.max(0, 12 - (y - hh));
    if (Math.abs((H.shift || 0) - shift) > 0.5) { H.shift = shift; inner.style.transform = 'translateY(calc(-50% + ' + shift.toFixed(1) + 'px))'; }
  }

  /* ================= search ================= */
  setFilter(set) {
    const sig = set ? Object.keys(set).sort().join('|') : null;
    if (sig === this._filterSig) return;
    this._filterSig = sig;
    this.filter = set;
    if (this.level.kind !== 'estate') return;
    this._applyFilter(true);
  }
  _applyFilter(animate) {
    const set = this.filter;
    this.wave = set && animate && !REDUCED.matches ? { t0: performance.now(), r: 0 } : null;
    this.towers.forEach((t) => {
      t.delay = set && this.wave ? Math.hypot(t.x, t.z) / (CAP * 0.72) : 0;
      t.litTarget = t === this.selected ? 1.4 : this._restLit(t);
    });
    this.districts.forEach((d) => {
      if (!d.label_) return;
      const m = set ? d.towers.filter((t) => t.type === 'project' && set[t.item.key]).length : d.count;
      d.label_.userData.matches = m;
      d.label_.element.querySelector('.hx-cl-n').textContent = set ? m + ' of ' + d.count : d.count;
    });
    this._recolour();
    this._shown = null;
    if (set && animate) this.frameMatches();
  }
  _recolour() {
    const col = new THREE.Color(), dim = new THREE.Color(0xA9B4BF);
    this.batches.forEach((b) => {
      for (let i = 0; i < b.n; i++) {
        const t = b.towers[i];
        if (!t) continue;
        const on = !this.filter || (t.item && this.filter[t.item.key]);
        if (!this.filter) col.copy(t.baseCol);
        else if (on) col.copy(t.baseCol).offsetHSL(0, 0.15, -0.03);
        else col.copy(t.baseCol).lerp(dim, 0.85);
        b.mesh.setColorAt(i, col);
        if (t.proj) t.proj.visible = on;
      }
      if (b.mesh.instanceColor) b.mesh.instanceColor.needsUpdate = true;
    });
  }
  frameMatches() {
    const projects = this.towers.filter((t) => t.type === 'project');
    const hits = projects.filter((t) => !this.filter || this.filter[t.item.key]);
    if (!hits.length || hits.length === projects.length) return;
    const box = new THREE.Box3();
    hits.forEach((t) => {
      box.expandByPoint(new THREE.Vector3(t.x - t.w, 0, t.z - t.w));
      box.expandByPoint(new THREE.Vector3(t.x + t.w, t.h, t.z + t.w));
    });
    const c = box.getCenter(new THREE.Vector3());
    this._flyTo(c, Math.max(box.getSize(new THREE.Vector3()).length() * 0.5, 22) * 2.4);
  }

  /* ================= connections ================= */
  setLinks(on) {
    this.linksOn = !!on;
    if (this.level.kind !== 'estate') return;
    if (this.linksOn && !this.links) { this._buildLinks(); if (!this.userMoved && !this.selected) this.resetView(true); }
    if (!this.linksOn) this._clearLinks();
    this._shown = null;
  }
  _buildLinks() {
    this._clearLinks();
    const plats = this.platforms;
    if (!plats.length) return;
    const R = CAP * 0.5, Y = MAX_H * 1.3;
    const hubs = plats.map((p, i) => {
      const a = (i / plats.length) * Math.PI * 2 - Math.PI / 2;
      return { ...p, pos: new THREE.Vector3(Math.cos(a) * R, Y + (i % 2) * 7, Math.sin(a) * R), count: 0 };
    });
    const byId = new Map(hubs.map((h) => [h.id, h]));
    const verts = [], cols = [], curves = [], ccol = [];
    const c = new THREE.Color();
    this.towers.forEach((t) => {
      if (t.type !== 'project') return;
      (t.item.works || []).forEach((w) => {
        const hub = byId.get(w);
        if (!hub) return;
        hub.count++;
        const from = new THREE.Vector3(t.x, this.baseY + t.h, t.z);
        const mid = from.clone().lerp(hub.pos, 0.5); mid.y += 16;
        const cv = new THREE.QuadraticBezierCurve3(from, mid, hub.pos);
        const pts = cv.getPoints(16);
        c.set(hub.color);
        for (let k = 0; k < pts.length - 1; k++) {
          verts.push(pts[k].x, pts[k].y, pts[k].z, pts[k + 1].x, pts[k + 1].y, pts[k + 1].z);
          cols.push(c.r, c.g, c.b, c.r, c.g, c.b);
        }
        curves.push(cv); ccol.push(c.r, c.g, c.b);
      });
    });
    if (!curves.length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    this.links = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.5, depthWrite: false }));
    this.links.frustumCulled = false;
    this.rig.add(this.links);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(curves.length * 3), 3));
    pg.setAttribute('color', new THREE.Float32BufferAttribute(ccol, 3));
    this.pulses = new THREE.Points(pg, new THREE.PointsMaterial({ size: 2.2, vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true }));
    this.pulses.frustumCulled = false;
    this.curves = curves;
    this.pulseOffset = curves.map(() => Math.random());
    this.rig.add(this.pulses);
    this.hubLabels = [];
    hubs.filter((h) => h.count).forEach((h) => {
      const el = document.createElement('a');
      el.className = 'hx-cl hx-cl-hubl';
      el.href = '#/with/' + encodeURIComponent(h.id);
      el.innerHTML = '<span class="hx-cl-dot" style="background:' + h.color + ';border-radius:50%"></span><span class="hx-cl-name"></span><span class="hx-cl-n">' + h.count + '</span>';
      el.querySelector('.hx-cl-name').textContent = h.label;
      const o = new CSS2DObject(el);
      o.position.copy(h.pos);
      o.userData = { a: -1, role: 'hub', count: h.count };
      el.style.visibility = 'hidden';
      this.rig.add(o);
      this.hubLabels.push(o);
    });
  }
  _clearLinks() {
    [this.links, this.pulses].forEach((o) => { if (o) { this.rig.remove(o); o.geometry.dispose(); o.material.dispose(); } });
    this.links = null; this.pulses = null; this.curves = null;
    (this.hubLabels || []).forEach((o) => { this.rig.remove(o); if (o.element.parentNode) o.element.remove(); });
    this.hubLabels = [];
  }
  _stepPulses(now) {
    if (!this.pulses || !this.curves) return;
    const arr = this.pulses.geometry.getAttribute('position'), t = now * 0.00016, v = new THREE.Vector3();
    for (let i = 0; i < this.curves.length; i++) { this.curves[i].getPoint((t + this.pulseOffset[i]) % 1, v); arr.setXYZ(i, v.x, v.y, v.z); }
    arr.needsUpdate = true;
  }

  /* ================= tours: the city's collections, one by one ================= */
  collections() {
    const out = { statues: [], stones: [], columns: [], gardens: [], demos: [], ruins: [], sites: [], cranes: [], clouds: [] };
    const seen = new Set();
    this.pickables.forEach((m) => {
      const r = m.userData.ref;
      if (!r || !r.obj || seen.has(r) || !m.parent) return;
      seen.add(r);
      const pos = r.at ? r.at.clone() : r.obj.getWorldPosition(new THREE.Vector3());
      const it = { pos, title: r.title, kindLabel: r.kindLabel, text: r.text, main: r.main || null, ref: r, size: 6 };
      if (/Statue|icon/.test(r.kindLabel || '')) out.statues.push({ ...it, size: r.type === 'hood' ? 9 : 5 });
      else if (r.kindLabel === 'Carved stone') out.stones.push({ ...it, size: 3.5 });
      else if (r.kindLabel === 'Font column') out.columns.push({ ...it, size: 7 });
      else if (r.kindLabel === 'Garden') out.gardens.push({ ...it, size: 7 });
      else if (r.kindLabel === 'Crane') out.cranes.push({ ...it, size: 16 });
      else if (r.kindLabel === 'A cloud') out.clouds.push({ ...it, size: 10 });
      else if (r.type === 'site') out.sites.push({ ...it, size: 16 });
    });
    this.towers.forEach((t) => {
      if (t.type !== 'project') return;
      const it = { pos: new THREE.Vector3(t.x, this.baseY + t.h * 0.5, t.z), title: t.item.name, text: t.item.tagline, main: t, size: Math.max(9, t.h) };
      if (t.item.demo) out.demos.push({ ...it, kindLabel: 'Demo to try' });
      if (t.item.retired) out.ruins.push({ ...it, kindLabel: 'Retired project' });
    });
    return out;
  }
  tourCounts() {
    const c = this.collections();
    return { sculptures: c.statues.length + c.stones.length, columns: c.columns.length, demos: c.demos.length, gardens: c.gardens.length,
      ruins: c.ruins.length, sites: c.sites.length, clouds: c.clouds.length, cable: this.cable ? this.cable.stopU.length : 0 };
  }
  startTour(kind) {
    this.stopTour(true);
    if (this.level.kind !== 'estate') return false;
    if (kind === 'cable') {
      if (!this.cable) return false;
      this.clearSelection();
      this.ride = { at: -2 };
      this.userMoved = true; this.flight = null;
      this.controls.enabled = false;
      return true;
    }
    const c = this.collections();
    let list = kind === 'sculptures' ? c.statues.concat(c.stones) : (c[kind] || []);
    if (!list.length) return false;
    /* a path, not a jumble: start nearest the view and always go to the nearest next one */
    const tg = this.controls.target, path = [];
    let here = new THREE.Vector3(tg.x, 0, tg.z);
    list = list.slice();
    while (list.length) {
      let bi = 0, bd = Infinity;
      list.forEach((it, i) => { const d = Math.hypot(it.pos.x - here.x, it.pos.z - here.z); if (d < bd) { bd = d; bi = i; } });
      const it = list.splice(bi, 1)[0]; path.push(it); here = it.pos;
    }
    this.tour = { kind, list: path, i: -1, t0: 0, paused: false };
    this.tourStep(1);
    return true;
  }
  tourStep(d) {
    const T = this.tour;
    if (!T) return;
    T.i = (T.i + d + T.list.length) % T.list.length;
    T.t0 = performance.now();
    const it = T.list[T.i];
    this.userMoved = true;
    if (it.main && (T.kind === 'demos' || T.kind === 'ruins')) {
      this._setSelected(it.main);
      this.h.onSelect({ type: 'project', key: it.main.item.key });
    } else {
      this._setSelected(null);
      this.h.onSelect(null);
      this.ring.position.set(it.pos.x, this.baseY + 0.06, it.pos.z);
      this.ring.scale.setScalar(it.size * 0.42 + 1.4);
      this.ring.material.opacity = 0.95;
      this.tourRing = true;
    }
    /* things on the ground (gardens, stones, statues, columns) are seen from higher up, so tall
       neighbours do not hide them; buildings and islands from the usual angle */
    const low = /^(gardens|sculptures|columns)$/.test(T.kind);
    const at = new THREE.Vector3(it.pos.x, Math.max(it.pos.y, 2), it.pos.z);
    this._flyTo(at, low ? this._clearView(at, Math.max(20, it.size * 3.4)) : Math.max(13, it.size * 2.3), 1500, false, low ? DOWN_DIR : null);
    this._tourNotify();
  }
  _tourNotify() {
    const T = this.tour;
    if (!T) return;
    const it = T.list[T.i];
    this.h.onTour({ kind: T.kind, i: T.i, n: T.list.length, paused: T.paused, title: it.title, kindLabel: it.kindLabel, text: it.text, key: it.main ? it.main.item.key : null });
  }
  pauseTour(p) { if (this.tour) { this.tour.paused = p; this.tour.t0 = performance.now(); this._tourNotify(); } }
  stopTour(quiet) {
    const was = this.tour || this.ride;
    if (this.ride) { this.ride = null; this.controls.enabled = true; }
    this.tour = null;
    if (this.tourRing) { this.tourRing = false; if (!this.selected) this.ring.material.opacity = 0; }
    if (was && !quiet) { this.h.onTour(null); this.resetView(); }
  }

  /* How far back to look down at a spot so the camera is above every building round it. */
  _clearView(at, dist) {
    const around = this.towers.reduce((m, t) => (Math.hypot(t.x - at.x, t.z - at.z) < 22 ? Math.max(m, t.h) : m), 0);
    return Math.max(dist, (this.baseY + around + 9 - at.y) / DOWN_DIR.y);
  }

  /* ================= search: things in the city, not only projects ================= */
  searchThings(q) {
    q = String(q || '').toLowerCase().trim();
    if (q.length < 2) return [];
    const out = [], seen = new Set();
    this.pickables.forEach((m) => {
      const r = m.userData.ref;
      if (!r || seen.has(r) || !r.title || !r.obj || r.type === 'flags') return;
      seen.add(r);
      if (((r.kindLabel || '') + ' ' + r.title + ' ' + (r.text || '')).toLowerCase().indexOf(q) >= 0) out.push(r);
    });
    this.towers.forEach((t) => {
      if (t.type === 'file' && t.file && t.file.p.toLowerCase().indexOf(q) >= 0)
        out.push({ kindLabel: fileTypeLabel(t.file.p) + ' file', title: t.file.p.split('/').pop(), text: t.item.name + ': ' + t.file.p, tower: t, main: t.main });
    });
    return out.slice(0, 40);
  }
  focusThing(r) {
    if (!r) return;
    this.stopTour(true);
    const pos = new THREE.Vector3();
    if (r.tower) pos.set(r.tower.x, this.baseY + r.tower.h * 0.5, r.tower.z);
    else if (r.at) pos.copy(r.at);
    else if (r.obj) r.obj.getWorldPosition(pos);
    if (r.main) { this._setSelected(r.main); this.h.onSelect({ type: 'project', key: r.main.item.key }); }
    else if (r.type === 'hood') { this.selectHood(r.id); return; }
    this.ring.position.set(pos.x, this.baseY + 0.06, pos.z);
    this.ring.scale.setScalar(r.tower ? r.tower.w * 0.8 + 1.3 : 3.2);
    this.ring.material.opacity = 0.95;
    this.tourRing = true;
    this.userMoved = true;
    const at = new THREE.Vector3(pos.x, Math.max(pos.y, 2), pos.z);
    this._flyTo(at, r.type === 'site' ? 40 : this._clearView(at, 22), 1200, false, r.type === 'site' ? null : DOWN_DIR);
  }

  /* ================= camera ================= */
  /* Measure, don't estimate: project the island's rim, the tallest buildings and
     (with Connections on) the platform beacons, then move the camera until they
     fill the stage, centred. */
  _frame() {
    const pts = [], R = this.plate * 0.545;
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2, x = Math.cos(a) * R, z = Math.sin(a) * R;
      pts.push(new THREE.Vector3(x, 0, z), new THREE.Vector3(x, -5, z));
    }
    this.towers.slice().sort((a, b) => b.h - a.h).slice(0, 80)
      .forEach((t) => pts.push(new THREE.Vector3(t.x, this.baseY + t.h, t.z)));
    (this.hubLabels || []).forEach((o) => pts.push(o.position.clone().setY(o.position.y + 4)));
    const cam = this.camera.clone(), v = new THREE.Vector3(), up = new THREE.Vector3();
    const tanV = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const target = new THREE.Vector3(0, 0, 0);
    let dist = this.plate * 2;
    for (let k = 0; k < 5; k++) {
      cam.position.copy(target).addScaledVector(VIEW_DIR, dist);
      cam.lookAt(target);
      cam.updateMatrixWorld(true);
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      pts.forEach((p) => { v.copy(p).project(cam); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); });
      up.setFromMatrixColumn(cam.matrixWorld, 1);
      target.y += ((y0 + y1) / 2) * tanV * dist / Math.max(0.3, up.y);
      dist *= Math.max(Math.max(-x0, x1) / 0.95, ((y1 - y0) / 2) / 0.88);
    }
    return { target, dist: clamp(dist, this.controls.minDistance, this.controls.maxDistance) };
  }
  resetView(soft) {
    this.userMoved = false;
    const f = this._frame();
    this._flyTo(f.target, f.dist, soft ? 900 : 1150, true);
  }
  zoom(f) {
    const tg = this.controls.target, dist = this.camera.position.distanceTo(tg);
    this.userMoved = true;
    this._flyTo(tg.clone(), clamp(dist * f, this.controls.minDistance, this.controls.maxDistance), 420);
  }
  _flyTo(target, dist, ms, standard, look) {
    let dir = this.camera.position.clone().sub(this.controls.target).normalize();
    if (look) dir = look.clone();
    else if (standard || !isFinite(dir.x)) dir = VIEW_DIR.clone();
    if (dir.y < 0.3) { dir.y = 0.5; dir.normalize(); }
    this.flight = {
      t0: performance.now(), ms: REDUCED.matches ? 1 : (ms || 1050),
      fromT: this.controls.target.clone(), toT: target.clone(),
      fromP: this.camera.position.clone(), toP: target.clone().addScaledVector(dir, dist)
    };
  }

  /* ================= walk the streets ================= */
  enterWalk() {
    if (this.walking || !this.towers.length) return;
    if (!this.fp) {
      this.fp = new PointerLockControls(this.camera, this.renderer.domElement);
      this.scene.add(this.fp.object);
      this.keys = {};
      this._onKey = (e) => {
        const k = e.code;
        if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].indexOf(k) < 0) return;
        this.keys[k] = e.type === 'keydown';
        e.preventDefault();
      };
      this.fp.addEventListener('unlock', () => { if (this.walking) this.exitWalk(); });
    }
    const t = this.controls.target, cp = this.camera.position;
    let sx = t.x + (cp.x - t.x) * 0.3, sz = t.z + (cp.z - t.z) * 0.3;
    const lim = this.plate * 0.44, dd = Math.hypot(sx, sz);
    if (dd > lim) { sx *= lim / dd; sz *= lim / dd; }
    const spot = this._freeSpotNear(sx, sz, 2.2);
    this.walking = true;
    this._shown = null;
    this.controls.enabled = false;
    this.flight = null;
    this.camera.position.set(spot.x, WALK_EYE, spot.z);
    this.camera.lookAt(t.x, WALK_EYE + 1, t.z);
    this.camera.near = 0.3; this.camera.updateProjectionMatrix();
    document.addEventListener('keydown', this._onKey);
    document.addEventListener('keyup', this._onKey);
    try { this.fp.lock(); } catch (e) { /* the browser may refuse pointer lock; walking still works with the keys */ }
    this._setHover(null);
    this.h.onWalk(true);
  }
  exitWalk(quiet) {
    if (!this.walking) return;
    this.walking = false;
    this._shown = null;
    this.keys = {};
    document.removeEventListener('keydown', this._onKey);
    document.removeEventListener('keyup', this._onKey);
    if (this.fp && this.fp.isLocked) this.fp.unlock();
    this.controls.enabled = true;
    this.camera.near = 0.5; this.camera.updateProjectionMatrix();
    if (!quiet) this.resetView();
    this.h.onWalk(false);
  }
  _freeSpotNear(x, z, pad = 1.0) {
    for (let ring = 0; ring < 16; ring++) {
      const rad = ring * this.plate * 0.03, n = Math.max(1, ring * 6);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2, px = x + Math.cos(a) * rad, pz = z + Math.sin(a) * rad;
        if (!this._blocked(px, pz, pad)) return { x: px, z: pz };
      }
    }
    return { x, z };
  }
  _blocked(x, z, pad) {
    for (const t of this.towers) {
      const half = t.w * 0.5 + pad;
      if (Math.abs(x - t.x) < half && Math.abs(z - t.z) < half) return true;
    }
    return false;
  }
  _stepWalk(dt) {
    const speed = (this.keys.ShiftLeft || this.keys.ShiftRight ? 30 : 13) * dt;
    let f = 0, r = 0;
    if (this.keys.KeyW || this.keys.ArrowUp) f += 1;
    if (this.keys.KeyS || this.keys.ArrowDown) f -= 1;
    if (this.keys.KeyD || this.keys.ArrowRight) r += 1;
    if (this.keys.KeyA || this.keys.ArrowLeft) r -= 1;
    if (!f && !r) return;
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir); dir.y = 0; dir.normalize();
    const side = new THREE.Vector3().crossVectors(dir, YAXIS).normalize();
    const step = dir.multiplyScalar(f).add(side.multiplyScalar(r)).normalize().multiplyScalar(speed);
    const p = this.camera.position;
    if (!this._blocked(p.x + step.x, p.z, 0.6)) p.x += step.x;
    if (!this._blocked(p.x, p.z + step.z, 0.6)) p.z += step.z;
    const lim = this.plate * 0.5, d = Math.hypot(p.x, p.z);
    if (d > lim) { p.x *= lim / d; p.z *= lim / d; }
    p.y = WALK_EYE;
  }

  /* ================= interaction ================= */
  _bind() {
    const el = this.renderer.domElement;
    el.addEventListener('pointermove', (ev) => {
      const r = el.getBoundingClientRect();
      this.pointer.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
      this.pointer.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
      this.hasPointer = ev.pointerType === 'mouse'; this.lastEv = ev;
    });
    el.addEventListener('pointerleave', () => { this.hasPointer = false; this.pointer.set(-10, -10); this._setHover(null); });
    let down = null, moved = 0;
    el.addEventListener('pointerdown', (ev) => {
      down = { x: ev.clientX, y: ev.clientY }; moved = 0;
      if (ev.pointerType !== 'mouse') {
        const r = el.getBoundingClientRect();
        this.pointer.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
        this.pointer.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
      }
    });
    el.addEventListener('pointermove', (ev) => { if (down) moved = Math.max(moved, Math.hypot(ev.clientX - down.x, ev.clientY - down.y)); });
    el.addEventListener('pointerup', (ev) => {
      if (down && moved < 6 && !this.walking) {
        if (ev.pointerType !== 'mouse') this._pick();
        if (this.hover) this._activate(this.hover);
        else this.clearSelection();
        if (ev.pointerType !== 'mouse') this._setHover(null);
      }
      down = null;
    });
    el.addEventListener('dblclick', () => {
      if (this.walking || !this.hover) return;
      const t = this.hover.tower;
      if (t && t.type === 'project') this.h.onOpen(t.item.key);
    });
    this.host.addEventListener('wheel', (e) => {
      if (this.walking || this.full || e.ctrlKey || e.metaKey) return;   /* full screen: nothing else to scroll, so the wheel zooms */
      e.stopPropagation();
      this.hint.classList.add('on');
      clearTimeout(this._hintT);
      this._hintT = setTimeout(() => this.hint.classList.remove('on'), 1500);
    }, { capture: true, passive: true });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !this.host.isConnected) return;
      if (this.walking) { this.exitWalk(); return; }
      if (this.tour || this.ride) { this.stopTour(); return; }
      const tag = (e.target && e.target.tagName) || '';
      if (/INPUT|TEXTAREA|SELECT/.test(tag) || document.querySelector('#modal.open, .demo-overlay, .hx-lightbox')) return;
      if (this.selected || this.hoodSel) this.clearSelection();
      else this.up();
    });
    new ResizeObserver(() => this._resize()).observe(this.host);
    const io = new IntersectionObserver((es) => { es.forEach((e) => { this.onScreen = e.isIntersecting; this._sync(); }); }, { rootMargin: '80px' });
    io.observe(this.host);
    document.addEventListener('visibilitychange', () => this._sync());
    this.onScreen = true;
    this._sync();
  }

  setFull(on) { this.full = !!on; }
  setInset(frac) { this.inset = frac || 0; this._applyInset(); }
  _applyInset() {
    if (this.inset && this._w && this._h) this.camera.setViewOffset(this._w, this._h, 0, Math.round(this._h * this.inset * 0.66), this._w, this._h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }
  attach() { this._resize(); this._sync(); }

  _activate(h) {
    const t = h.tower, ref = h.ref;
    if (ref) {
      if (ref.type === 'hood') return this.selectHood(ref.id);
      if (ref.type === 'site') return this.h.onOpenSite(ref.id);
      if (ref.type === 'flags') return ref.spot ? this.select(ref.spot.t.item.key) : null;
      if (ref.type === 'people' || ref.type === 'birds' || ref.type === 'boats') return t ? this.select(t.item.key) : null;
      if (ref.type === 'file' && ref.file) return this._selectFile(ref.file);
      if (ref.main) return this.select(ref.main.item.key);
      return null;
    }
    if (!t) return null;
    if (this.level.kind === 'estate') return this.select((t.main || t).item.key);
    if (t.district.target) return this.go(t.district.target);
    return this._selectFile(t.item);
  }
  _setHover(h) {
    const prev = this.hover;
    if (prev && h && prev.tower === h.tower && prev.ref === h.ref && prev.inst === h.inst && prev.file === h.file) { this._moveTip(); return; }
    if (prev && prev.tower && prev.tower !== this.selected) prev.tower.litTarget = this._restLit(prev.tower);
    this.hover = h;
    this._shown = null;
    if (h && h.tower) { if (h.tower !== this.selected) h.tower.litTarget = 1.1; h.tower.delay = 0; }
    this.renderer.domElement.style.cursor = h ? 'pointer' : 'grab';
    this._holoPick();
    if (!h) { this.tip.classList.remove('on'); return; }
    const t = h.tower, ref = h.ref, file = h.file;
    let kind = '', title = '', text = '';
    if (ref && ref.type === 'flags') { if (ref.spot) { kind = 'Flag'; title = ref.spot.w; text = ref.spot.t.item.name + ' works with ' + ref.spot.w + '.'; } }
    else if (ref && ref.type === 'people') { const w = ref.walkers[h.inst]; if (w) { kind = 'A recent change'; title = w.t.item.name; text = 'Each person is a change made in the last 30 days. ' + w.t.item.recent + (w.t.item.recent === 1 ? ' change' : ' changes') + ' here.'; } }
    else if (ref && ref.type === 'birds') { const b = ref.flock[h.inst]; if (b) { kind = 'Open issues'; title = b.t.item.name; text = b.t.item.issues + (b.t.item.issues === 1 ? ' issue or pull request is' : ' issues or pull requests are') + ' waiting. Each bird is one.'; } }
    else if (ref && ref.type === 'boats') { const tr = ref.trips[h.inst]; if (tr) { kind = 'Ferry to a live site'; title = tr.t.item.name; text = 'It runs on ' + tr.o.name + '.'; } }
    else if (ref) { kind = ref.kindLabel || ''; title = ref.title || ''; text = ref.text || ''; }
    else if (file) { kind = fileTypeLabel(file.file.p) + ' file · ' + fmtBytes(file.file.s); title = t.item.name; text = file.file.p; }
    else if (t && t.type === 'project') { kind = t.item.retired ? 'Retired: no longer in use' : t.item.kindLabel + (t.item.demo ? ' · demo to try' : ''); title = t.item.name; text = t.item.tagline || ''; }
    else if (t) { kind = fileTypeLabel(t.item.path) + ' · ' + fmtBytes(t.item.size); title = t.item.name; text = t.district.target ? 'In ' + t.district.label + ' Select to go into the folder.' : t.item.path; }
    this.tip.textContent = '';
    const em = document.createElement('em'), b = document.createElement('b'), p = document.createElement('span');
    em.textContent = kind; b.textContent = title; p.textContent = text;
    this.tip.append(em, b, p);
    this.tip.classList.add('on');
    this._moveTip();
  }
  _moveTip() {
    const ev = this.lastEv;
    if (!ev) return;
    const w = this.tip.offsetWidth, x = ev.clientX + 16 + w > innerWidth - 8 ? ev.clientX - w - 14 : ev.clientX + 16;
    this.tip.style.left = Math.max(8, x) + 'px';
    this.tip.style.top = Math.max(8, ev.clientY + 16) + 'px';
  }
  _pick() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = [];
    this.batches.forEach((b) => meshes.push(b.mesh));
    this.pickables.forEach((m) => { if (m.visible && m.parent) meshes.push(m); });
    const hit = this.raycaster.intersectObjects(meshes, false)[0];
    if (!hit) { this._setHover(null); return; }
    const ref = hit.object.userData.ref;
    if (ref) {
      if (ref.type === 'flags') { const spot = ref.spots[hit.instanceId]; this._setHover({ tower: spot ? spot.t : null, ref: { type: 'flags', spot }, inst: hit.instanceId }); return; }
      if (ref.type === 'people' || ref.type === 'birds' || ref.type === 'boats') {
        const e = (ref.walkers || ref.flock || ref.trips)[hit.instanceId];
        this._setHover({ tower: e ? e.t : null, ref, inst: hit.instanceId });
        return;
      }
      this._setHover({ tower: ref.main || null, ref });
      return;
    }
    let batch = null;
    this.batches.forEach((b) => { if (b.mesh === hit.object) batch = b; });
    const t = batch && batch.towers[hit.instanceId];
    if (!t) { this._setHover(null); return; }
    this._setHover(t.main ? { tower: t.main, file: t } : { tower: t });
  }

  /* ================= loop ================= */
  _resize() {
    const r = this.host.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (w === this._w && h === this._h) return;
    this._w = w; this._h = h;
    this.renderer.setSize(w, h, false);
    this.labelRenderer.setSize(w, h);
    this.camera.aspect = w / h;
    this._applyInset();
    if (!this.userMoved && !this.walking) this.resetView(true);
  }
  _sync() {
    const want = this.onScreen && document.visibilityState === 'visible' && this.host.isConnected;
    if (want && !this.running) { this.running = true; this._last = performance.now(); this._loop(); }
    else if (!want) {
      this.running = false;
      this.tip.classList.remove('on');
      if (this.walking && !this.host.isConnected) this.exitWalk(true);
    }
  }
  _writeBatches(now) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
    this.batches.forEach((b) => {
      if (!b.dirty && !b.animating) return;
      let animating = false;
      for (let i = 0; i < b.n; i++) {
        const t = b.towers[i];
        if (!t) continue;
        const intro = clamp((now - (t.t0 != null ? t.t0 : t.district.t0)) / 1300, 0, 1);
        if (intro < 1) animating = true;
        const stg = clamp(intro * 1.8 - t.order * 0.5, 0, 1);
        const e = 1 - Math.pow(1 - stg, 4);
        p.set(t.x, this.baseY, t.z);
        sc.set(t.w, Math.max(0.03, t.h * e), t.dd);
        q.setFromAxisAngle(YAXIS, t.rot || 0);
        m.compose(p, q, sc);
        b.mesh.setMatrixAt(i, m);
        if (t.proj) t.proj.position.y = this.baseY + t.h * e;
      }
      b.mesh.count = b.n;
      b.mesh.instanceMatrix.needsUpdate = true;
      if (b.mesh.instanceColor) b.mesh.instanceColor.needsUpdate = true;
      b.mesh.boundingSphere = null;              /* picking tests against it: recompute once the buildings move */
      b.dirty = false; b.animating = animating;
    });
  }
  _loop() {
    if (!this.running) return;
    requestAnimationFrame(() => this._loop());
    const now = performance.now();
    const dt = Math.min(0.05, (now - (this._last || now)) / 1000);
    this.frame++;
    if (this.walking) this._stepWalk(dt);
    else if (this.flight) {
      const f = this.flight, t = Math.min(1, (now - f.t0) / f.ms), e = easeInOut(t);
      this.controls.target.lerpVectors(f.fromT, f.toT, e);
      this.camera.position.lerpVectors(f.fromP, f.toP, e);
      if (t >= 1) this.flight = null;
    } else if (!this.userMoved && !REDUCED.matches && !this.selected && !this.hoodSel) {
      const off = this.camera.position.clone().sub(this.controls.target);
      off.applyAxisAngle(YAXIS, 0.0002);
      this.camera.position.copy(this.controls.target).add(off);
    }
    this._last = now;
    if (!this.walking) {
      const tg = this.controls.target, lim = this.plate * 0.5, d = Math.hypot(tg.x, tg.z);
      if (d > lim) { tg.x *= lim / d; tg.z *= lim / d; }
      if (!this.ride) this.controls.update();
      /* the lowest view is street level: never under the ground or the sea */
      if (tg.y < 0) tg.y = 0;
      const floor = this.baseY + WALK_EYE;
      if (this.camera.position.y < floor) this.camera.position.y = floor;
    }
    if (this.wave) {
      const age = (now - this.wave.t0) / 900;
      this.wave.r = age;
      const rr = Math.min(1.35, age) * this.plate * 0.7;
      this.wavering.scale.set(Math.max(0.01, rr), Math.max(0.01, rr), 1);
      this.wavering.material.opacity = Math.max(0, 0.6 * (1 - age / 1.35));
      if (age > 1.5) { this.wave = null; this.wavering.material.opacity = 0; }
    }
    const waveR = this.wave ? this.wave.r : 99;
    for (let i = this.later.length - 1; i >= 0; i--) if (now >= this.later[i].at) { const j = this.later.splice(i, 1)[0]; j.fn(); }
    this._writeBatches(now);
    this._stepPulses(now);
    if (!REDUCED.matches) {
      this.uniforms.uTime.value = now / 1000;
      this.spinners.forEach((s) => { if (s.axis === 'z') s.o.rotation.z += s.v * dt; else s.o.rotation.y += s.v * dt; });
      this._stepMovers(now, dt);
    }
    this._stepCable(now);
    for (let i = this.anims.length - 1; i >= 0; i--) {
      const a = this.anims[i], k = clamp((now - a.t0) / 700, 0, 1);
      if (k <= 0) continue;
      const e = 1 - Math.pow(1 - k, 3) + Math.sin(k * Math.PI) * 0.08;
      a.o.scale.copy(a.o.userData.full).multiplyScalar(Math.max(0.001, e));
      if (k >= 1) { a.o.scale.copy(a.o.userData.full); this.anims.splice(i, 1); }
    }
    this.batches.forEach((b) => {
      let dirty = false;
      for (let i = 0; i < b.n; i++) {
        const t = b.towers[i];
        if (!t) continue;
        const target = t.litTarget * (waveR >= (t.delay || 0) ? 1 : 0);
        const next = t.lit + (target - t.lit) * 0.14;
        if (Math.abs(next - t.lit) > 0.0005) { t.lit = next; dirty = true; }
        b.lit[i] = t.lit;
      }
      if (dirty) b.litAttr.needsUpdate = true;
    });
    if (this.selected || this.tourRing) this.ring.material.opacity = 0.7 + Math.sin(now * 0.004) * 0.25;
    if (this.tour && !this.tour.paused && !this.flight && now - this.tour.t0 > 7000) this.tourStep(1);
    if (this.hasPointer && !this.flight && !this.walking && this.frame % 2 === 0) this._pick();
    else if (this.hover && this.hasPointer) this._moveTip();
    this._stepHolo(now, dt);
    this._updateLabels();
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
    if (this.holoObj.visible) this.holo.el.style.zIndex = '100000';
  }

  _clear() {
    if (this.tour || this.ride) { this.tour = null; this.ride = null; this.tourRing = false; this.controls.enabled = true; this.h.onTour(null); }
    this.gen++;
    this.jobs = [];
    this._propFiles = 0;
    this._clearLinks();
    this.batches.forEach((b) => { this.rig.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.dispose(); });
    this.batches.clear();
    if (this.ground) { this.rig.remove(this.ground); this.ground.geometry.dispose(); this.ground.material.dispose(); this.ground = null; }
    if (this.treeMesh) { this.rig.remove(this.treeMesh); this.treeMesh.dispose(); this.treeMesh = null; }
    this.props.traverse((o) => {
      if (!o.isMesh && !o.isLineSegments) return;
      if (o.geometry && !o.geometry.userData.keep) o.geometry.dispose();
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
        if (!m || m.userData.keep) return;
        if (m.map) m.map.dispose();
        if (m.bumpMap) m.bumpMap.dispose();
        m.dispose();
      });
    });
    this.rig.remove(this.props);
    this.props = new THREE.Group();
    this.rig.add(this.props);
    this.labels.forEach((o) => { this.rig.remove(o); if (o.element.parentNode) o.element.remove(); });
    this.districts = []; this.towers = []; this.labels = []; this.pickables = []; this.anims = []; this.spinners = []; this.later = []; this.movers = [];
    this.cable = null; this.siteObjs = null; this.siteRoutes = null;
    this.selected = null; this.hoodSel = null; this.hover = null; this._shown = null; this.wave = null;
    this.holo.t = null; this.holo.a = 0;
    this.ring.material.opacity = 0; this.wavering.material.opacity = 0;
    this.tip.classList.remove('on');
  }
}

/* Returns null when the browser cannot draw WebGL; the hub then points to the Map. */
export function mountCity(host, handlers) {
  try {
    const p = document.createElement('canvas');
    if (!(p.getContext('webgl2') || p.getContext('webgl'))) return null;
  } catch (e) { return null; }
  try { return new City(host, handlers); }
  catch (e) { console.warn('The city could not start:', e); return null; }
}
