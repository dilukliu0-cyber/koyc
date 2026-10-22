import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';

const BG = 0x07090a;
const LIME = 0xa8e02a;
const YELLOW = 0xeaea2f;
const MAX_MINI = 6;

type Props = {
  /** How many cans were drunk today. */
  count: number;
  /** Bumps on every tap — triggers the open/fizz animation. */
  tapSignal: number;
  onPress: () => void;
};

// ---------- decals traced from the real can (image space: 516 x 1337 px) ----------
type Pt = [number, number];
const IMG_W = 516;
const PX = 2 / IMG_W; // world units per image pixel (can radius = 1)
const IMG_CY = 668;
const SEG = 10; // body facets: a flat face is centred on the front (theta = 0)
const STEP = (Math.PI * 2) / SEG;

const FUR: Pt[][] = [
  [[30,100],[105,50],[70,140],[150,225],[140,300],[75,325],[105,385],[55,430],[45,520],[62,600],[28,655],[8,600],[0,470],[0,120]],
  [[150,75],[240,40],[335,22],[445,58],[405,112],[335,98],[265,125],[205,170],[125,150]],
  [[440,50],[472,130],[500,250],[492,350],[455,260],[432,175],[395,130],[430,100]],
  [[210,285],[285,300],[345,288],[292,326],[332,380],[402,368],[442,340],[452,385],[402,420],[432,470],[442,492],[300,452],[290,410],[242,400],[216,392]],
  [[236,472],[286,400],[300,432],[252,528]],
  [[128,645],[172,702],[192,668],[232,742],[270,688],[312,722],[372,642],[332,722],[262,762],[190,752]],
  [[385,330],[430,328],[442,362],[402,356]],
  [[92,600],[108,690],[84,722]],
];
const CROWN: Pt[] = [[90,760],[116,700],[126,772],[162,735],[206,776],[250,740],[292,776],[342,735],[376,776],[402,700],[422,760],[412,822],[96,822]];

// 5x7 block font
const FONT: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  G: ['.####', '#....', '#....', '#..##', '#...#', '#...#', '.####'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
};

function textPolys(str: string, x0: number, x1: number, y0: number, y1: number): Pt[][] {
  const cols = str.length * 6 - 1;
  const cw = (x1 - x0) / cols;
  const rh = (y1 - y0) / 7;
  const out: Pt[][] = [];
  [...str].forEach((ch, ci) => {
    const glyph = FONT[ch];
    if (!glyph) return;
    glyph.forEach((row, r) =>
      [...row].forEach((c, k) => {
        if (c !== '#') return;
        const x = x0 + (ci * 6 + k) * cw;
        const y = y0 + r * rh;
        out.push([[x, y], [x + cw, y], [x + cw, y + rh], [x, y + rh]]);
      }),
    );
  });
  return out;
}

/** Wrap flat image-space polygons onto the front of the cylinder as one mesh geometry. */
function wrapGeometry(polys: Pt[][], radius: number, offset: Pt = [0, 0]): THREE.BufferGeometry {
  const pos: number[] = [];
  const push = (p: Pt) => {
    const u = Math.max(-0.999, Math.min(0.999, (p[0] + offset[0] - IMG_W / 2) / (IMG_W / 2)));
    const th = Math.asin(u);
    const y = (IMG_CY - (p[1] + offset[1])) * PX;
    // sit on the faceted body: distance to a facet plane at angle th
    const c = Math.round(th / STEP) * STEP;
    const r = (radius * Math.cos(STEP / 2)) / Math.cos(th - c);
    pos.push(Math.sin(th) * r, y, Math.cos(th) * r);
  };
  const split = (t: [Pt, Pt, Pt], depth: number) => {
    const len = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    const e = [len(t[0], t[1]), len(t[1], t[2]), len(t[2], t[0])];
    const m = Math.max(...e);
    if (m <= 16 || depth > 12) {
      t.forEach(push);
      return;
    }
    const i = e.indexOf(m);
    const a = t[i], b = t[(i + 1) % 3], c = t[(i + 2) % 3];
    const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    split([a, mid, c], depth + 1);
    split([mid, b, c], depth + 1);
  };
  for (const poly of polys) {
    const contour = poly.map((p) => new THREE.Vector2(p[0], p[1]));
    const faces = THREE.ShapeUtils.triangulateShape(contour, []);
    for (const f of faces) split([poly[f[0]], poly[f[1]], poly[f[2]]], 0);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return geo;
}

let DECALS: { yellow: THREE.BufferGeometry; lime: THREE.BufferGeometry; white: THREE.BufferGeometry } | null = null;
function getDecals() {
  if (!DECALS) {
    const white = [
      CROWN,
      ...textPolys('GORILLA', 38, 482, 872, 1016),
      ...textPolys('ENERGY DRINK', 82, 438, 1058, 1104),
    ];
    DECALS = {
      yellow: wrapGeometry(FUR, 1.012, [7, 10]),
      lime: wrapGeometry(FUR, 1.02, [0, 0]),
      white: wrapGeometry(white, 1.028),
    };
  }
  return DECALS;
}

const CAN_SCALE = 0.95;
const FLOOR_Y = -2.62 * CAN_SCALE - 0.05;

/** Low-poly Gorilla can. `opened` flips the pull-tab up and darkens the hole. */
function buildCan(opened: boolean): THREE.Group {
  const outer = new THREE.Group();
  const g = new THREE.Group();
  g.scale.setScalar(CAN_SCALE);
  outer.add(g);
  const lathe = (pts: Pt[], mat: THREE.Material) =>
    new THREE.Mesh(new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), SEG, Math.PI / SEG, Math.PI * 2), mat);

  const blackMat = new THREE.MeshStandardMaterial({ color: 0x0b0e0f, metalness: 0.5, roughness: 0.4, flatShading: true });
  const silver = new THREE.MeshStandardMaterial({ color: 0xcdd2d5, metalness: 0.85, roughness: 0.3, flatShading: true });

  // body with tapered neck
  g.add(lathe([[0.95, -2.45], [1, -2.3], [1, 2.1], [0.9, 2.45]], blackMat));
  // silver bottom
  g.add(lathe([[0, -2.6], [0.75, -2.6], [0.95, -2.45]], silver));
  // silver rim + lid
  g.add(lathe([[0.9, 2.45], [0.95, 2.6], [0.8, 2.55]], silver));
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.04, SEG), silver);
  lid.rotation.y = Math.PI / SEG;
  lid.position.y = 2.53;
  g.add(lid);

  // decals
  const d = getDecals();
  const lm = (c: number, e: number) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: e, roughness: 0.5, flatShading: true, side: THREE.DoubleSide });
  g.add(new THREE.Mesh(d.yellow, lm(0xe6e22a, 0.35)));
  g.add(new THREE.Mesh(d.lime, lm(0xa4e02b, 0.3)));
  g.add(new THREE.Mesh(d.white, new THREE.MeshStandardMaterial({ color: 0xf6f6f2, emissive: 0xffffff, emissiveIntensity: 0.25, roughness: 0.6, flatShading: true, side: THREE.DoubleSide })));

  // opening hole + pull tab
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.28, 6), new THREE.MeshBasicMaterial({ color: opened ? 0x020303 : 0x8a9094 }));
  hole.rotation.x = -Math.PI / 2;
  hole.position.set(0, 2.56, -0.32);
  g.add(hole);

  const tab = new THREE.Group();
  tab.position.set(0, 2.58, 0.12);
  const tabMesh = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.62), silver);
  tabMesh.position.z = 0.1;
  tab.add(tabMesh);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.05, 3, 6), silver);
  ring.rotation.x = Math.PI / 2;
  ring.position.z = 0.4;
  tab.add(ring);
  tab.rotation.x = opened ? -0.9 : 0;
  tab.name = 'tab';
  g.add(tab);

  return outer;
}

type Fizz = { mesh: THREE.Mesh; vel: THREE.Vector3; life: number };

export default function Can3D({ count, tapSignal, onPress }: Props) {
  const countRef = useRef(count);
  countRef.current = count;
  const tapAt = useRef<number | null>(null);
  const tapSeen = useRef(tapSignal);
  const aliveRef = useRef(true);

  useEffect(() => {
    if (tapSignal !== tapSeen.current) {
      tapSeen.current = tapSignal;
      tapAt.current = Date.now();
    }
  }, [tapSignal]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const onContextCreate = (gl: ExpoWebGLRenderingContext) => {
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const canvas = {
      width: w,
      height: h,
      clientWidth: w,
      clientHeight: h,
      style: {},
      addEventListener: () => {},
      removeEventListener: () => {},
      getContext: () => gl,
    } as unknown as HTMLCanvasElement;
    const renderer = new THREE.WebGLRenderer({ canvas, context: gl as unknown as WebGL2RenderingContext, antialias: true });
    renderer.setSize(w, h, false);
    renderer.setClearColor(BG, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
    camera.position.set(0, 1.5, 13.5);
    camera.lookAt(0, -0.1, 0);

    scene.add(new THREE.AmbientLight(0x88aa88, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(4, 6, 6);
    scene.add(key);
    const rim = new THREE.PointLight(LIME, 40, 30);
    rim.position.set(-4, 2, -3);
    scene.add(rim);

    // glowing floor ring
    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 2.6, 0.05, 12),
      new THREE.MeshBasicMaterial({ color: 0x143016 }),
    );
    floor.position.y = FLOOR_Y;
    scene.add(floor);
    const floorRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.6, 0.05, 4, 12),
      new THREE.MeshBasicMaterial({ color: LIME }),
    );
    floorRing.rotation.x = Math.PI / 2;
    floorRing.position.y = FLOOR_Y + 0.02;
    scene.add(floorRing);

    // main can (always a fresh, closed one)
    const can = buildCan(false);
    scene.add(can);
    const tab = can.getObjectByName('tab') as THREE.Group;

    // drunk cans
    const minis: { g: THREE.Group; born: number }[] = [];
    const syncMinis = () => {
      const want = Math.min(countRef.current, MAX_MINI);
      while (minis.length < want) {
        const g = buildCan(true);
        g.scale.setScalar(0.5);
        scene.add(g);
        minis.push({ g, born: Date.now() });
      }
      while (minis.length > want) scene.remove(minis.pop()!.g);
      minis.forEach((m, i) => {
        // alternate left/right of the main can, rows stepping back
        const side = i % 2 === 0 ? -1 : 1;
        m.g.userData.tx = side * 2.2;
        m.g.userData.tz = -0.8 - Math.floor(i / 2) * 1.4;
      });
    };

    // fizz particles
    const fizzGeo = new THREE.OctahedronGeometry(0.09, 0);
    const fizzes: Fizz[] = [];
    for (let i = 0; i < 28; i++) {
      const mesh = new THREE.Mesh(fizzGeo, new THREE.MeshBasicMaterial({ color: i % 3 ? LIME : 0xffffff }));
      mesh.visible = false;
      scene.add(mesh);
      fizzes.push({ mesh, vel: new THREE.Vector3(), life: 0 });
    }
    const burst = () => {
      for (const f of fizzes) {
        f.mesh.position.set((Math.random() - 0.5) * 0.4, 2.65 * CAN_SCALE, (Math.random() - 0.5) * 0.4 - 0.2);
        f.vel.set((Math.random() - 0.5) * 2.2, 2.5 + Math.random() * 3.5, (Math.random() - 0.5) * 2.2);
        f.life = 0.8 + Math.random() * 0.8;
        f.mesh.visible = true;
        f.mesh.scale.setScalar(0.6 + Math.random());
      }
    };

    let last = Date.now();
    let handledTap: number | null = null;
    const loop = () => {
      if (!aliveRef.current) return;
      requestAnimationFrame(loop);
      const now = Date.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      syncMinis();

      // tap animation: squash, tab pops, fizz burst, little wobble
      let squash = 0;
      let wobble = 0;
      let tabAngle = 0;
      let spin = 0;
      if (tapAt.current !== null) {
        const t = (now - tapAt.current) / 1000;
        if (handledTap !== tapAt.current) {
          handledTap = tapAt.current;
          burst();
        }
        squash = t < 0.18 ? Math.sin((t / 0.18) * Math.PI) * 0.08 : 0;
        spin = t < 0.9 ? (1 - Math.pow(1 - t / 0.9, 3)) * Math.PI * 2 : 0;
        wobble = t < 1.2 ? Math.sin(t * 28) * Math.exp(-t * 4) * 0.12 : 0;
        tabAngle = t < 0.25 ? -(t / 0.25) * 1.0 : t < 1.0 ? -1.0 : -1.0 * Math.max(0, 1 - (t - 1.0) / 0.3);
      }
      can.rotation.y = Math.sin(now / 1400) * 0.5 + spin;
      can.rotation.z = wobble;
      can.scale.set(1 + squash, 1 - squash * 1.5, 1 + squash);
      can.position.y = Math.sin(now / 700) * 0.06;
      tab.rotation.x = tabAngle;
      floorRing.rotation.z += dt * 0.4;

      minis.forEach((m, i) => {
        const age = (now - m.born) / 1000;
        const tx = m.g.userData.tx as number;
        m.g.position.x += (tx - m.g.position.x) * Math.min(1, dt * 8);
        // drop in from above on arrival
        const drop = Math.max(0, 1 - age * 2.2);
        m.g.position.y = FLOOR_Y + 2.62 * CAN_SCALE * 0.5 + 0.05 + 3 * drop * drop;
        m.g.position.z = m.g.userData.tz as number;
        m.g.rotation.y = (i % 2 === 0 ? 0.55 : -0.55) + Math.sin(now / 1400 + i) * 0.15;
        m.g.rotation.z = i % 2 ? 0.05 : -0.05;
      });

      for (const f of fizzes) {
        if (!f.mesh.visible) continue;
        f.life -= dt;
        if (f.life <= 0) {
          f.mesh.visible = false;
          continue;
        }
        f.vel.y -= 9 * dt;
        f.mesh.position.addScaledVector(f.vel, dt);
        f.mesh.rotation.x += dt * 6;
        f.mesh.rotation.y += dt * 4;
      }

      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    loop();
  };

  return (
    <Pressable style={styles.fill} onPress={onPress}>
      <GLView style={styles.fill} onContextCreate={onContextCreate} pointerEvents="none" />
    </Pressable>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
