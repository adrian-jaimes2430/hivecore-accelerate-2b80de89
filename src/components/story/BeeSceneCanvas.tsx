import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import beeModel from "@/assets/hivecore-bee.glb.asset.json";

/**
 * Escena three.js de la historia: el logo HIVECORE en 3D flotando dentro de
 * una nube de partículas interactivas. El scroll conduce la cámara y la
 * rotación del modelo; el puntero empuja las partículas.
 */
export function BeeSceneCanvas() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    camera.position.set(0, 0, 10);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(renderer.domElement);
    const cv = renderer.domElement;
    cv.style.width = "100%";
    cv.style.height = "100%";
    cv.style.display = "block";

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const key = new THREE.DirectionalLight(0xc7f384, 2.2);
    key.position.set(4, 5, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x88ffcc, 1.2);
    rim.position.set(-5, -2, -4);
    scene.add(rim);

    // ── Partículas interactivas ────────────────────────────────────────────
    const COUNT = 900;
    const pos = new Float32Array(COUNT * 3);
    const vel = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 22;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 14;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

    const sprite = (() => {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const g = c.getContext("2d")!;
      const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      rg.addColorStop(0, "rgba(255,255,255,1)");
      rg.addColorStop(0.4, "rgba(199,243,132,0.65)");
      rg.addColorStop(1, "rgba(199,243,132,0)");
      g.fillStyle = rg;
      g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();

    const points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.14,
        map: sprite,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.9,
      }),
    );
    scene.add(points);

    // ── Logo 3D ───────────────────────────────────────────────────────────
    const pivot = new THREE.Group();
    scene.add(pivot);
    let model: THREE.Object3D | null = null;

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(
      beeModel.url,
      (gltf) => {
        model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const scale = 4.4 / Math.max(size.x, size.y, size.z);
        model.position.sub(center);
        model.scale.setScalar(scale);
        model.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (mesh.isMesh) {
            const mat = mesh.material as THREE.MeshStandardMaterial;
            if (mat) {
              mat.envMapIntensity = 1.2;
              mat.needsUpdate = true;
            }
          }
        });
        pivot.add(model);
      },
      undefined,
      () => {},
    );

    // ── Interacción ───────────────────────────────────────────────────────
    const pointer = new THREE.Vector3(9999, 9999, 0);
    const mouse = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      pointer.set(mouse.x * 11, mouse.y * 8, 0);
    };

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };

    let raf = 0;
    const clock = new THREE.Clock();
    let scroll = 0;

    const render = () => {
      const t = clock.getElapsedTime();
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const raw = max > 0 ? window.scrollY / max : 0;
      scroll += (raw - scroll) * 0.08;

      // Cámara viaja hacia dentro de la escena con el scroll
      camera.position.z = 10 - scroll * 4.5;
      camera.position.x = mouse.x * 0.9;
      camera.position.y = mouse.y * 0.6 + scroll * 1.4;
      camera.lookAt(0, scroll * 0.8, 0);

      if (model) {
        pivot.rotation.y = t * 0.25 + scroll * Math.PI * 2.2;
        pivot.rotation.x = Math.sin(t * 0.4) * 0.12 + mouse.y * 0.2;
        pivot.position.y = Math.sin(t * 0.8) * 0.28 + scroll * 2.2;
        pivot.position.x = Math.sin(scroll * Math.PI * 2) * 2.6;
        const s = 1 - scroll * 0.35;
        pivot.scale.setScalar(Math.max(0.5, s));
      }

      const arr = geo.attributes.position.array as Float32Array;
      for (let i = 0; i < COUNT; i++) {
        const i3 = i * 3;
        vel[i3 + 1] += 0.00012;
        const dx = arr[i3] - pointer.x;
        const dy = arr[i3 + 1] - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 9 && d2 > 0.0001) {
          const f = (1 - d2 / 9) * 0.02;
          const d = Math.sqrt(d2);
          vel[i3] += (dx / d) * f;
          vel[i3 + 1] += (dy / d) * f;
        }
        vel[i3] *= 0.97;
        vel[i3 + 1] *= 0.97;
        vel[i3 + 2] *= 0.97;
        arr[i3] += vel[i3] + Math.sin(t * 0.3 + i) * 0.0015;
        arr[i3 + 1] += vel[i3 + 1] + 0.004;
        arr[i3 + 2] += vel[i3 + 2];
        if (arr[i3 + 1] > 9) arr[i3 + 1] = -9;
        if (arr[i3] > 12) arr[i3] = -12;
        if (arr[i3] < -12) arr[i3] = 12;
      }
      geo.attributes.position.needsUpdate = true;
      points.rotation.y = t * 0.02;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });

    if (reduce) {
      renderer.render(scene, camera);
    } else {
      raf = requestAnimationFrame(render);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      renderer.dispose();
      geo.dispose();
      sprite.dispose();
      if (cv.parentNode) cv.parentNode.removeChild(cv);
    };
  }, []);

  return <div ref={host} className="story-3d" aria-hidden="true" />;
}

export default BeeSceneCanvas;
