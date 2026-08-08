import { createFileRoute, Link } from "@tanstack/react-router";
import { HiveLogo } from "@/components/HiveLogo";
import {
  ArrowRight,
  Sparkles,
  Share2,
  ShoppingBag,
  BarChart3,
  Shield,
  Zap,
} from "lucide-react";
import heroImage from "@/assets/mercury-hero.jpg";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "HIVECORE — Plataforma comercial premium para impulsadores" },
      {
        name: "description",
        content:
          "El núcleo comercial digital del ecosistema Company A&O. Catálogo premium, funnels de venta y gestión inteligente de pedidos.",
      },
      { property: "og:title", content: "HIVECORE — Plataforma comercial premium" },
      {
        property: "og:description",
        content:
          "Catálogo premium, funnels de venta de alto impacto y gestión inteligente de pedidos para impulsadores A&O.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const NAV = [
  { l: "Plataforma", h: "#features" },
  { l: "Ecosistema", h: "#ecosystem" },
  { l: "Catálogo", h: "/catalogo" },
];

const FEATURES = [
  { icon: ShoppingBag, t: "Catálogo Premium", d: "Productos curados con storytelling, beneficios e imágenes verticales listas para compartir." },
  { icon: Sparkles, t: "Funnels de Venta", d: "Cada producto abre una landing premium tipo funnel — no fichas planas." },
  { icon: Share2, t: "Compartir Inteligente", d: "WhatsApp, email y enlace único con tracking por impulsador." },
  { icon: BarChart3, t: "Métricas en tiempo real", d: "Productos más vendidos, impulsadores destacados y actividad reciente." },
  { icon: Zap, t: "Pedidos en segundos", d: "Captura los datos del cliente, genera el código único y despacha la orden al instante." },
  { icon: Shield, t: "Acceso privado", d: "Solo impulsadores aprobados acceden. Roles granulares para colaboradores." },
];

function Landing() {
  return (
    <div className="mercury-page min-h-screen">
      {/* Nav — transparent over hero, frosted on scroll */}
      <header className="sticky top-0 z-50 bg-[color:var(--onyx-canvas)]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-5">
          <HiveLogo />
          <nav className="hidden items-center md:flex">
            {NAV.map((n) =>
              n.h.startsWith("#") ? (
                <a key={n.l} href={n.h} className="mercury-nav-link link-sweep">
                  {n.l}
                </a>
              ) : (
                <Link key={n.l} to={n.h} className="mercury-nav-link link-sweep">
                  {n.l}
                </Link>
              ),
            )}
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="mercury-nav-link link-sweep hidden sm:inline-flex">
              Iniciar sesión
            </Link>
            <Link to="/login" className="mercury-btn">
              Acceso impulsador
            </Link>
          </div>
        </div>
      </header>

      {/* Full-bleed photographic hero */}
      <section className="relative isolate min-h-[86vh] w-full overflow-hidden">
        <img
          src={heroImage}
          alt="Cordillera con niebla al atardecer"
          width={1920}
          height={1088}
          className="hero-drift absolute inset-0 -z-10 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-[color:var(--onyx-canvas)]/70" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-[color:var(--onyx-canvas)] to-transparent" />

        <div className="mx-auto flex min-h-[86vh] max-w-[1200px] flex-col items-center justify-center px-5 py-28 text-center">
          <span className="mercury-tag animate-rise" style={{ animationDelay: "80ms" }}>
            <span className="hive-pulse h-1.5 w-1.5 rounded-full bg-[color:var(--cobalt)]" />
            Plataforma privada · Acceso por aprobación
          </span>
          <h1
            className="mercury-display animate-rise mt-8 max-w-[720px] text-[42px] text-white sm:text-[65px]"
            style={{ animationDelay: "200ms" }}
          >
            El núcleo comercial de los impulsadores A&amp;O
          </h1>
          <p
            className="mercury-body animate-rise mt-6 max-w-[520px] text-[18px] leading-[1.35]"
            style={{ animationDelay: "340ms" }}
          >
            Catálogo premium, funnels de alto impacto y gestión inteligente de
            pedidos — en una sola plataforma para el ecosistema Company A&amp;O.
          </p>
          <div
            className="animate-rise mt-10 flex flex-wrap items-center justify-center gap-4"
            style={{ animationDelay: "470ms" }}
          >
            <Link to="/login" className="mercury-btn">
              <span>Entrar a HIVECORE</span> <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/catalogo" className="mercury-ghost">
              Ver el catálogo
            </Link>
          </div>
        </div>
      </section>

      {/* Metrics — graphite cards on onyx */}
      <section className="mercury-section px-5">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { l: "Catálogo premium", v: "120+", s: "productos con funnel completo" },
            { l: "Impulsadores activos", v: "850+", s: "en el ecosistema A&O" },
            { l: "Pedidos generados", v: "12.4k", s: "este trimestre" },
          ].map((m, i) => (
            <Reveal key={m.l} className="mercury-card" delay={i * 110} from="up">
              <p className="mercury-muted text-[12px] tracking-[0.12px]">{m.l}</p>
              <p className="mercury-heading mt-4 text-[42px] text-[color:var(--ivory-text)]">
                {m.v}
              </p>
              <p className="mercury-muted mt-2 text-[14px]">{m.s}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mercury-section px-5">
        <Reveal>
          <p className="mercury-muted text-[12px] uppercase tracking-[0.12px]">Plataforma</p>
          <h2 className="mercury-heading mt-3 max-w-[640px] text-[32px] text-[color:var(--ivory-text)] sm:text-[42px]">
            Todo lo que un impulsador necesita, en una sola plataforma.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.t} className="mercury-card group" delay={(i % 3) * 100} from="up">
              <f.icon className="h-5 w-5 text-[color:var(--ivory-text)] transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:scale-110" />
              <h3 className="mercury-heading mt-6 text-[21px] text-[color:var(--ivory-text)]">
                {f.t}
              </h3>
              <p className="mercury-body mercury-muted mt-3">{f.d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Ecosystem */}
      <section id="ecosystem" className="mercury-section px-5">
        <Reveal className="mercury-card grid gap-10 lg:grid-cols-2 lg:p-14" from="scale">
          <div>
            <p className="mercury-muted text-[12px] uppercase tracking-[0.12px]">
              A&amp;O Ecosystem
            </p>
            <h2 className="mercury-heading mt-3 text-[32px] text-[color:var(--ivory-text)] sm:text-[42px]">
              Tres marcas. Un mismo núcleo.
            </h2>
            <p className="mercury-body mercury-muted mt-6 max-w-[480px]">
              HIVECORE unifica el ecosistema comercial de Company A&amp;O para
              impulsadores que venden Aguaje, NomadHive y ANMA — con la misma
              experiencia premium para todos.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {["A&O", "NomadHive", "ANMA"].map((b) => (
                <span key={b} className="mercury-tag">
                  {b}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-center rounded-xl bg-[color:var(--obsidian-button)] py-14">
            <div className="hive-float">
              <HiveLogo size={140} withText={false} />
            </div>
          </div>
        </Reveal>
      </section>

      {/* CTA */}
      <section className="mercury-section px-5 text-center">
        <Reveal>
          <h2 className="mercury-heading text-[32px] text-[color:var(--ivory-text)] sm:text-[42px]">
            ¿Eres impulsador aprobado?
          </h2>
          <p className="mercury-body mercury-muted mx-auto mt-5 max-w-[520px]">
            Ingresa a tu cuenta y accede al catálogo completo del ecosistema.
          </p>
          <div className="mt-10">
            <Link to="/login" className="mercury-btn">
              <span>Acceder a HIVECORE</span> <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
      </section>


      <footer className="border-t border-white/5 py-10">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 px-5 text-[12px] tracking-[0.12px] text-[color:var(--ash-text)] sm:flex-row">
          <HiveLogo size={24} />
          <p>© {new Date().getFullYear()} Company A&amp;O Ecosystem · Plataforma privada</p>
        </div>
      </footer>
    </div>
  );
}
