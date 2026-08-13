import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

const ALLOWED_HOST_SUFFIX = ".supabase.co";

function resolveTarget(request: Request): URL | null {
  const raw = new URL(request.url).searchParams.get("u");
  if (!raw) return null;
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return null;
  }
  if (target.protocol !== "https:") return null;
  if (!target.hostname.endsWith(ALLOWED_HOST_SUFFIX)) return null;
  if (!target.pathname.includes("/storage/v1/object/public/")) return null;
  return target;
}

async function proxy(request: Request, method: "GET" | "HEAD") {
  const target = resolveTarget(request);
  if (!target) return new Response("Invalid image url", { status: 400, headers: cors });

  const upstream = await fetch(target.toString(), { method, redirect: "follow" });
  if (!upstream.ok) {
    return new Response("Image not found", { status: upstream.status, headers: cors });
  }

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
  const headers: Record<string, string> = {
    ...cors,
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
  };
  const len = upstream.headers.get("content-length");
  if (len) headers["Content-Length"] = len;

  return new Response(method === "HEAD" ? null : upstream.body, { status: 200, headers });
}

export const Route = createFileRoute("/api/public/media")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      HEAD: async ({ request }) => proxy(request, "HEAD"),
      GET: async ({ request }) => proxy(request, "GET"),
    },
  },
});
