/**
 * Sistema de niveles NomadHive.
 * Orden: 1. Junior · 2. Senior · 3. Líder · 4. Staff Matriz
 * Cada nivel desbloquea opciones dentro del catálogo.
 */
export type ImpulsorLevel = "junior" | "senior" | "lider" | "staff_matriz";

export const LEVELS: {
  key: ImpulsorLevel;
  rank: number;
  label: string;
  blurb: string;
}[] = [
  { key: "junior", rank: 1, label: "Junior", blurb: "Nivel inicial: catálogo de funnels" },
  { key: "senior", rank: 2, label: "Senior", blurb: "Desbloquea AnMa Luxury" },
  { key: "lider", rank: 3, label: "Líder", blurb: "Liderazgo de equipo" },
  { key: "staff_matriz", rank: 4, label: "Staff Matriz", blurb: "Nivel máximo del ecosistema" },
];

export const LEVEL_LABEL: Record<ImpulsorLevel, string> = {
  junior: "Junior",
  senior: "Senior",
  lider: "Líder",
  staff_matriz: "Staff Matriz",
};

const RANK: Record<ImpulsorLevel, number> = {
  junior: 1,
  senior: 2,
  lider: 3,
  staff_matriz: 4,
};

export function levelRank(level?: ImpulsorLevel | null): number {
  return RANK[(level ?? "junior") as ImpulsorLevel] ?? 1;
}

export function atLeast(level: ImpulsorLevel | null | undefined, min: ImpulsorLevel): boolean {
  return levelRank(level) >= RANK[min];
}

/** Puertas por nivel — centralizadas para habilitar/deshabilitar opciones. */
export const LEVEL_GATES = {
  luxury: "senior" as ImpulsorLevel,
};

export function canAccessLuxury(opts: { level?: ImpulsorLevel | null; isStaff?: boolean }): boolean {
  if (opts.isStaff) return true;
  return atLeast(opts.level, LEVEL_GATES.luxury);
}

export function levelChip(level?: ImpulsorLevel | null): string {
  switch (level ?? "junior") {
    case "staff_matriz":
      return "bg-[color:var(--luxury-gold)]/15 text-[color:var(--luxury-gold)]";
    case "lider":
      return "bg-white/10 text-foreground";
    case "senior":
      return "bg-hive/15 text-hive";
    default:
      return "bg-muted text-muted-foreground";
  }
}
