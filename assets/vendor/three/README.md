# three.js r169 (vendored)

The hub's City view uses three.js. It is copied here, not loaded from a CDN, because the hub
holds a GitHub sign-in token and takes no third-party script it cannot pin exactly.

- `three.module.min.js`: three.js r169, MIT licence, Copyright 2010-2024 Three.js Authors.
- `addons/`: OrbitControls, PointerLockControls, CSS2DRenderer, RoomEnvironment,
  BufferGeometryUtils and SVGLoader from the same release (`examples/jsm/`). They import the
  bare name `three`, which the import map in `index.html` points at `three.module.min.js`.

Source: https://github.com/mrdoob/three.js/tree/r169. Do not edit these files; replace them
with a newer release as a set.
