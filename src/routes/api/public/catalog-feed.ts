import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/catalog-feed")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*" } }),
      GET: async () => {
        const { loadPublicCatalog, buildProductXmlFeed } = await import("@/lib/public-catalog.server");
        const xml = buildProductXmlFeed(await loadPublicCatalog());
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=60, s-maxage=300",
          },
        });
      },
    },
  },
});
