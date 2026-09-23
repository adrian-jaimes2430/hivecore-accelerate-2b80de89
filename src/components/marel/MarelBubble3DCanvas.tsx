import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import marelModel from "@/assets/marel-chat-model.glb.asset.json";

/** Modelo 3D flotante de Marel que conserva los materiales del archivo original. */
export function MarelBubble3DCanvas() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
    camera.position.set(0, 0, 4.8);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.45;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = environment.texture;

    scene.add(new THREE.AmbientLight(0xffffff, 1.8));
    scene.add(new THREE.HemisphereLight(0xeaffd8, 0x12351f, 3.4));
    const key = new THREE.DirectionalLight(0xffffff, 5.2);
    key.position.set(3, 4, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x72ffab, 4.2);
    rim.position.set(-4, 1, -2);
    scene.add(rim);
    const front = new THREE.PointLight(0xb9ff9d, 5.5, 12);
    front.position.set(0, 0.5, 4);
    scene.add(front);

    const group = new THREE.Group();
    scene.add(group);

    let model: THREE.Object3D | null = null;
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(marelModel.url, (gltf) => {
      model = gltf.scene;
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const longestSide = Math.max(size.x, size.y, size.z);
      const scale = 3.45 / (longestSide || 1);
      model.position.set(-center.x, -center.y, -center.z);
      model.scale.setScalar(scale);
      model.rotation.x = -0.04;
      model.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = false;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material) => {
          if ("envMapIntensity" in material) {
            const standard = material as THREE.MeshStandardMaterial;
            standard.envMapIntensity = 2.2;
            standard.roughness = Math.max(standard.roughness, 0.28);
            standard.needsUpdate = true;
          }
        });
      });
      group.add(model);
    });

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
      // El modelo es casi plano: conservarlo frontal evita que desaparezca de perfil.
      const idleTurn = reduce ? 0 : Math.sin(t * 0.85) * 0.1;
      group.rotation.y = pointer.x * 0.14 + idleTurn;
      group.rotation.x = pointer.y * 0.08;
      if (!reduce) {
        group.position.y = Math.sin(t * 1.8) * 0.1;
        group.rotation.z = Math.sin(t * 1.25) * 0.055;
      }
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      if (model) {
        model.traverse((object) => {
          const mesh = object as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry.dispose();
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((material) => material.dispose());
        });
      }
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={host} className="absolute inset-0" aria-hidden="true" />;
}

export default MarelBubble3DCanvas;
