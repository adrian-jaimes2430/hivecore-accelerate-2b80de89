import { useEffect, useRef } from "react";
import * as THREE from "three";

/** Globo de conversación 3D (three.js) que late suavemente y reacciona al puntero. */
export function MarelBubble3DCanvas() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
    camera.position.set(0, 0, 4.2);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(2, 3, 4);
    scene.add(light);

    const group = new THREE.Group();
    scene.add(group);

    const geo = new THREE.SphereGeometry(1.15, 48, 48);
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xc7f384,
      roughness: 0.18,
      metalness: 0.25,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      emissive: 0x2f4a12,
      emissiveIntensity: 0.35,
    });
    const bubble = new THREE.Mesh(geo, mat);
    group.add(bubble);

    // Tres puntos de "escribiendo" dentro del globo
    const dotGeo = new THREE.SphereGeometry(0.13, 20, 20);
    const dotMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 });
    const dots: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i += 1) {
      const d = new THREE.Mesh(dotGeo, dotMat);
      d.position.set((i - 1) * 0.42, 0, 1.02);
      group.add(d);
      dots.push(d);
    }

    // Colita del globo
    const tailGeo = new THREE.ConeGeometry(0.32, 0.6, 24);
    const tail = new THREE.Mesh(tailGeo, mat);
    tail.position.set(-0.55, -1.05, 0.35);
    tail.rotation.set(0.4, 0, 0.7);
    group.add(tail);

    const pointer = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      target.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
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
      pointer.x += (target.x - pointer.x) * 0.05;
      pointer.y += (target.y - pointer.y) * 0.05;
      group.rotation.y = pointer.x * 0.5;
      group.rotation.x = pointer.y * 0.3;
      if (!reduce) {
        const pulse = 1 + Math.sin(t * 1.8) * 0.035;
        bubble.scale.setScalar(pulse);
        dots.forEach((d, i) => {
          d.position.y = Math.sin(t * 3 + i * 0.8) * 0.1;
        });
      }
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      geo.dispose();
      dotGeo.dispose();
      tailGeo.dispose();
      mat.dispose();
      dotMat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={host} className="absolute inset-0" aria-hidden="true" />;
}

export default MarelBubble3DCanvas;
