// The WebGL stage: renderer, settings (morning desk -> cream studio -> raking macro),
// the model, lights, composer (DOF, faint bloom, tone map, dither).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { clamp, lerp } from './engine.js';

const _c = new THREE.Color();
const PARTS = ['Board', 'LedgePlate_Table', 'LedgePlate_Wall', 'Peg', 'SheetTop', 'SheetStack', 'HangPlate'];

// Settings, blended by the scene float: 0 morning desk (projected key image), 1 lit cream
// cyclorama, 2 raking macro with deep falloff. Values were matched by eye to calendar-refs/keyart.
const SET = [
  // 0 the owner's table: studio light with a gentle warmth, the sun from the photo's window (upper right) for the
  // shadow on the table; the sweep's colours already so nothing dark ever shows as the photo fades
  { top: 0xd6d4d1, bot: 0xece6dc, env: 1.03, sun: 2.75, key: 0, rake: 0, hemi: 0.0, back: 0.25, room: 0, pool: 0, vig: 0, grain: 0.012, floor: 0.3, bloom: 0, nrm: 1, blob: 0.3 },
  // 1 studio: matched to calendar-refs/lookdev/ref-*.png (one rig, measured): sweep #ece6dc -> #d6d4d1
  { top: 0xd6d4d1, bot: 0xece6dc, env: 1.0, sun: 0, key: 2.15, rake: 0, hemi: 0.0, back: 0.5, room: 0, pool: 0, vig: 0, grain: 0.012, floor: 0.34, bloom: 0, nrm: 1, blob: 0.42 },
  // 2 macro: the dark sweep, a hard raking key so burn and grain have relief
  { top: 0x3b3632, bot: 0x5a524b, env: 0.1, sun: 0, key: 0.08, rake: 1.45, hemi: 0.0, back: 0.1, room: 0, pool: 0, vig: 0.12, grain: 0.012, floor: 0.3, bloom: 0, nrm: 1.4, blob: 0.25 },
];
// afternoon on the desk (chapters 4-5): the desk setting's warm sun, lower and more golden, with a
// little studio fill so the paper reads; blended over the scene float by a second weight
const AFT = { top: 0xd6d4d1, bot: 0xece6dc, env: 1.0, sun: 0, key: 2.15, rake: 0, hemi: 0.0, back: 0.5, room: 0, pool: 0, vig: 0, grain: 0.012, floor: 0.34, bloom: 0, nrm: 1, blob: 0.42 };   // the calm sweep too (owner review: no brown fields)
const SUN0 = new THREE.Vector3(2.0, 1.35, 0.55), SUN_AFT = new THREE.Vector3(-2.35, 0.78, 1.55);
const SUNC0 = new THREE.Color(0xfff8f4), SUNC_AFT = new THREE.Color(0xffd4aa);
// dusk (chapters 6-7): the same desk light carried on toward evening: low, deep orange sun, the room cooling
const DUSK = { top: 0x352730, bot: 0x6a4a3c, env: 0.36, sun: 2.6, key: 0.8, rake: 0, hemi: 0.24, back: 0.42, room: 0, pool: 0.22, vig: 0.4, grain: 0.03, floor: 0.34, bloom: 0.09, nrm: 0.42, blob: 0.24 };
const SUN_DUSK = new THREE.Vector3(-2.45, 0.42, 1.75), SUNC_DUSK = new THREE.Color(0xff9a5e);
const _t1 = new THREE.Color(), _t2 = new THREE.Color();

// window light: a large, blurred pane shadow with leaves moving in it, on the sweep only (never the paper)
const GOBO = `uniform float uGobo, uGoboT, uGoboS; uniform sampler2D uTree;
  float gh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float gn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(gh(i), gh(i + vec2(1, 0)), f.x), mix(gh(i + vec2(0, 1)), gh(i + vec2(1, 1)), f.x), f.y); }
  float gobo(vec2 p){
    p += vec2(uGoboS * 0.5, 0.0);
    // the window: 4 columns x 5 rows of panes inside one frame (about 2.5 x 3 units), soft-edged muntins
    vec2 w = (p - vec2(-1.3, -0.2)) / vec2(2.5, 3.0);                  // 0..1 across the window
    float win = smoothstep(-0.02, 0.03, w.x) * smoothstep(1.02, 0.97, w.x) * smoothstep(-0.02, 0.03, w.y) * smoothstep(1.02, 0.97, w.y);
    vec2 c = fract(w * vec2(4.0, 5.0)) - 0.5;
    float pane = smoothstep(0.5, 0.40, abs(c.x)) * smoothstep(0.5, 0.40, abs(c.y));
    // the tree outside: branches sway slowly about the trunk (low in the texture), leaves flutter faster, irregular
    vec2 tq = w * vec2(1.0, 0.9) + vec2(0.05, 0.08);
    float h = clamp(tq.y, 0.0, 1.0);
    float sway = (sin(uGoboT * 0.37) * 0.6 + sin(uGoboT * 0.61 + 1.7) * 0.4) * 0.018 * h * h;
    vec2 fl = vec2(gn(tq * 9.0 + uGoboT * 0.9), gn(tq * 9.0 - uGoboT * 0.8 + 3.1)) - 0.5;
    float tree = texture2D(uTree, tq + vec2(sway, sway * 0.3) + fl * 0.006 * h).r;
    float light = pane * win * (1.0 - tree * 0.82);
    return 1.0 + uGobo * (0.12 * light - 0.045);
  }`;

// the tree whose shadow falls through the window: drawn once (deterministic), branches and leaf clusters
function treeTexture() {
  const N = 1024, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d');
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g.fillStyle = '#000'; g.fillRect(0, 0, N, N);
  g.strokeStyle = g.fillStyle = '#fff'; g.lineCap = 'round';
  const leaves = [];
  const branch = (x, y, a, len, w, d) => {
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    g.lineWidth = w; g.beginPath(); g.moveTo(x, y);
    g.quadraticCurveTo((x + x2) / 2 + (rnd() - 0.5) * len * 0.3, (y + y2) / 2 + (rnd() - 0.5) * len * 0.3, x2, y2); g.stroke();
    if (d > 6 || len < 14) { leaves.push([x2, y2]); return; }
    const n = d < 2 ? 2 : 2 + (rnd() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) branch(x2, y2, a + (rnd() - 0.5) * 1.3 + (i - (n - 1) / 2) * 0.45, len * (0.68 + rnd() * 0.12), w * 0.66, d + 1);
    if (d > 2) leaves.push([x2, y2]);
  };
  // canvas y grows downward; the trunk enters from the lower left, the crown spreads up and right
  branch(N * 0.2, N * 1.05, -1.2, N * 0.3, 34, 0);
  branch(N * 0.02, N * 0.7, -0.45, N * 0.24, 18, 1);
  branch(N * 0.98, N * 0.2, 2.6, N * 0.22, 16, 2);
  for (const [x, y] of leaves) for (let k = 0; k < 14; k++) {
    const r = 7 + rnd() * 12, ox = (rnd() - 0.5) * 70, oy = (rnd() - 0.5) * 60, rot = rnd() * Math.PI;
    g.beginPath(); g.ellipse(x + ox, y + oy, r * 1.7, r, rot, 0, Math.PI * 2); g.fill();
  }
  g.filter = 'blur(3px)'; g.drawImage(c, 0, 0); g.filter = 'none';
  const t = new THREE.CanvasTexture(c); t.flipY = true; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.generateMipmaps = true;
  return t;
}

// final pass: vignette, fine grain and dither (no banding on the cream)
const FinishShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVig: { value: 0.3 }, uGrain: { value: 0.03 }, uAspect: { value: 1.6 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uVig, uGrain, uAspect; varying vec2 vUv;
    float h(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
    void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb;
      vec2 d = (vUv - 0.5) * vec2(uAspect, 1.0) / max(uAspect, 1.0);
      c *= 1.0 - uVig * smoothstep(0.25, 0.95, length(d) * 1.35);
      float g = h(gl_FragCoord.xy + fract(uTime * 7.13) * 97.0) - 0.5;
      c += g * uGrain * (0.35 + 0.65 * (1.0 - c));
      float n = h(gl_FragCoord.xy * 1.37 + 7.0) + h(gl_FragCoord.xy + 3.1) - 1.0;
      gl_FragColor = vec4(c + n / 255.0, 1.0); }`,
};

// soft diagonal venetian-blind stripes for the sun's gobo
function blindsGobo() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 512, 512);
  g.save(); g.translate(256, 256); g.rotate(-0.42); g.translate(-400, -400);
  g.filter = 'blur(1.6px)'; g.fillStyle = '#fff';
  for (let y = 0; y < 800; y += 15) g.fillRect(0, y, 800, 8.5);
  g.restore();
  const v = g.createRadialGradient(256, 256, 120, 256, 256, 256);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = v; g.fillRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function radialTex(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, inner, 128, 128, outer);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

// classic camera projection: the key image painted onto proxy geometry from a fixed projector
// Shared uniforms: projector, the desk->studio wipe (a band of sunlight sweeping right to left).
const PROJ = { projVP: { value: new THREE.Matrix4() }, wipe: { value: 0 }, res: { value: new THREE.Vector2(1, 1) } };
function projectedMaterial(map, mask) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: map }, mask: { value: mask || null }, useMask: { value: mask ? 1 : 0 }, ...PROJ },
    vertexShader: `uniform mat4 projVP; varying vec4 vP;
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vP = projVP * w; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D map, mask; uniform float useMask, wipe; uniform vec2 res; varying vec4 vP;
      void main(){ vec2 uv = clamp(vP.xy / vP.w * 0.5 + 0.5, 0.001, 0.999);
        float a = useMask > 0.5 ? texture2D(mask, uv).r : 1.0;
        if (useMask > 0.5 && (vP.w < 0.0 || any(greaterThan(abs(vP.xy / vP.w), vec2(1.0))))) a = 0.0;
        vec2 su = gl_FragCoord.xy / res;
        float p = 0.78 * su.x + 0.22 * (1.0 - su.y);
        float e = 1.0 - wipe * 1.2 + 0.05;
        float keep = 1.0 - smoothstep(e - 0.06, e + 0.06, p);
        float glow = wipe > 0.001 && wipe < 0.999 ? exp(-pow((p - e) / 0.05, 2.0)) : 0.0;
        vec3 c = texture2D(map, uv).rgb + vec3(1.0, 0.78, 0.5) * glow * 0.55;
        if (a * keep < 0.01) discard;
        gl_FragColor = vec4(c, a * keep); }`,
    transparent: true, depthWrite: true,
  });
}

export class Stage {
  constructor(canvas, opts) {
    this.opts = opts; // { phone, reduced }
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 1.0;   // set per setting in setScene (measured against the Cycles references)
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.VSMShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(20, 1, 0.02, 40);
    this.parts = {};
    this.rest = {};
    this.viewShift = { x: 0, y: 0 };
    this.size = { w: 1, h: 1 };
    this._buildRoom();
  }

  _buildRoom() {
    const s = this.scene;
    // the studio's own light, rendered in Cycles from the board (calendar-refs/lookdev/lookdev.py): sweep, fill
    // and rim; the key is a real light here. It turns with the camera, as the key does (envTurn).
    this.envAz0 = 0.8334533097812089;
    new RGBELoader().load('assets/3d/look/studio-env.hdr', (t) => {
      t.mapping = THREE.EquirectangularReflectionMapping;
      const pm = new THREE.PMREMGenerator(this.renderer);
      s.environment = pm.fromEquirectangular(t).texture; pm.dispose(); t.dispose();
    });

    // backdrop: a sphere with a vertical gradient (the cyclorama's falloff), blended per setting
    this.goboU = { uGobo: { value: 0 }, uGoboT: { value: 0 }, uGoboS: { value: 0 }, uTree: { value: treeTexture() } };
    // the handover: the studio colour blooms outward from the board (screen px, from the bottom), soft edged
    this.revealU = { uRevC: { value: new THREE.Vector2() }, uRevR: { value: 1e5 }, uRevS: { value: 1 } };
    this.bgMat = new THREE.ShaderMaterial({
      uniforms: { top: { value: new THREE.Color(SET[0].top) }, bot: { value: new THREE.Color(SET[0].bot) }, alpha: { value: 1 }, ...this.goboU, ...this.revealU },
      vertexShader: 'varying vec3 vW; void main(){ vW = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: GOBO + `
        uniform vec3 top, bot; uniform float alpha; uniform vec2 uRevC; uniform float uRevR, uRevS; varying vec3 vW;
        void main(){ vec3 c = mix(bot, top, smoothstep(0.0, 0.5, vW.y));
          // on the backdrop: the window falls behind the board (direction space, fixed in the room)
          vec2 gp = vec2(atan(vW.x, -vW.z) * 1.6 + 0.9, (vW.y + 0.08) * 3.2);
          c *= gobo(gp);
          float rev = 1.0 - smoothstep(uRevR - uRevS, uRevR + uRevS, length(gl_FragCoord.xy - uRevC));
          gl_FragColor = vec4(c, alpha * rev); }`,
      side: THREE.BackSide, depthWrite: false, transparent: true, toneMapped: false,
    });
    const bgSphere = new THREE.Mesh(new THREE.SphereGeometry(18, 48, 24), this.bgMat);
    bgSphere.renderOrder = -2;   // always first: it used to sort after the floor and cover it (the floor never showed)
    s.add(bgSphere);

    // studio floor: the gradient's bottom colour, a soft pool of light under the board, real shadows
    this.floorCol = new THREE.Mesh(new THREE.CircleGeometry(9, 64), this.floorColMat = new THREE.MeshBasicMaterial({ color: SET[1].bot, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    this.floorCol.rotation.x = -Math.PI / 2; this.floorCol.position.y = -0.002;
    this.floorCol.renderOrder = -1;
    // and on the floor: the same window, thrown down behind and left of the board
    this.floorColMat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.goboU, this.revealU);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vGw;').replace('#include <project_vertex>', '#include <project_vertex>\nvGw = (modelMatrix * vec4(position, 1.0)).xyz;');
      sh.fragmentShader = GOBO + sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vGw;')
        .replace('#include <common>', '#include <common>\nuniform vec2 uRevC; uniform float uRevR, uRevS;')
        .replace('#include <opaque_fragment>', 'outgoingLight *= gobo(vec2(vGw.x * 1.3 + 1.2, -vGw.z * 1.5 - 0.2));\n diffuseColor.a *= 1.0 - smoothstep(uRevR - uRevS, uRevR + uRevS, length(gl_FragCoord.xy - uRevC));\n#include <opaque_fragment>');
    };
    s.add(this.floorCol);
    this.pool = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.15), this.poolMat = new THREE.MeshBasicMaterial({ map: radialTex(10, 128), color: 0xfff3e2, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.pool.rotation.x = -Math.PI / 2; this.pool.position.set(0.05, -0.001, -0.05);
    s.add(this.pool);
    this.floorMat = new THREE.ShadowMaterial({ opacity: 0.3, color: 0x2a1808, depthWrite: false });
    this.floorMat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vFw;').replace('#include <project_vertex>', '#include <project_vertex>\nvFw = (modelMatrix * vec4(position, 1.0)).xz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vFw;').replace('#include <fog_fragment>', 'gl_FragColor.a *= 1.0 - smoothstep(0.45, 1.05, length(vFw - vec2(0.15, -0.1)));\n#include <fog_fragment>');
    };
    this.aoMat = new THREE.ShaderMaterial({
      uniforms: { map: { value: new THREE.TextureLoader().load('assets/3d/look/floor-ao.webp') }, map2: { value: new THREE.TextureLoader().load('assets/3d/look/floor-ao-parts.webp') }, apart: { value: 0 }, amt: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      // two Cycles bakes: board at rest, parts pulled apart; blended by the pull-apart progress
      fragmentShader: 'uniform sampler2D map, map2; uniform float amt, apart; varying vec2 vUv; void main(){ float a = mix(pow(texture2D(map, vUv).r, 3.2), mix(1.0, pow(texture2D(map2, vUv).r, 1.5), 0.6), apart); vec2 e = smoothstep(0.0, 0.08, vUv) * smoothstep(1.0, 0.92, vUv); gl_FragColor = vec4(vec3(mix(1.0, a, amt * e.x * e.y)), 1.0); }',
      transparent: true, depthWrite: false, blending: THREE.MultiplyBlending, premultipliedAlpha: true, toneMapped: false,
    });
    this.ao = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), this.aoMat);
    this.ao.rotation.x = -Math.PI / 2; this.ao.position.y = 0.0002; this.ao.renderOrder = 1;
    s.add(this.ao);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), this.floorMat);
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.0004; floor.receiveShadow = true;
    s.add(floor);

    // the owner's desk photo, drawn by WebGL behind the board so the live board can take the place
    // of the calendar baked into it. Screen-space quad at the far plane; rect/cover come from intro.js.
    const tl = new THREE.TextureLoader();
    const ph = tl.load(this.opts.phone ? 'assets/3d/figma/hero/background-1000.webp' : 'assets/3d/figma/hero/background.webp');   // the owner's hero background (Figma 64:716)
    ph.colorSpace = THREE.SRGBColorSpace;
    ph.generateMipmaps = true; ph.minFilter = THREE.LinearMipmapLinearFilter;
    this.plateU = { pblur: { value: 0 }, pdusk: { value: 0 }, map: { value: ph }, rect: { value: new THREE.Vector4(0, 0, 1, 1) }, cover: { value: new THREE.Vector4(0, 0, 1, 1) }, opacity: { value: 1 }, dim: { value: 0 }, hole: { value: new THREE.Vector4(0, 0, 0, 0) }, holeAmt: { value: 0 } };
    this.plate = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      uniforms: this.plateU,
      vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.99995, 1.0); }',
      fragmentShader: `uniform sampler2D map; uniform vec4 rect, cover, hole; uniform float opacity, holeAmt, pblur, pdusk;
        void main(){ vec2 p = vec2(gl_FragCoord.x, rect.w * 0.0 + gl_FragCoord.y);
          // rect/cover: x, y (from top), w, h in device px; y flipped here
          float H = cover.w; // unused
          vec2 uv = (vec2(p.x, RES_Y - p.y) - rect.xy) / rect.zw;
          vec3 c;
          if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) {
            vec2 cu = (vec2(p.x, RES_Y - p.y) - cover.xy) / cover.zw;
            c = texture2D(map, vec2(cu.x, 1.0 - cu.y), 5.0 + pblur * 2.0).rgb * 0.55;
          } else {
            c = texture2D(map, vec2(uv.x, 1.0 - uv.y), pblur * 4.0).rgb;   // softens as it leaves
            // after the handover the photo's own calendar melts into a soft blur, so it never shows twice
            vec2 q = vec2(p.x, resY - p.y);
            vec2 e = min(q - hole.xy, hole.xy + hole.zw - q) / (0.06 * hole.w);
            float inside = clamp(min(e.x, e.y), 0.0, 1.0) * holeAmt;
            c = mix(c, texture2D(map, vec2(uv.x, 1.0 - uv.y), 6.0).rgb * 0.8, inside);
          }
          c *= mix(vec3(1.0), vec3(0.62, 0.5, 0.46), pdusk);   // the room at dusk
          gl_FragColor = vec4(c, opacity); }`.replace(/RES_Y/g, 'resY'),
      transparent: false, depthWrite: false, depthTest: false,
    }));
    this.plate.material.uniforms.resY = { value: 1 };
    this.plate.material.fragmentShader = 'uniform float resY;\n' + this.plate.material.fragmentShader;
    this.plate.frustumCulled = false;
    this.plateScene = new THREE.Scene();
    this.plateScene.add(this.plate);
    this.room = [];
    this.roomShadowMat = { opacity: 0 };

    // the sun through blinds: hard, low, warm, from the right, the shadow-casting key of chapter 1
    const sun = this.sun = new THREE.SpotLight(0xfff8f4, SET[0].sun, 0, 0.82, 0.6, 0);   // wide enough to reach the wall of postcards
    sun.position.set(2.0, 1.35, 0.55);   // the photo's window is to the right: its shadows fall left
    sun.target.position.set(-0.05, 0.16, -0.12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(this.opts.phone ? 1024 : 2048, this.opts.phone ? 1024 : 2048);
    sun.shadow.bias = -0.0004; sun.shadow.radius = 14; sun.shadow.blurSamples = 20;   // soft, like the vase and bowl in the photo
    sun.shadow.camera.near = 0.8; sun.shadow.camera.far = 6;
    s.add(sun, sun.target);

    // studio key: long, soft and low enough to lay a long shadow across the sweep
    const key = this.key = new THREE.DirectionalLight(0xfff8f0, 0);   // near white: the paper reads off-white, not peach
    key.position.set(-1.7, 1.25, 1.0);
    key.castShadow = true;
    key.shadow.mapSize.set(this.opts.phone ? 1024 : 2048, this.opts.phone ? 1024 : 2048);
    const sc = key.shadow.camera;
    sc.left = -1.1; sc.right = 1.1; sc.top = 1.1; sc.bottom = -1.1; sc.near = 0.5; sc.far = 6;
    key.shadow.bias = -0.0004; key.shadow.radius = 12; key.shadow.blurSamples = 20;
    s.add(key);

    // fill from the camera's right, about a third of the key, soft-shadowed: it lays the soft cast shadow
    // the reference shows falling to the left of the board (the key's own shadow falls behind it)
    const sfill = this.sfill = new THREE.DirectionalLight(0xf2f4ff, 0);
    sfill.castShadow = true;
    sfill.shadow.mapSize.set(this.opts.phone ? 512 : 1024, this.opts.phone ? 512 : 1024);
    Object.assign(sfill.shadow.camera, { left: -1.6, right: 1.6, top: 1.6, bottom: -1.6, near: 0.3, far: 7 });
    sfill.shadow.bias = -0.0008; sfill.shadow.radius = 16; sfill.shadow.blurSamples = 16;
    s.add(sfill);
    // raking light that grazes the board face so the burn reads
    const rake = this.rake = new THREE.DirectionalLight(0xfff1e2, 0);   // neutral warm white, as the reference
    rake.position.set(1.0, 0.2, 0.62);
    s.add(rake);
    const back = this.back = new THREE.DirectionalLight(0xfff4e6, 0);
    back.position.set(0.6, 1.6, -1.8);
    s.add(back);
    const fill = this.fill = new THREE.HemisphereLight(0xffe9cc, 0xb27a42, 0.3);   // warm bounce from the desk
    s.add(fill);

    // soft contact blob under the foot (fades when the board is lifted upright)
    const bc = document.createElement('canvas'); bc.width = bc.height = 128;
    const bg = bc.getContext('2d');
    const gr = bg.createRadialGradient(64, 64, 4, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    bg.fillStyle = gr; bg.fillRect(0, 0, 128, 128);
    this.blob = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.2),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bc), transparent: true, opacity: 0.22, depthWrite: false, color: 0x2a1a0c }));
    this.blob.rotation.x = -Math.PI / 2; this.blob.position.set(0, 0.0003, -0.035);
    s.add(this.blob);
  }

  async load(url, onProgress) {
    const gltf = await new GLTFLoader().loadAsync(url, (e) => e.total && onProgress(e.loaded / e.total));
    const root = gltf.scene;
    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = o.name !== 'Engraving';
        o.receiveShadow = true;
        const m = o.material;
        if (m.map) m.map.anisotropy = this.opts.phone ? 4 : 8;
        if (/^Sheet/.test(m.name) && m.normalMap) m.normalScale.multiplyScalar(0.3);
        if (/^Sheet/.test(m.name)) { m.color.setRGB(0.9, 0.9, 0.91); m.roughness = 1; m.metalness = 0; m.envMapIntensity = 0.8; }   // was a cream tint (0.9, 0.86, 0.76): read yellow-peach
        if (m.emissive) m.emissive.set(0x000000);   // no self-light anywhere: the paper is lit, not glowing
      }
      if (o.isMesh) for (const m of [].concat(o.material)) if (/^Sheet/.test(m.name) && m.map) {
        m.map.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
        // printed paper is matte: no dielectric sheen (its 4% specular lifted the ink and flattened the print)
        m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#ifdef USE_MAP\n vec4 sampledDiffuseColor = texture2D( map, vMapUv, -1.0 );\n diffuseColor *= sampledDiffuseColor;\n#endif')
          .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n material.specularColor = vec3(0.0); material.specularF90 = 0.0;'); };
      }
      if (o.userData && o.userData.defaultVisible === false) o.visible = false;
    });
    for (const n of PARTS) {
      const o = root.getObjectByName(n);
      this.parts[n] = o;
      this.rest[n] = o.position.clone();
    }
    this.engravingMesh = root.getObjectByName('Engraving');
    // birch from the owner's photo of the real board (calendar-refs/lookdev/make_wood.py): rectified, de-lit,
    // unwrapped onto the board face; grain normal and roughness 0.55-0.7 from the same photo. Ledge and peg
    // take a clean tile of the same wood.
    const board = root.getObjectByName('Board');
    this.boardMats = [];
    board.traverse((o) => { if (o.isMesh) [].concat(o.material).forEach((m) => { if (/Birch_Board/.test(m.name)) this.boardMats.push(m); }); });
    const tileMats = [];
    root.traverse((o) => { if (o.isMesh) [].concat(o.material).forEach((m) => { if (/^(Birch_Ledge|PegWood)/.test(m.name) && !tileMats.includes(m)) tileMats.push(m); }); });
    const tl = new THREE.TextureLoader(), an = this.opts.phone ? 4 : 8;
    const tex = (url, srgb, fn) => tl.load(url, (t) => { t.flipY = false; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = an; if (srgb) t.colorSpace = THREE.SRGBColorSpace; fn(t); });
    tex('assets/3d/look/board-col.webp', true, (t) => this.boardMats.forEach((m) => { m.map = t; m.color.set(0xffffff); m.needsUpdate = true; }));
    tex('assets/3d/look/board-nrm.webp', false, (t) => this.boardMats.forEach((m) => { m.normalMap = t; m.normalScale.set(0.6, -0.6); m.needsUpdate = true; }));
    tex('assets/3d/look/board-rough.webp', false, (t) => this.boardMats.forEach((m) => { m.roughnessMap = t; m.roughness = 1; m.metalness = 0; m.needsUpdate = true; }));
    const charMats = [];
    root.traverse((o) => { if (o.isMesh) [].concat(o.material).forEach((m) => { if (m.name === 'CharEdge' && !charMats.includes(m)) charMats.push(m); }); });
    tex('assets/3d/look/char-edge.webp', true, (t) => charMats.forEach((m) => { m.map = t; m.color.set(0xffffff); m.roughness = 0.82; m.metalness = 0; m.needsUpdate = true; }));
    tex('assets/3d/look/birch-tile.webp', true, (t) => tileMats.forEach((m) => { m.map = t; m.color.set(0xffffff); m.roughnessMap = null; m.roughness = 0.62; m.metalness = 0; m.needsUpdate = true; }));
    this.model = root;
    this.scene.add(root);
  }

  composer() {
    const r = this.renderer;
    const c = this.comp = new EffectComposer(r, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
    c.addPass(new RenderPass(this.plateScene, this.camera));
    const main = new RenderPass(this.scene, this.camera);
    main.clear = false;
    c.addPass(main);
    if (!this.opts.phone) {
      this.bokeh = new BokehPass(this.scene, this.camera, { focus: 2, aperture: 0.004, maxblur: 0.007 });
      c.addPass(this.bokeh);
    }
    this.bloom = { strength: 0 };   // no bloom: owner review (it fogged the paper)
    c.addPass(new OutputPass());
    this.dither = new ShaderPass(FinishShader);
    c.addPass(this.dither);
  }

  // phones render at 1x, except while the journal text is in close-up
  setBoost(on) {
    if (on === !!this.boost) return;
    this.boost = on;
    this.resize(this.size.w, this.size.h);
  }

  resize(w, h) {
    const dprCap = this.opts.phone ? (this.boost ? 2 : 1) : (this.boost ? 2 : 1.5);
    let pr = Math.min(window.devicePixelRatio || 1, dprCap);
    const budget = this.boost ? 2880 * 1800 : 2560 * 1440;   // paper chapters: full device resolution so print holds
    if (w * h * pr * pr > budget) pr = Math.sqrt(budget / (w * h));
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    this.comp.setPixelRatio(pr);
    this.comp.setSize(w, h);
    PROJ.res.value.set(w * this.renderer.getPixelRatio(), h * this.renderer.getPixelRatio());
    this.size = { w, h };
    this.camera.aspect = w / h;
    if (this.dither) this.dither.uniforms.uAspect.value = w / h;
    this.camera.updateProjectionMatrix();
  }

  // scene float: 0 morning, 1 studio, 2 macro rake
  setScene(f, aft = 0, dusk = 0) {
    this.sceneF = f;
    const i = Math.min(1, Math.floor(clamp(f, 0, 1.999)));
    const t = clamp(f - i);
    const a = SET[i], b = SET[i + 1];
    const L = (k) => lerp(lerp(lerp(a[k], b[k], t), AFT[k], aft), DUSK[k], dusk);
    const C = (k, out) => out.setHex(a[k]).lerp(_c.setHex(b[k]), t).lerp(_c.setHex(AFT[k]), aft).lerp(_c.setHex(DUSK[k]), dusk);
    if (aft !== this._aft || dusk !== this._dusk) {
      this.sun.position.lerpVectors(SUN0, SUN_AFT, aft).lerp(SUN_DUSK, dusk); this.sun.color.lerpColors(SUNC0, SUNC_AFT, aft).lerp(SUNC_DUSK, dusk);
      this._aft = aft; this._dusk = dusk;
    }
    C('top', this.bgMat.uniforms.top.value); C('bot', this.bgMat.uniforms.bot.value);
    C('bot', this.floorColMat.color);
    this.floorColMat.opacity = 1 - L('room');   // always there; the reveal (not a switch) decides where it shows
    this.scene.environmentIntensity = L('env');
    this.renderer.toneMappingExposure = f < 1 ? lerp(1.0, 0.97, clamp(f)) : lerp(0.97, 1, clamp(f - 1));   // 1.0 on the table: the exposure also applies to the owner's photo, which must not change   // measured: paper at ~236, not in the shoulder
    this.sun.intensity = L('sun');
    this.key.intensity = L('key');
    this.sfill.intensity = L("key") / 4.2 * (1 - clamp(f - 1));   // studio only, not the macro
    this.sfill.visible = this.sfill.intensity > 0.01;
    this.rake.intensity = L('rake');
    this.fill.intensity = L('hemi');
    this.back.intensity = L('back');
    this.poolMat.opacity = L('pool');
    const room = L('room');
    PROJ.wipe.value = 1 - room;
    this.roomShadowMat.opacity = 0.8 * Math.pow(room, 2);
    for (const m of this.room) m.visible = room > 0.003;
    this.floorMat.opacity = L('floor');
    this.bloom.strength = L('bloom');
    const nrm = L('nrm') * 0.6;
    for (const m of this.boardMats || []) m.normalScale.set(nrm, -nrm);
    this.blobLevel = L('blob');
    this.studioW = clamp(1 - Math.abs(f - 1));
    this.sun.visible = this.sun.intensity > 0.01;
    this.key.visible = this.key.intensity > 0.01;
    this.dither.uniforms.uVig.value = L('vig');
    this.dither.uniforms.uGrain.value = L('grain');
  }

  // the sweep's colour per chapter (warm stone, soft sage, warm clay), weighted by how much of the studio shows
  setSweep(bot, top, w) {
    if (w <= 0) return;
    this.bgMat.uniforms.bot.value.lerp(_t2.set(bot), w); this.bgMat.uniforms.top.value.lerp(_t1.set(top), w);
    this.floorColMat.color.lerp(_t2.set(bot), w);
  }
  setGobo(amt, t, s) { this.goboU.uGobo.value = amt; this.goboU.uGoboT.value = t; this.goboU.uGoboS.value = s; }

  // a soft colour from the month's artwork over the backdrop and floor (amt 0 = none)
  setTint(light, dark, amt) {
    if (amt <= 0) return;
    const u = this.bgMat.uniforms;
    u.top.value.lerp(_t1.set(light), amt);
    u.bot.value.lerp(_t2.set(dark), amt * 0.7);
    this.floorColMat.color.lerp(_t2, amt * 0.5);
  }

  // Projector = the chapter-1 camera at its first key (same pose, offset and lens, 16:9 frame,
  // a touch wider so the drift stays inside the image). Proxies are placed so the image's
  // desk/wall line lands on the real desk/wall junction.
  setProjector() {}

  // the photo plate's placement (CSS px) and how much of it shows
  setDuskPlate(a) { this.plateU.pdusk.value = a; }
  // the bloom's centre: the board's centre on screen (CSS px)
  setRevealCentre(x, y) { const pr = this.renderer.getPixelRatio(); this.revealU.uRevC.value.set(x * pr, (this.size.h - y) * pr); }

  setPlate(rect, cover, opacity, hole, holeAmt = 0) {
    const pr = this.renderer.getPixelRatio();
    if (hole) this.plateU.hole.value.set((hole.x - hole.w * 0.06) * pr, (hole.y - hole.h * 0.03) * pr, hole.w * 1.12 * pr, hole.h * 1.06 * pr);
    this.plateU.holeAmt.value = holeAmt;
    this.plateU.rect.value.set(rect.x * pr, rect.y * pr, rect.w * pr, rect.h * pr);
    this.plateU.cover.value.set(cover.x * pr, cover.y * pr, cover.w * pr, cover.h * pr);
    this.plateU.opacity.value = 1;
    // 0 = photo, 1 = studio. The sweep is revealed from the board outward over the photo, which blurs as it goes
    const p = 1 - opacity, diag = Math.hypot(this.size.w, this.size.h) * pr;
    const S = Math.max(1, diag * 0.32 * (0.35 + p));
    this.revealU.uRevS.value = S;
    this.revealU.uRevR.value = p >= 0.999 ? 1e5 : -S + (diag * 1.2 + S) * p * p;
    this.plateU.pblur.value = Math.min(1, p * 1.4);
    this.bgMat.uniforms.alpha.value = 1;
    this.plate.material.uniforms.resY.value = this.size.h * pr;
    this.plate.visible = opacity > 0.002;
    this.plateScene.visible = this.plate.visible;
    this.plateOpacity = opacity;
  }

  // keyed camera + subject shift for the layout (desktop: subject right; phone: subject up)
  setCamera(pos, quat, fovDeg, zoom = 1) {
    const c = this.camera;
    c.zoom = zoom;
    c.position.copy(pos);
    c.quaternion.copy(quat);
    c.fov = fovDeg;
    const { w, h } = this.size;
    const sx = this.viewShift.x * w, sy = this.viewShift.y * h;
    if (Math.abs(sx) > 0.5 || Math.abs(sy) > 0.5) c.setViewOffset(w, h, -sx, sy, w, h);
    else c.clearViewOffset();
    c.updateProjectionMatrix();
  }

  // relax 0..1: stop down so a whole page block stays sharp (the journal close-ups)
  setFocus(dist, relax = 0) {
    if (!this.bokeh) return;
    const u = this.bokeh.uniforms;
    u.focus.value = dist;
    u.aperture.value = lerp(lerp(0.0014, 0.012, clamp((0.9 - dist) / 0.55)), 0.0008, relax);   // subtle: the product stays sharp
    u.maxblur.value = lerp(0.006, 0.01, clamp((0.9 - dist) / 0.55)) * (1 - (this.plateOpacity || 0));
  }

  render(time) {
    this.dither.uniforms.uTime.value = time;
    this.comp.render();
  }
}
