import { Link } from "@tanstack/react-router";
import { Lock, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { LEVEL_LABEL, LEVEL_GATES, LEVEL_LABEL as L } from "@/lib/levels";

/**
 * Pantalla de bloqueo por nivel. Se muestra cuando el nivel del impulsador
 * todavía no desbloquea la sección solicitada.
 */
export function LevelLocked({ min = LEVEL_GATES.luxury, section }: { min?: keyof typeof L; section: string }) {
  const { level } = useAuth();
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <div className="shop-card w-full p-8">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--luxury-gold)]/15 text-[color:var(--luxury-gold)]">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold tracking-[-0.02em]">
          Disponible desde nivel {LEVEL_LABEL[min]}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {section} se desbloquea cuando asciendas al nivel {LEVEL_LABEL[min]}. Tu nivel actual es{" "}
          <span className="font-semibold text-foreground">{LEVEL_LABEL[level]}</span>. Sigue impulsando ventas para
          avanzar en el ecosistema NomadHive.
        </p>
        <Link to="/app" className="shop-btn-accent mt-6 inline-flex">
          Volver al catálogo <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
