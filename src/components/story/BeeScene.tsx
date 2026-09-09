import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";

const Canvas = lazy(() => import("./BeeSceneCanvas"));

/** Carga la escena 3D del logo solo en el navegador. */
export function BeeScene() {
  return (
    <ClientOnly fallback={null}>
      <Suspense fallback={null}>
        <Canvas />
      </Suspense>
    </ClientOnly>
  );
}
