/* ==========================================================================
   Repository hub: the City's props. Everything here is made from data the
   viewer's own GitHub access returns, so this public file holds no names:

     font column   a font file in a repo: a fluted marble column with the
                   font's own letters carved round the shaft
     statue        an SVG (a repo's SVG file, its hub/icon.svg, or a hub
                   icon): extruded into bronze and stood on a pillar
     flag          a platform the project works with, waving on its roof
     garden        tests: a hedged garden, a tree for each test file
     ruin          a retired (archived) project
     crane         a project marked "in progress" or "experimental"
     projector     a demo you can try: a glowing play sign on the roof
     lighthouse    a live site, on its own small island
     boat, cloud, bird, person, cable car: life around the city

   Each maker returns plain geometry or a mesh; hub-city.js places them.
   ========================================================================== */
import * as THREE from 'three';
import { mergeGeometries } from './vendor/three/addons/BufferGeometryUtils.js';
import { SVGLoader } from './vendor/three/addons/SVGLoader.js';

const box = (w, h, d, y = 0, x = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z);
const cyl = (rt, rb, h, seg, y = 0, x = 0, z = 0, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open).translate(x, y + h / 2, z);
const cone = (r, h, seg, y = 0, x = 0, z = 0) => new THREE.ConeGeometry(r, h, seg).translate(x, y + h / 2, z);

/* Give every part a vertex colour so one material draws a many-coloured prop. */
export function paint(geo, hex) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g.getAttribute('uv')) g.deleteAttribute('uv');
  const c = new THREE.Color(hex), n = g.getAttribute('position').count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
const merge = (parts) => { const g = mergeGeometries(parts, false); g.computeVertexNormals(); return g; };
export const propMaterial = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.04 });

/* ---------------- font columns ---------------- */
const MARBLE = '#ECE7DE';
/* The column without its shaft (plinth, base, capital), and the shaft alone, so the
   shaft can carry the carved letters. Both are 1 unit tall, 1 unit across. */
export function columnParts() {
  const rest = merge([
    paint(box(1.3, 0.07, 1.3, 0), 0xDDD6CA),
    paint(cyl(0.63, 0.67, 0.06, 32, 0.07), 0xE6E0D5),
    paint(cyl(0.6, 0.52, 0.05, 32, 0.91), 0xE6E0D5),
    paint(box(1.24, 0.05, 1.24, 0.95), 0xDDD6CA)
  ]);
  const shaft = new THREE.CylinderGeometry(0.5, 0.55, 0.78, 64, 6, true);
  const p = shaft.getAttribute('position');
  for (let i = 0; i < p.count; i++) {                        /* twenty flutes */
    const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 - 0.035 * (0.5 + 0.5 * Math.cos(a * 20));
    p.setXYZ(i, x * k, p.getY(i), z * k);
  }
  shaft.translate(0, 0.13 + 0.39, 0);
  shaft.computeVertexNormals();
  return { rest, shaft };
}
/* Marble with the font's own letters cut into it, spiralling down the shaft.
   The canvas wraps once round the column. Each line of text is sheared so that it
   drops exactly one line in one turn, which makes the lines a single continuous helix,
   and each turn carries on the text where the turn above left off. Two textures: the
   marble with darkened grooves, and a bump map in which the letters are low, so the
   light catches the edges of the cut. */
export function carvedTexture(fontCss, title, aspect) {
  const W = 512, H = Math.round(Math.min(1024, Math.max(256, W * aspect)));
  const size = 44, step = Math.round(size * 1.45), slope = step / W;
  const text = title + '   \u00b7   Aa Bb Cc Dd Ee Ff   \u00b7   0123456789   \u00b7   ';
  let seed = title.length * 7919 + 17;
  const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const canvas = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const helix = (g, paint) => {
    g.font = fontCss.replace('{size}', size + 'px');
    g.textBaseline = 'middle';
    const pw = Math.max(60, g.measureText(text).width);
    g.setTransform(1, slope, 0, 1, 0, 0);                  /* y' = y + slope * x: the line falls as it goes round */
    for (let k = -2; k * step < H + step; k++) {
      const y = k * step + step / 2;
      for (let x = -(((k * W) % pw) + pw) % pw; x < W; x += pw) paint(x, y);
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
  };
  const col = canvas(), g = col.getContext('2d');
  g.fillStyle = MARBLE; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(150,140,125,.16)'; g.lineWidth = 1.2;                /* faint veins */
  for (let i = 0; i < 6; i++) { g.beginPath(); let x = rnd() * W, y = rnd() * H; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (rnd() - 0.3) * 90; y += (rnd() - 0.5) * 50; g.lineTo(x, y); } g.stroke(); }
  helix(g, (x, y) => {
    g.fillStyle = 'rgba(60,52,42,.5)'; g.fillText(text, x - 1.2, y - 1.2);   /* shadow in the top of the cut */
    g.fillStyle = 'rgba(255,255,255,.8)'; g.fillText(text, x + 1.2, y + 1.2); /* light on the bottom edge */
    g.fillStyle = '#9A9284'; g.fillText(text, x, y);                         /* the floor of the groove */
  });
  const bump = canvas(), b = bump.getContext('2d');
  b.fillStyle = '#ffffff'; b.fillRect(0, 0, W, H);
  b.filter = 'blur(1.1px)';                                                   /* a soft bevel at the edges of the cut */
  helix(b, (x, y) => { b.fillStyle = '#000000'; b.fillText(text, x, y); });
  const map = new THREE.CanvasTexture(col), bm = new THREE.CanvasTexture(bump);
  map.colorSpace = THREE.SRGBColorSpace;
  [map, bm].forEach((t) => { t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4; });
  return { map, bump: bm };
}

/* ---------------- statues from SVG ---------------- */
/* A flat triangle mesh made solid: front, back and walls round the outline. */
function thicken(flat, depth) {
  const pos = flat.getAttribute('position'), out = [], edges = new Map();
  const k = (x, y) => x.toFixed(3) + ',' + y.toFixed(3);
  for (let t = 0; t + 2 < pos.count; t += 3) {
    const v = [0, 1, 2].map((j) => [pos.getX(t + j), pos.getY(t + j)]);
    out.push(v[0][0], v[0][1], depth, v[1][0], v[1][1], depth, v[2][0], v[2][1], depth);
    out.push(v[0][0], v[0][1], 0, v[2][0], v[2][1], 0, v[1][0], v[1][1], 0);
    [[0, 1], [1, 2], [2, 0]].forEach(([a, b]) => {
      const ka = k(v[a][0], v[a][1]), kb = k(v[b][0], v[b][1]), key = ka < kb ? ka + '|' + kb : kb + '|' + ka;
      if (edges.has(key)) edges.delete(key); else edges.set(key, [v[a], v[b]]);
    });
  }
  edges.forEach(([p, q]) => out.push(p[0], p[1], 0, q[0], q[1], 0, q[0], q[1], depth, p[0], p[1], 0, q[0], q[1], depth, p[0], p[1], depth));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  return g;
}
/* Any SVG (filled shapes or stroked lines) as a solid, 1 unit tall, standing on y = 0. */
export function svgGeometry(svgText, depthRatio = 0.16) {
  let data;
  let src = String(svgText).replace(/currentColor/g, '#000');
  if (!/xmlns=/.test(src)) src = src.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  try { data = new SVGLoader().parse(src); } catch (e) { return null; }
  const parts = [];
  let vb = 24;
  const m = /viewBox="[\d.\s-]+?\s([\d.]+)\s([\d.]+)"/.exec(svgText);
  if (m) vb = Math.max(+m[1], +m[2]) || 24;
  const depth = vb * depthRatio;
  data.paths.forEach((path) => {
    const st = path.userData && path.userData.style || {};
    const filled = st.fill && st.fill !== 'none' && st.fill !== 'transparent';
    if (filled) SVGLoader.createShapes(path).forEach((sh) => {
      const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 8 });
      parts.push(g.index ? g.toNonIndexed() : g);
    });
    if (st.stroke && st.stroke !== 'none') path.subPaths.forEach((sp) => {
      const pts = sp.getPoints(12);
      if (pts.length < 2) return;
      const flat = SVGLoader.pointsToStroke(pts, st);
      if (flat) parts.push(thicken(flat, depth));
    });
  });
  if (!parts.length) return null;
  const clean = parts.map((g) => { const n = new THREE.BufferGeometry(); n.setAttribute('position', g.getAttribute('position')); return n; });
  const g = mergeGeometries(clean, false);
  if (!g) return null;
  g.scale(1, -1, 1);                                   /* SVG y runs down */
  g.computeBoundingBox();
  const bb = g.boundingBox, h = Math.max(bb.max.y - bb.min.y, 1e-3);
  g.translate(-(bb.max.x + bb.min.x) / 2, -bb.min.y, -(bb.max.z + bb.min.z) / 2);
  g.scale(1 / h, 1 / h, 1 / h);
  g.computeVertexNormals();
  return g;
}
export const bronze = () => new THREE.MeshStandardMaterial({ color: 0xB0834F, metalness: 0.62, roughness: 0.36, side: THREE.DoubleSide, flatShading: true });
/* A stone pillar for a statue: 1 unit tall, 1 across. */
export function plinthGeometry() {
  return merge([
    paint(box(1, 0.1, 1, 0), 0xCFC8BC), paint(box(0.78, 0.78, 0.78, 0.1), 0xE4DED3),
    paint(box(0.9, 0.06, 0.9, 0.88), 0xCFC8BC), paint(box(0.84, 0.06, 0.84, 0.94), 0xD8D1C5)
  ]);
}

/* ---------------- flags (platforms) ---------------- */
/* One instanced flag cloth; the wave runs in the vertex shader from uTime. */
export function flagMaterial(uniforms) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, side: THREE.DoubleSide });
  mat.onBeforeCompile = (s) => {
    s.uniforms.uTime = uniforms.uTime;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float ph = float(gl_InstanceID) * 1.7;
        transformed.z += sin(position.x * 5.0 - uTime * 4.2 + ph) * 0.13 * position.x;
        transformed.y += sin(position.x * 3.0 - uTime * 3.1 + ph) * 0.04 * position.x;`);
  };
  return mat;
}
export function flagGeometry() { return new THREE.PlaneGeometry(1, 0.62, 10, 1).translate(0.5, 0, 0); }

/* ---------------- ruins (retired projects) ---------------- */
export function ruinGeometry(seed = 1) {
  let s = seed;
  const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  const parts = [paint(box(1, 0.06, 1, 0), 0xB8B1A5)];
  [[-0.32, -0.32], [0.32, -0.32], [-0.32, 0.32], [0.32, 0.32], [0, -0.32]].forEach(([x, z], i) => {
    const h = 0.25 + r() * 0.75;
    if (i === 4 && r() < 0.5) return;
    parts.push(paint(cyl(0.07, 0.08, h, 8, 0.06, x, z), 0xC9C2B6));
    if (h > 0.6) parts.push(paint(box(0.2, 0.05, 0.2, 0.06 + h, x, z), 0xBDB6AA));
  });
  parts.push(paint(box(0.7, 0.32, 0.08, 0.06, 0, 0.38).rotateY(0.04), 0xADA699));          /* a broken wall */
  for (let i = 0; i < 7; i++) parts.push(paint(box(0.09, 0.06, 0.07, 0.06, (r() - 0.5) * 0.9, (r() - 0.5) * 0.9).rotateY(r() * 3), 0xA49D90));
  for (let i = 0; i < 6; i++) parts.push(paint(box(0.12, 0.1, 0.03, 0.06 + r() * 0.25, (r() - 0.5) * 0.66, 0.42), 0x5E9E5A));   /* ivy */
  const g = merge(parts);
  g.computeBoundingBox(); const bb = g.boundingBox;
  g.scale(1, 1 / Math.max(bb.max.y, 1e-3), 1);
  return g;
}

/* ---------------- crane (in progress) ---------------- */
export function crane() {
  const grp = new THREE.Group();
  const mat = propMaterial();
  const mast = new THREE.Mesh(merge([paint(box(0.5, 0.25, 0.5, 0), 0x6B7280), paint(box(0.32, 14, 0.32, 0.25), 0xFFC20E), paint(box(0.5, 0.6, 0.5, 14.25), 0x3D3D3D)]), mat);
  const jib = new THREE.Group(); jib.position.y = 14.6;
  jib.add(new THREE.Mesh(merge([
    paint(box(11, 0.28, 0.28, 0, 4.2, 0), 0xFFC20E), paint(box(3.2, 0.28, 0.28, 0, -2.4, 0), 0xFFC20E),
    paint(box(1, 0.8, 0.7, -0.6, -3.4, 0), 0x6B7280), paint(cone(0.12, 2.2, 4, 0.2, 0, 0), 0xFFC20E),
    paint(box(0.04, 5, 0.04, -5, 8.5, 0), 0x3D3D3D), paint(box(0.4, 0.4, 0.4, -5.3, 8.5, 0), 0xC0392B)
  ]), mat));
  grp.add(mast, jib);
  grp.userData.jib = jib;
  grp.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  return grp;
}

/* ---------------- demo projector ---------------- */
/* A glowing ring and a play sign that turns slowly above a demo building. */
export function projector() {
  const grp = new THREE.Group();
  const glow = new THREE.MeshBasicMaterial({ color: 0x27AAE1, transparent: true, opacity: 0.9 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.07, 8, 32), glow);
  ring.rotation.x = Math.PI / 2;
  const base = new THREE.Mesh(merge([paint(cyl(0.5, 0.62, 0.14, 24, 0), 0x2D3A46), paint(cyl(0.34, 0.34, 0.05, 24, 0.14), 0x8FD3F0)]), propMaterial());
  const tri = new THREE.Shape(); tri.moveTo(-0.32, -0.38); tri.lineTo(0.42, 0); tri.lineTo(-0.32, 0.38); tri.closePath();
  const play = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.12, bevelEnabled: false }).translate(0, 0, -0.06),
    new THREE.MeshStandardMaterial({ color: 0x27AAE1, emissive: 0x27AAE1, emissiveIntensity: 0.9, roughness: 0.3 }));
  play.position.y = 1.0;
  ring.position.y = 0.2;
  grp.add(base, ring, play);
  grp.userData = { play, ring };
  return grp;
}
/* The beam that carries a hologram up out of a demo building: 1 unit tall, opens upwards. */
export function holoBeam() {
  const g = new THREE.CylinderGeometry(1, 0.18, 1, 32, 1, true).translate(0, 0.5, 0);
  const n = g.getAttribute('position').count, a = new Float32Array(n);
  for (let i = 0; i < n; i++) a[i] = g.getAttribute('position').getY(i);
  g.setAttribute('aY', new THREE.BufferAttribute(a, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uAlpha: { value: 0 } },
    vertexShader: 'attribute float aY; varying float vY; varying vec2 vUv; void main(){ vY = aY; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float uTime; uniform float uAlpha; varying float vY; varying vec2 vUv; void main(){ float lines = 0.55 + 0.45 * step(0.5, fract(vY * 18.0 - uTime * 1.6)); float a = (0.42 - vY * 0.3) * lines * uAlpha; gl_FragColor = vec4(0.15, 0.67, 0.88, a); }'
  });
  return new THREE.Mesh(g, mat);
}

/* ---------------- gardens (tests) ---------------- */
export function hedgeGeometry(poly, y) {
  const parts = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 0.3) continue;
    const g = new THREE.BoxGeometry(len, 0.55, 0.42);
    g.rotateY(-Math.atan2(b[1] - a[1], b[0] - a[0]));
    g.translate((a[0] + b[0]) / 2, y + 0.275, (a[1] + b[1]) / 2);
    parts.push(paint(g, 0x3F8F55));
  }
  return parts.length ? merge(parts) : null;
}

/* ---------------- islands, lighthouses, boats ---------------- */
export function lighthouse() {
  const parts = [paint(cyl(1.5, 1.7, 0.6, 16, 0), 0xC9C2B6)];
  for (let i = 0; i < 5; i++) parts.push(paint(cyl(0.95 - (i + 1) * 0.08, 0.95 - i * 0.08, 1.2, 16, 0.6 + i * 1.2), i % 2 ? 0xC0392B : 0xFFFFFF));
  parts.push(paint(cyl(0.75, 0.75, 0.12, 16, 6.6), 0x3D3D3D), paint(cone(0.72, 0.8, 16, 7.62), 0xC0392B));
  /* the lamp room is separate, so it can light up */
  const body = new THREE.Mesh(merge(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }));
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.9, 16).translate(0, 7.17, 0),
    new THREE.MeshStandardMaterial({ color: 0xFFF2C4, emissive: 0xFFC20E, emissiveIntensity: 0.25, roughness: 0.3 }));
  const g = new THREE.Group(); g.add(body, lamp); body.castShadow = true;
  g.userData.lamp = lamp;
  return g;
}
export function boatGeometry() {
  const hull = new THREE.Shape(); hull.moveTo(-1.1, -0.45); hull.lineTo(0.8, -0.45); hull.lineTo(1.3, 0); hull.lineTo(0.8, 0.45); hull.lineTo(-1.1, 0.45); hull.closePath();
  const h = new THREE.ExtrudeGeometry(hull, { depth: 0.45, bevelEnabled: false }); h.rotateX(-Math.PI / 2);
  return merge([paint(h, 0xFFFFFF), paint(box(0.8, 0.45, 0.6, 0.45, -0.2, 0), 0x0074B4), paint(box(0.05, 1.3, 0.05, 0.45, 0.35, 0), 0x3D3D3D)]);
}

/* ---------------- sky and streets ---------------- */
export function cloudGeometry(seed) {
  let s = seed;
  const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  const parts = [];
  for (let i = 0; i < 6; i++) {
    const g = new THREE.IcosahedronGeometry(2.4 + r() * 2.6, 1);
    g.scale(1, 0.55, 0.8);
    g.translate((r() - 0.5) * 9, r() * 1.2, (r() - 0.5) * 4);
    parts.push(paint(g, 0xFFFFFF));
  }
  return merge(parts);
}
export function birdGeometry() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.3, -1, 0.35, -0.1, 0, 0, -0.2, 0, 0, 0.3, 0, 0, -0.2, 1, 0.35, -0.1], 3));
  g.computeVertexNormals();
  return g;
}
export function personGeometry() {
  return merge([paint(cyl(0.16, 0.2, 0.62, 8, 0), 0xffffff), paint(new THREE.SphereGeometry(0.15, 8, 6).translate(0, 0.78, 0), 0xF2D3B3)]);
}

/* ---------------- billboard (a project's own picture) ---------------- */
export function billboard(texture, w = 8, h = 5) {
  const grp = new THREE.Group();
  const frame = new THREE.Mesh(merge([
    paint(box(0.25, 4, 0.25, 0, -w * 0.35, 0), 0x3D3D3D), paint(box(0.25, 4, 0.25, 0, w * 0.35, 0), 0x3D3D3D),
    paint(box(w + 0.4, h + 0.4, 0.2, 3.6, 0, -0.12), 0x2D3A46)
  ]), propMaterial());
  frame.castShadow = true;
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
  pic.position.set(0, 3.8 + h / 2, 0.0);
  grp.add(frame, pic);
  return grp;
}

/* ---------------- the learner's cable car ---------------- */
export function cableCar() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(merge([
    paint(box(0.06, 1.4, 0.06, 0.9), 0x3D3D3D), paint(box(1.6, 1.1, 1.1, -0.2), 0xFFC20E),
    paint(box(1.64, 0.4, 1.14, 0.25), 0xBFE6F5), paint(box(1.7, 0.1, 1.2, 0.9), 0x3D3D3D)
  ]), propMaterial());
  /* the learner, in a mortarboard */
  const learner = new THREE.Mesh(merge([
    paint(cyl(0.16, 0.2, 0.42, 8, 0.0), 0x0074B4), paint(new THREE.SphereGeometry(0.15, 8, 6).translate(0, 0.56, 0), 0xF2D3B3),
    paint(box(0.42, 0.04, 0.42, 0.7), 0x3D3D3D), paint(box(0.04, 0.12, 0.04, 0.58, 0.18, 0.18), 0xFFC20E)
  ]), propMaterial());
  learner.position.set(0, 0.0, 0);
  g.add(body, learner);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/* ---------------- carved stones (a project's pictures) ---------------- */
/* A picture traced into stone: its outlines (a Sobel edge pass) become grooves, and a
   faint wash of the picture's light and shade stays in the surface. */
export async function engraveImage(blob) {
  const bmp = await createImageBitmap(blob);
  const W = 384, H = Math.max(120, Math.min(384, Math.round(W * bmp.height / Math.max(1, bmp.width))));
  const src = document.createElement('canvas'); src.width = W; src.height = H;
  const sg = src.getContext('2d'); sg.drawImage(bmp, 0, 0, W, H);
  if (bmp.close) bmp.close();
  const d = sg.getImageData(0, 0, W, H).data, L = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) L[i] = (d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114) / 255 * (d[i * 4 + 3] / 255) + (1 - d[i * 4 + 3] / 255);
  const E = new Float32Array(W * H), at = (x, y) => L[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))];
  const vals = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const gx = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1);
    const gy = at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1);
    const m = Math.hypot(gx, gy); E[y * W + x] = m; if ((x + y) % 7 === 0) vals.push(m);
  }
  vals.sort((a, b) => a - b);
  const hi = Math.max(0.05, vals[Math.floor(vals.length * 0.96)] || 1);
  const col = document.createElement('canvas'), bmpC = document.createElement('canvas');
  col.width = bmpC.width = W; col.height = bmpC.height = H;
  const cg = col.getContext('2d'), bg = bmpC.getContext('2d');
  const ci = cg.createImageData(W, H), bi = bg.createImageData(W, H);
  let seed = 4099;
  const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < W * H; i++) {
    const e = Math.min(1, E[i] / hi), groove = e > 0.28 ? Math.min(1, (e - 0.28) / 0.5) : 0;
    const grain = (rnd() - 0.5) * 14, shade = 0.9 + 0.1 * L[i];
    const r = (200 + grain) * shade * (1 - groove * 0.5), g = (192 + grain) * shade * (1 - groove * 0.5), b = (178 + grain) * shade * (1 - groove * 0.48);
    ci.data[i * 4] = r; ci.data[i * 4 + 1] = g; ci.data[i * 4 + 2] = b; ci.data[i * 4 + 3] = 255;
    const h = 255 * (1 - groove * 0.9);
    bi.data[i * 4] = bi.data[i * 4 + 1] = bi.data[i * 4 + 2] = h; bi.data[i * 4 + 3] = 255;
  }
  cg.putImageData(ci, 0, 0); bg.putImageData(bi, 0, 0);
  const map = new THREE.CanvasTexture(col), bump = new THREE.CanvasTexture(bmpC);
  map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = bump.anisotropy = 4;
  return { map, bump, aspect: W / H };
}
/* A standing stone with a carved face, leaning back a little. About 2.4 units tall. */
export function carvedStone(tex) {
  const grp = new THREE.Group();
  const h = 2.2, w = Math.max(1.5, Math.min(3.8, h * tex.aspect));
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xC2B9A9, roughness: 0.92 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.25, 0.9).translate(0, 0.125, 0), stoneMat);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.28).translate(0, h / 2, 0), stoneMat);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.92, h * 0.9).translate(0, h / 2, 0.142),
    new THREE.MeshStandardMaterial({ map: tex.map, bumpMap: tex.bump, bumpScale: 3, roughness: 0.95 }));
  const lean = new THREE.Group(); lean.position.y = 0.25; lean.rotation.x = -0.1;
  lean.add(slab, face);
  grp.add(base, lean);
  grp.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return grp;
}
