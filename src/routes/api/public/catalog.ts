import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

export const Route = createFileRoute("/api/public/catalog")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async () => {
        const { loadPublicCatalog } = await import("@/lib/public-catalog.server");
        const data = await loadPublicCatalog();
        return Response.json(data, {
          headers: { ...cors, "Cache-Control": "public, max-age=60, s-maxage=300" },
        });
      },
    },
  },
});
