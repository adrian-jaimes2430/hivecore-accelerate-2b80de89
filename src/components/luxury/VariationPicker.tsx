import { useState } from "react";
import { Check } from "lucide-react";
import type { Variation } from "@/components/admin/VariationsEditor";

export function VariationPicker({
  variations,
  value,
  onChange,
}: {
  variations: Variation[];
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}) {
  if (!variations || variations.length === 0) return null;
  return (
    <div className="space-y-3">
      {variations.map((v) => (
        <div key={v.name}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--luxury-gold)]">
            {v.name}
            {value[v.name] && <span className="ml-2 text-muted-foreground normal-case tracking-normal">· {value[v.name]}</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            {v.options.map((o) => {
              const sel = value[v.name] === o;
              return (
                <button
                  key={o}
                  type="button"
                  onClick={() => onChange({ ...value, [v.name]: o })}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition ${
                    sel
                      ? "border-[color:var(--luxury-gold)] bg-[color:var(--luxury-gold)]/15 text-[color:var(--luxury-gold)]"
                      : "border-border/60 text-muted-foreground hover:border-[color:var(--luxury-gold)]/50 hover:text-foreground"
                  }`}
                >
                  {sel && <Check className="h-3 w-3" />}
                  {o}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function summarizeVariations(value: Record<string, string>) {
  const entries = Object.entries(value).filter(([, v]) => v);
  if (entries.length === 0) return "";
  return entries.map(([k, v]) => `${k}: ${v}`).join(" · ");
}
