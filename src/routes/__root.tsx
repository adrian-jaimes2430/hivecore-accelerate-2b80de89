import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { GlobalMetaPixel } from "@/components/marketing/MetaPixel";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="hive-card max-w-md p-10 text-center">
        <h1 className="hive-gradient-text text-7xl font-bold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Página no encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La ruta no existe en el ecosistema HIVECORE.
        </p>
        <div className="mt-6">
          <Link to="/" className="hive-btn-primary inline-flex h-10 items-center justify-center rounded-md px-5 text-sm">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="hive-card max-w-md p-10 text-center">
        <h1 className="text-xl font-semibold">Algo salió mal</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="hive-btn-primary inline-flex h-10 items-center rounded-md px-5 text-sm"
          >
            Reintentar
          </button>
          <a href="/" className="inline-flex h-10 items-center rounded-md border border-border bg-white/5 px-5 text-sm hover:bg-white/10">
            Inicio
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "HIVECORE — Plataforma comercial premium A&O Ecosystem" },
      { name: "description", content: "Plataforma comercial inteligente para impulsadores del ecosistema Company A&O. Catálogo premium, funnels de venta y gestión de pedidos." },
      { property: "og:title", content: "HIVECORE — Plataforma comercial premium A&O Ecosystem" },
      { property: "og:description", content: "Plataforma comercial inteligente para impulsadores del ecosistema Company A&O. Catálogo premium, funnels de venta y gestión de pedidos." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "HIVECORE — Plataforma comercial premium A&O Ecosystem" },
      { name: "twitter:description", content: "Plataforma comercial inteligente para impulsadores del ecosistema Company A&O. Catálogo premium, funnels de venta y gestión de pedidos." },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
