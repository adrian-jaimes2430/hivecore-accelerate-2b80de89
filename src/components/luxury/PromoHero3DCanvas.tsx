import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Promo } from "./PromoCarousel";

/**
 * Abanico 3D frontal. La tarjeta activa permanece grande y visible; las
 * laterales conservan profundidad y responden al puntero o al arrastre.
 */
export function PromoHero3DCanvas({ promos, active, onActiveChange }: { promos: Promo[]; active: number; onActiveChange: (index: number) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  const onChangeRef = useRef(onActiveChange);

  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { onChangeRef.current = onActiveChange; }, [onActiveChange]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.innerWidth < 640;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    camera.position.set(0, 0.1, mobile ? 10.8 : 9.6);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !mobile, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, { width: "100%", height: "100%", display: "block" });

    scene.add(new THREE.AmbientLight(0xffffff, 1.35));
    const key = new THREE.DirectionalLight(0xffe3a8, 1.8);
    key.position.set(3, 5, 7);
    scene.add(key);

    const sources = promos.filter((p) => p.media_url).slice(0, mobile ? 6 : 9);

    const fan = new THREE.Group();
    scene.add(fan);

    const disposables: { dispose: () => void }[] = [];
    const videos: HTMLVideoElement[] = [];
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");

    const cards: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; index: number; ready: boolean }[] = [];

    for (let i = 0; i < sources.length; i += 1) {
      const src = sources[i];
      const geo = new THREE.PlaneGeometry(mobile ? 3.8 : 4.5, mobile ? 4.8 : 5.5, 1, 1);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x171319,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });
      disposables.push(geo, mat);

      const mesh = new THREE.Mesh(geo, mat);
      fan.add(mesh);
      const card = { mesh, mat, index: i, ready: false };
      cards.push(card);

      if (src?.media_url) {
        if (src.media_type === "video" && !mobile) {
          const v = document.createElement("video");
          v.src = src.media_url;
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
          loader.loadAsync(src.media_url).then(
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

    const pointer = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      target.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    };
    el.addEventListener("pointermove", onMove, { passive: true });

    let downX: number | null = null;
    const onDown = (event: PointerEvent) => { downX = event.clientX; };
    const onUp = (event: PointerEvent) => {
      if (downX == null || sources.length < 2) return;
      const distance = event.clientX - downX;
      downX = null;
      if (Math.abs(distance) < 38) return;
      const next = distance < 0 ? activeRef.current + 1 : activeRef.current - 1;
      onChangeRef.current((next + sources.length) % sources.length);
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);

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
    let previous = performance.now();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      const dt = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      if (!visible) return;

      const smooth = 1 - Math.exp(-7 * dt);
      pointer.x += (target.x - pointer.x) * smooth;
      pointer.y += (target.y - pointer.y) * smooth;
      fan.rotation.y += ((reduce ? 0 : pointer.x * 0.045) - fan.rotation.y) * smooth;
      fan.rotation.x += ((reduce ? 0 : pointer.y * 0.025) - fan.rotation.x) * smooth;
      camera.position.y += ((-pointer.y * 0.12) - camera.position.y) * smooth;
      camera.lookAt(0, 0, 0);

      for (const c of cards) {
        let offset = c.index - activeRef.current;
        if (offset > sources.length / 2) offset -= sources.length;
        if (offset < -sources.length / 2) offset += sources.length;
        const shown = Math.abs(offset) <= (mobile ? 1 : 2);
        const targetX = offset * (mobile ? 2.65 : 3.35);
        const targetZ = -Math.abs(offset) * 1.45;
        const targetY = -Math.abs(offset) * 0.18;
        c.mesh.position.x += (targetX - c.mesh.position.x) * smooth;
        c.mesh.position.y += (targetY - c.mesh.position.y) * smooth;
        c.mesh.position.z += (targetZ - c.mesh.position.z) * smooth;
        c.mesh.rotation.y += ((offset * -0.24) - c.mesh.rotation.y) * smooth;
        c.mesh.rotation.z += ((offset * -0.035) - c.mesh.rotation.z) * smooth;
        const scale = offset === 0 ? 1 : 0.82;
        const nextScale = c.mesh.scale.x + (scale - c.mesh.scale.x) * smooth;
        c.mesh.scale.setScalar(nextScale);
        const opacity = shown ? (offset === 0 ? 1 : 0.58) : 0;
        c.mat.opacity += (((c.ready ? opacity : opacity * 0.35)) - c.mat.opacity) * smooth;
        c.mesh.visible = c.mat.opacity > 0.015;
      }

      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      for (const v of videos) {
        v.pause();
        v.src = "";
      }
      for (const d of disposables) d.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [promos]);

  return <div ref={host} className="absolute inset-0 cursor-grab active:cursor-grabbing" aria-hidden="true" />;
}

export default PromoHero3DCanvas;
