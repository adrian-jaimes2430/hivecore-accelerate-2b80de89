import { createFileRoute, Link } from "@tanstack/react-router";
import { HiveLogo } from "@/components/HiveLogo";
import { StoryVideo } from "@/components/story/StoryVideo";
import { SmokeLayer } from "@/components/story/SmokeLayer";
import { BeeScene } from "@/components/story/BeeScene";
import { StoryPanel } from "@/components/story/StoryPanel";
import { useScrollProgress } from "@/hooks/use-scroll-progress";

import {
  ArrowRight,
  Sparkles,
  Share2,
  ShoppingBag,
  BarChart3,
  Shield,
  Zap,
  Crown,
  Bot,
  Trophy,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "HIVECORE — Experiencia inmersiva del ecosistema A&O" },
      {
        name: "description",
        content:
          "Recorre en scroll la historia de HIVECORE: catálogo premium, funnels de alto impacto, AnMa Luxury, Marel IA y niveles de impulsador en una experiencia 3D inmersiva.",
      },
      { property: "og:title", content: "HIVECORE — Experiencia inmersiva del ecosistema A&O" },
      {
        property: "og:description",
        content:
          "Historia inmersiva en 3D: catálogo premium, funnels, AnMa Luxury, Marel IA y niveles de impulsador.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "HIVECORE — Experiencia inmersiva del ecosistema A&O" },
      {
        name: "twitter:description",
        content:
          "Historia inmersiva en 3D: catálogo premium, funnels, AnMa Luxury, Marel IA y niveles de impulsador.",
      },
    ],
  }),
});

const NAV = [
  { l: "Historia", h: "#capitulo-1" },
  { l: "Plataforma", h: "#capitulo-2" },
  { l: "Luxury", h: "#capitulo-3" },
  { l: "Catálogo", h: "/catalogo" },
];

const FEATURES = [
  { icon: ShoppingBag, t: "Catálogo Premium", d: "Productos curados con storytelling y media vertical." },
  { icon: Sparkles, t: "Funnels de Venta", d: "Cada producto abre una landing tipo funnel, no una ficha plana." },
  { icon: Share2, t: "Compartir Inteligente", d: "WhatsApp, email y enlace único con tracking por impulsador." },
  { icon: BarChart3, t: "Métricas en vivo", d: "Más vendidos, impulsadores destacados y actividad reciente." },
  { icon: Zap, t: "Pedidos en segundos", d: "Datos del cliente, código único y orden despachada al instante." },
  { icon: Shield, t: "Acceso privado", d: "Solo impulsadores aprobados. Roles y niveles granulares." },
];

const LEVELS = ["Junior", "Senior", "Master", "Elite"];

function Landing() {
  const { progress } = useScrollProgress();

  return (
    <div className="story-root">
      <div className="story-progress" style={{ width: `${progress * 100}%` }} />

      {/* Capas inmersivas: video → 3D → humo */}
      <StoryVideo />
      <BeeScene />
      <SmokeLayer />

      <div className="story-content">
        <header className="sticky top-0 z-50">
          <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between px-5">
            <HiveLogo />
            <nav className="hidden items-center gap-1 md:flex">
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
            <Link to="/login" className="story-cta !px-5 !py-2 !text-[13px]">
              Acceso impulsador
            </Link>
          </div>
        </header>

        {/* Apertura */}
        <section className="story-hero">
          <span className="story-pill">
            <span className="hive-pulse h-1.5 w-1.5 rounded-full bg-[color:var(--hive)]" />
            Plataforma privada · Ecosistema A&amp;O
          </span>
          <h1 className="story-hero-title mt-8 max-w-[16ch]">
            El núcleo <span>vivo</span> del comercio A&amp;O
          </h1>
          <p className="story-lead mt-7 max-w-[52ch]">
            Desplázate y recorre la historia: catálogo, funnels, luxury, inteligencia y
            niveles — todo dentro de un mismo organismo comercial.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/login" className="story-cta">
              Entrar a HIVECORE <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/catalogo" className="story-ghost-cta">
              Ver el catálogo
            </Link>
          </div>
          <span className="story-scroll-hint">Scroll para comenzar</span>
        </section>

        {/* Capítulo 1 — el enjambre */}
        <div id="capitulo-1">
          <StoryPanel
            index="01"
            eyebrow="El enjambre"
            title={
              <>
                Cientos de impulsadores,
                <br />
                un solo movimiento.
              </>
            }
          >
            <p className="story-lead">
              HIVECORE conecta a cada impulsador con el catálogo completo del ecosistema
              Company A&amp;O. La misma experiencia premium, el mismo pulso, en cualquier
              dispositivo.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                { v: "120+", s: "productos con funnel" },
                { v: "850+", s: "impulsadores activos" },
                { v: "12.4k", s: "pedidos generados" },
              ].map((m) => (
                <div key={m.s} className="story-tile">
                  <p className="font-display text-[28px] font-bold leading-none">{m.v}</p>
                  <p className="mt-2 text-[12px] text-white/60">{m.s}</p>
                </div>
              ))}
            </div>
          </StoryPanel>
        </div>

        {/* Capítulo 2 — la plataforma */}
        <div id="capitulo-2">
          <StoryPanel
            index="02"
            eyebrow="La plataforma"
            align="right"
            title="Todo lo que necesitas para vender, en un solo núcleo."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <div key={f.t} className="story-tile group">
                  <f.icon className="h-4.5 w-4.5 text-[color:var(--hive)] transition-transform duration-500 group-hover:scale-110" />
                  <h3 className="mt-3 font-display text-[15px] font-semibold">{f.t}</h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/60">{f.d}</p>
                </div>
              ))}
            </div>
          </StoryPanel>
        </div>

        {/* Capítulo 3 — luxury */}
        <div id="capitulo-3">
          <StoryPanel
            index="03"
            eyebrow="AnMa Luxury Collection"
            title="Cuando el catálogo se vuelve alta gama."
          >
            <p className="story-lead">
              Perfumería, relojería, joyería AAA y marroquinería de autor. Un catálogo
              paralelo con su propia estética, disponible al ascender de nivel.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              {["A&O", "NomadHive", "ANMA"].map((b) => (
                <span key={b} className="story-pill">
                  {b}
                </span>
              ))}
            </div>
            <div className="mt-7">
              <Link to="/catalogo" className="story-ghost-cta">
                <Crown className="h-4 w-4 text-[color:var(--hive)]" /> Explorar colección
              </Link>
            </div>
          </StoryPanel>
        </div>

        {/* Capítulo 4 — Marel IA */}
        <StoryPanel
          index="04"
          eyebrow="Marel · Inteligencia interna"
          align="center"
          title="Una IA que conoce tu catálogo de memoria."
        >
          <p className="story-lead mx-auto max-w-[46ch]">
            Marel acompaña al impulsador y al cliente: encuentra productos, arma el
            argumento de venta y, cuando hace falta, entrega la conversación al
            impulsador correcto por WhatsApp.
          </p>
          <div className="mt-7 flex justify-center">
            <span className="story-pill">
              <Bot className="h-3.5 w-3.5 text-[color:var(--hive)]" /> Asistente 24/7
            </span>
          </div>
        </StoryPanel>

        {/* Capítulo 5 — niveles */}
        <StoryPanel
          index="05"
          eyebrow="Progresión"
          title="Cuatro niveles. Un mismo camino de crecimiento."
        >
          <p className="story-lead">
            Cada venta deja el 20% al impulsador. Al ascender se desbloquean catálogos,
            herramientas y visibilidad dentro del ecosistema.
          </p>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {LEVELS.map((l, i) => (
              <div key={l} className="story-tile text-center">
                <Trophy
                  className="mx-auto h-4 w-4"
                  style={{ color: `oklch(${0.72 + i * 0.04} 0.2 ${145 - i * 22})` }}
                />
                <p className="mt-2.5 font-display text-[13px] font-semibold">{l}</p>
                <p className="mt-1 text-[11px] text-white/50">Nivel {i + 1}</p>
              </div>
            ))}
          </div>
        </StoryPanel>

        {/* Cierre */}
        <StoryPanel
          index="06"
          eyebrow="Último capítulo"
          align="center"
          title="¿Eres impulsador aprobado?"
        >
          <p className="story-lead mx-auto max-w-[42ch]">
            Ingresa y toma el control del catálogo completo del ecosistema.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to="/login" className="story-cta">
              Acceder a HIVECORE <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/productos" className="story-ghost-cta">
              Ver productos públicos
            </Link>
          </div>
        </StoryPanel>

        <footer className="relative border-t border-white/10 bg-[rgba(4,6,9,0.6)] py-10 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1240px] flex-col items-center justify-between gap-4 px-5 text-[12px] tracking-[0.12px] text-white/50 sm:flex-row">
            <HiveLogo size={24} />
            <p>© {new Date().getFullYear()} Company A&amp;O Ecosystem · Plataforma privada</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
