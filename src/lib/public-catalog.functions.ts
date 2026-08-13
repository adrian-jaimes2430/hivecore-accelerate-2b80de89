import { createServerFn } from "@tanstack/react-start";

export const listPublicCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const { loadPublicCatalog } = await import("@/lib/public-catalog.server");
  return loadPublicCatalog();
});
