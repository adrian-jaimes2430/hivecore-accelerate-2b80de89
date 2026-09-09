import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Promo } from "./PromoCarousel";

type Src = { url: string; type: string };

/**
 * Banner 3D del catálogo Luxury: carrusel cilíndrico de tarjetas con
 * rotación continua, parallax de puntero, reflejo inferior y aparición
 * progresiva de cada textura (sin bloquear la carga del catálogo).
 */
export function PromoHero3DCanvas({ promos, images = [] }: { promos: Promo[]; images?: string[] }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.innerWidth < 640;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    camera.position.set(0, 0.35, mobile ? 12.5 : 10.5);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !mobile, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, { width: "100%", height: "100%", display: "block" });

    scene.add(new THREE.AmbientLight(0xffffff, 1.15));
    const key = new THREE.DirectionalLight(0xffe3a8, 1.5);
    key.position.set(3, 5, 7);
    scene.add(key);

    const promoSrc: Src[] = promos
      .filter((p) => p.media_url)
      .map((p) => ({ url: p.media_url as string, type: p.media_type }));
    const imgSrc: Src[] = images.map((u) => ({ url: u, type: "image" }));
    const sources = [...promoSrc, ...imgSrc].slice(0, mobile ? 7 : 11);

    const ring = new THREE.Group();
    scene.add(ring);

    const disposables: { dispose: () => void }[] = [];
    const videos: HTMLVideoElement[] = [];
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");

    const count = Math.max(sources.length, 6);
    const radius = mobile ? 7.4 : 8.6;
    const cards: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; angle: number; seed: number; fade: number; ready: boolean }[] = [];

    for (let i = 0; i < count; i += 1) {
      const src = sources[i % Math.max(sources.length, 1)];
      const geo = new THREE.PlaneGeometry(2.5, 3.2, 1, 1);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x191320,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
      });
      disposables.push(geo, mat);

      const mesh = new THREE.Mesh(geo, mat);
      const angle = (i / count) * Math.PI * 2;
      mesh.position.set(Math.sin(angle) * radius, (i % 3 - 1) * 0.55, Math.cos(angle) * radius - radius + 1.2);
      mesh.rotation.y = -angle;
      ring.add(mesh);
      const card = { mesh, mat, angle, seed: i * 1.63, fade: 0, ready: false };
      cards.push(card);

      if (src?.url) {
        if (src.type === "video" && !mobile) {
          const v = document.createElement("video");
          v.src = src.url;
          v.muted = true;
          v.loop = true;
          v.playsInline = true;
          v.crossOrigin = "anonymous";
          void v.play().catch(() => undefined);
          videos.push(v);
          const tex = new THREE.VideoTexture(v);
          tex.colorSpace = THREE.SRGBColorSpace;
          disposables.push(tex);
          mat.map = tex;
          mat.color.set(0xffffff);
          mat.needsUpdate = true;
          card.ready = true;
        } else {
          loader.loadAsync(src.url).then(
            (tex) => {
              tex.colorSpace = THREE.SRGBColorSpace;
              tex.generateMipmaps = true;
              disposables.push(tex);
              mat.map = tex;
              mat.color.set(0xffffff);
              mat.needsUpdate = true;
              card.ready = true;
            },
            () => undefined,
          );
        }
      }
    }

    // Piso reflectante suave
    const floorGeo = new THREE.PlaneGeometry(60, 24);
    const floorMat = new THREE.MeshBasicMaterial({ color: 0x0a0a10, transparent: true, opacity: 0.55 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3.1;
    scene.add(floor);
    disposables.push(floorGeo, floorMat);

    const pointer = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      target.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    };
    el.addEventListener("pointermove", onMove, { passive: true });

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = w < 640 ? 56 : 42;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    let visible = true;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(el);

    let raf = 0;
    let spin = 0;
    const clock = new THREE.Clock();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      if (!visible) return;

      pointer.x += (target.x - pointer.x) * 0.05;
      pointer.y += (target.y - pointer.y) * 0.05;

      if (!reduce) spin += dt * 0.14;
      ring.rotation.y = spin + pointer.x * 0.3;
      ring.rotation.x = pointer.y * 0.06;
      camera.position.y = 0.35 - pointer.y * 0.35;
      camera.lookAt(0, 0, 0);

      for (const c of cards) {
        if (!reduce) {
          c.mesh.position.y = (Math.round((c.seed % 3)) - 1) * 0.55 + Math.sin(t * 0.6 + c.seed) * 0.2;
          c.mesh.rotation.z = Math.sin(t * 0.3 + c.seed) * 0.03;
        }
        // aparición progresiva y desvanecido por profundidad
        const worldZ = c.mesh.getWorldPosition(new THREE.Vector3()).z;
        const depth = THREE.MathUtils.clamp((worldZ + 14) / 18, 0.12, 1);
        const goal = (c.ready ? 1 : 0.55) * depth;
        c.fade += (goal - c.fade) * 0.08;
        c.mat.opacity = c.fade;
      }

      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      el.removeEventListener("pointermove", onMove);
      for (const v of videos) {
        v.pause();
        v.src = "";
      }
      for (const d of disposables) d.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [promos, images]);

  return <div ref={host} className="absolute inset-0" aria-hidden="true" />;
}

export default PromoHero3DCanvas;
