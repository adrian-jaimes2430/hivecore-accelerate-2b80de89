import { createFileRoute, Link } from "@tanstack/react-router";
import { HiveLogo } from "@/components/HiveLogo";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Share2, ShoppingBag, BarChart3, Shield, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "HIVECORE — Plataforma comercial premium para impulsadores" },
      { name: "description", content: "El núcleo comercial digital del ecosistema Company A&O. Catálogo premium, funnels de venta y gestión inteligente de pedidos." },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <HiveLogo />
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground transition">Plataforma</a>
            <a href="#ecosystem" className="hover:text-foreground transition">Ecosistema</a>
            <a href="#metrics" className="hover:text-foreground transition">Métricas</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login"><Button variant="ghost" size="sm">Iniciar sesión</Button></Link>
            <Link to="/login">
              <Button size="sm" className="hive-btn-primary border-0">
                Acceso impulsador <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="hive-grid-bg absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-20 sm:px-6 sm:pt-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/5 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-hive hive-pulse" />
              Plataforma privada · Acceso por aprobación
            </div>
            <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">
              El núcleo comercial<br />
              <span className="hive-gradient-text">de los impulsadores A&O.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Catálogo premium, funnels de venta de alto impacto y gestión inteligente de pedidos.
              Diseñado para una nueva generación de impulsadores de Company A&O Ecosystem.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link to="/login">
                <Button size="lg" className="hive-btn-primary border-0 h-12 px-6 text-base">
                  Entrar a HIVECORE <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="ghost" className="h-12 px-6 text-base border border-border/60 bg-white/5">
                  Ver capacidades
                </Button>
              </a>
            </div>
          </div>

          {/* Hero card */}
          <div className="relative mx-auto mt-20 max-w-5xl">
            <div className="absolute -inset-x-20 -inset-y-10 bg-gradient-to-r from-hive/20 via-ao-red/10 to-anma-orange/20 blur-3xl" />
            <div className="hive-card hive-gradient-border relative overflow-hidden p-2">
              <div className="rounded-xl bg-surface p-6 sm:p-10">
                <div className="grid gap-6 sm:grid-cols-3">
                  {[
                    { c: "from-hive/30 to-hive/5", l: "Catálogo Premium", v: "120+", s: "productos con funnel completo" },
                    { c: "from-ao-red/30 to-ao-red/5", l: "Impulsadores activos", v: "850+", s: "en el ecosistema A&O" },
                    { c: "from-anma-orange/30 to-anma-orange/5", l: "Pedidos generados", v: "12.4k", s: "este trimestre" },
                  ].map((m) => (
                    <div key={m.l} className={`rounded-2xl bg-gradient-to-br ${m.c} border border-white/5 p-5`}>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">{m.l}</p>
                      <p className="mt-2 font-display text-4xl font-bold">{m.v}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{m.s}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="mb-16 max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-hive">Plataforma</p>
          <h2 className="mt-2 font-display text-4xl font-bold sm:text-5xl">
            Todo lo que un impulsador necesita,<br />en una sola plataforma.
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: ShoppingBag, t: "Catálogo Premium", d: "Productos curados con storytelling, beneficios e imágenes verticales listas para compartir." },
            { icon: Sparkles, t: "Funnels de Venta", d: "Cada producto abre una landing premium tipo funnel — no fichas planas." },
            { icon: Share2, t: "Compartir Inteligente", d: "WhatsApp, email y enlace único con tracking por impulsador." },
            { icon: BarChart3, t: "Métricas en tiempo real", d: "Productos más vendidos, impulsadores destacados y actividad reciente." },
            { icon: Zap, t: "Pedidos en segundos", d: "Captura datos del cliente, genera código único y comparte la orden al instante." },
            { icon: Shield, t: "Acceso privado", d: "Solo impulsadores aprobados acceden. Roles granulares para colaboradores." },
          ].map((f) => (
            <div key={f.t} className="hive-card p-6">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-hive/10 text-hive">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{f.t}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Ecosystem */}
      <section id="ecosystem" className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="hive-card hive-gradient-border overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-2">
            <div className="p-10 sm:p-14">
              <p className="text-sm font-medium uppercase tracking-wider text-anma-orange">A&O Ecosystem</p>
              <h2 className="mt-2 font-display text-4xl font-bold">Tres marcas. Un mismo núcleo.</h2>
              <p className="mt-4 text-muted-foreground">
                HIVECORE unifica el ecosistema comercial de Company A&O para impulsadores que venden
                Aguaje, NomadHive y ANMA — con la misma experiencia premium para todos.
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                {[
                  { l: "A&O", c: "bg-ao-red/20 text-ao-red border-ao-red/30" },
                  { l: "NomadHive", c: "bg-hive/20 text-hive border-hive/30" },
                  { l: "ANMA", c: "bg-anma-orange/20 text-anma-orange border-anma-orange/30" },
                ].map((b) => (
                  <span key={b.l} className={`rounded-full border px-3 py-1 text-xs font-medium ${b.c}`}>
                    {b.l}
                  </span>
                ))}
              </div>
            </div>
            <div className="relative min-h-[300px] bg-gradient-to-br from-hive/20 via-ao-red/10 to-anma-orange/20 p-10">
              <div className="absolute inset-0 hive-grid-bg opacity-50" />
              <div className="relative flex h-full items-center justify-center">
                <div className="hive-float">
                  <HiveLogo size={140} withText={false} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6">
        <h2 className="font-display text-4xl font-bold sm:text-5xl">
          ¿Eres impulsador aprobado?
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Ingresa a tu cuenta y accede al catálogo completo del ecosistema.
        </p>
        <Link to="/login">
          <Button size="lg" className="hive-btn-primary mt-8 h-12 border-0 px-8 text-base">
            Acceder a HIVECORE <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </section>

      <footer className="border-t border-border/40 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <HiveLogo size={24} />
          <p>© {new Date().getFullYear()} Company A&O Ecosystem · Plataforma privada</p>
        </div>
      </footer>
    </div>
  );
}
