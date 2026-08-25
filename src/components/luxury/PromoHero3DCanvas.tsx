import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Promo } from "./PromoCarousel";

/**
 * Lienzo three.js del banner superior: tarjetas de producto flotando en 3D
 * con parallax por puntero (estilo shop.app). Solo se carga en el navegador.
 */
export function PromoHero3DCanvas({ promos }: { promos: Promo[] }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 9);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const key = new THREE.DirectionalLight(0xffe9b0, 1.4);
    key.position.set(3, 4, 6);
    scene.add(key);

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");

    const media = promos.filter((p) => p.media_url).slice(0, 8);
    const sources = media.length > 0 ? media : [];
    const group = new THREE.Group();
    scene.add(group);

    const disposables: { dispose: () => void }[] = [];
    const videos: HTMLVideoElement[] = [];
    const cards: { mesh: THREE.Mesh; seed: number; baseY: number }[] = [];

    const count = Math.max(sources.length, 5);
    for (let i = 0; i < count; i += 1) {
      const src = sources[i % Math.max(sources.length, 1)];
      const geo = new THREE.PlaneGeometry(2.1, 2.7, 1, 1);
      let map: THREE.Texture | null = null;

      if (src?.media_url) {
        if (src.media_type === "video") {
          const v = document.createElement("video");
          v.src = src.media_url;
          v.muted = true;
          v.loop = true;
          v.playsInline = true;
          v.crossOrigin = "anonymous";
          void v.play().catch(() => undefined);
          videos.push(v);
          map = new THREE.VideoTexture(v);
        } else {
          map = loader.load(src.media_url);
        }
        if (map) {
          map.colorSpace = THREE.SRGBColorSpace;
          disposables.push(map);
        }
      }

      const mat = new THREE.MeshStandardMaterial({
        map: map ?? null,
        color: map ? 0xffffff : 0x141018,
        roughness: 0.42,
        metalness: 0.22,
        transparent: true,
        opacity: 0.98,
      });
      disposables.push(geo, mat);

      const mesh = new THREE.Mesh(geo, mat);
      const spread = count > 1 ? (i / (count - 1)) * 2 - 1 : 0;
      mesh.position.set(spread * 4.6, (i % 2 === 0 ? 0.35 : -0.45) + Math.sin(i) * 0.25, 0.6 - Math.abs(spread) * 1.6);
      mesh.rotation.y = -spread * 0.5;
      mesh.rotation.z = spread * 0.06;
      group.add(mesh);
      cards.push({ mesh, seed: i * 1.7, baseY: mesh.position.y });
    }

    const pointer = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      target.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    };
    el.addEventListener("pointermove", onMove);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = w < 640 ? 60 : 45;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    let raf = 0;
    const clock = new THREE.Clock();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = clock.getElapsedTime();
      pointer.x += (target.x - pointer.x) * 0.06;
      pointer.y += (target.y - pointer.y) * 0.06;

      group.rotation.y = pointer.x * 0.22;
      group.rotation.x = pointer.y * 0.1;
      group.position.x = -pointer.x * 0.6;

      if (!reduce) {
        for (const c of cards) {
          c.mesh.position.y = c.baseY + Math.sin(t * 0.7 + c.seed) * 0.22;
          c.mesh.rotation.x = Math.sin(t * 0.4 + c.seed) * 0.05;
        }
      }
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("pointermove", onMove);
      for (const v of videos) {
        v.pause();
        v.src = "";
      }
      for (const d of disposables) d.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [promos]);

  return <div ref={host} className="absolute inset-0" aria-hidden="true" />;
}

export default PromoHero3DCanvas;
