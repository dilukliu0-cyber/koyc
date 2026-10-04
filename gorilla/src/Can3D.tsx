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

/** Low-poly Gorilla can. `opened` flips the pull-tab up and darkens the hole. */
function buildCan(opened: boolean): THREE.Group {
  const g = new THREE.Group();
  const R = 1;
  const H = 3.4;
  const SEG = 10;

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, H, SEG, 1),
    new THREE.MeshStandardMaterial({ color: 0x0c0f10, metalness: 0.55, roughness: 0.4, flatShading: true }),
  );
  g.add(body);

  // jagged lime/yellow "fur" shards wrapped around the front of the can
  const shardMat = (c: number) =>
    new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.25, flatShading: true, side: THREE.DoubleSide, roughness: 0.5 });
  const limeMat = shardMat(LIME);
  const yellowMat = shardMat(YELLOW);
  const shard = (ang: number, y: number, w: number, h: number, skew: number, mat: THREE.Material) => {
    const geo = new THREE.BufferGeometry();
    const v = new Float32Array([
      -w / 2, 0, 0,
      w / 2, h * 0.15, 0,
      skew, h, 0.04,
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(v, 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat);
    m.position.set(Math.sin(ang) * (R + 0.012), y, Math.cos(ang) * (R + 0.012));
    m.rotation.y = ang;
    g.add(m);
  };
  const shards: [number, number, number, number, number, number][] = [
    // angle, y, width, height, skew, color (0 lime / 1 yellow)
    [-1.25, 0.9, 0.7, 0.9, -0.2, 0],
    [-0.95, 0.3, 0.8, 1.1, 0.2, 0],
    [-0.6, 1.1, 0.7, 0.6, 0.1, 1],
    [-0.25, 0.55, 0.55, 0.8, -0.1, 0],
    [0.15, 0.95, 0.75, 0.65, 0.2, 0],
    [0.5, 0.35, 0.6, 1.0, -0.2, 1],
    [0.85, 0.85, 0.7, 0.8, 0.2, 0],
    [1.2, 0.2, 0.8, 1.2, 0.0, 0],
    [-0.45, -0.1, 0.45, 0.5, 0.1, 0],
    [0.3, 0.1, 0.4, 0.55, -0.1, 1],
  ];
  for (const [a, y, w, h, s, c] of shards) shard(a, y, w, h, s, c ? yellowMat : limeMat);

  // white crown zig-zag + band (stands in for the logo)
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f4f0, flatShading: true, roughness: 0.6 });
  const crownH = [0.5, 0.8, 0.45, 0.9, 0.5, 0.85, 0.45];
  crownH.forEach((h, i) => {
    const ang = (i - 3) * 0.3;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.17, h, 4), white);
    spike.position.set(Math.sin(ang) * (R + 0.02), -0.55 + h / 2, Math.cos(ang) * (R + 0.02));
    spike.rotation.y = ang;
    g.add(spike);
  });
  const band = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.015, R + 0.015, 0.34, SEG, 1, true), white);
  band.position.y = -0.95;
  g.add(band);
  const band2 = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.015, R + 0.015, 0.12, SEG, 1, true), white);
  band2.position.y = -1.28;
  g.add(band2);

  // silver top & bottom
  const silver = new THREE.MeshStandardMaterial({ color: 0xc9ced1, metalness: 0.9, roughness: 0.3, flatShading: true });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.88, R, 0.22, SEG), silver);
  top.position.y = H / 2 + 0.11;
  g.add(top);
  const bottom = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.86, R * 0.92, 0.2, SEG), silver);
  bottom.position.y = -H / 2 - 0.1;
  g.add(bottom);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.74, R * 0.74, 0.04, SEG), silver);
  lid.position.y = H / 2 + 0.23;
  g.add(lid);

  // opening hole + pull tab
  const hole = new THREE.Mesh(
    new THREE.CircleGeometry(0.3, 6),
    new THREE.MeshBasicMaterial({ color: opened ? 0x020303 : 0x8a9094 }),
  );
  hole.rotation.x = -Math.PI / 2;
  hole.position.set(0, H / 2 + 0.26, -0.28);
  g.add(hole);

  const tab = new THREE.Group();
  tab.position.set(0, H / 2 + 0.27, 0.1);
  const tabMesh = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.62), silver);
  tabMesh.position.z = 0.1;
  tab.add(tabMesh);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.04, 4, 6), silver);
  ring.rotation.x = Math.PI / 2;
  ring.position.z = 0.4;
  tab.add(ring);
  tab.rotation.x = opened ? -0.9 : 0;
  tab.name = 'tab';
  g.add(tab);

  return g;
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
    camera.position.set(0, 1.2, 12.5);
    camera.lookAt(0, 0.1, 0);

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
    floor.position.y = -1.85;
    scene.add(floor);
    const floorRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.6, 0.05, 4, 12),
      new THREE.MeshBasicMaterial({ color: LIME }),
    );
    floorRing.rotation.x = Math.PI / 2;
    floorRing.position.y = -1.83;
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
        f.mesh.position.set((Math.random() - 0.5) * 0.4, 1.95, (Math.random() - 0.5) * 0.4 - 0.2);
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
      if (tapAt.current !== null) {
        const t = (now - tapAt.current) / 1000;
        if (handledTap !== tapAt.current) {
          handledTap = tapAt.current;
          burst();
        }
        squash = t < 0.18 ? Math.sin((t / 0.18) * Math.PI) * 0.08 : 0;
        wobble = t < 1.2 ? Math.sin(t * 28) * Math.exp(-t * 4) * 0.12 : 0;
        tabAngle = t < 0.25 ? -(t / 0.25) * 1.0 : t < 1.0 ? -1.0 : -1.0 * Math.max(0, 1 - (t - 1.0) / 0.3);
      }
      can.rotation.y += dt * 0.7;
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
        m.g.position.y = -0.9 + 3 * drop * drop;
        m.g.position.z = m.g.userData.tz as number;
        m.g.rotation.y = 0.5 + i * 0.4;
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
