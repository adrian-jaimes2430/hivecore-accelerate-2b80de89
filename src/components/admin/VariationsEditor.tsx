import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

export interface Variation {
  name: string;
  options: string[];
}

interface Props {
  value: Variation[];
  onChange: (next: Variation[]) => void;
}

const PRESETS = ["Talla", "Color", "Tamaño", "Medida", "Material", "Aroma", "Modelo"];

export function VariationsEditor({ value, onChange }: Props) {
  const add = (name = "") => onChange([...value, { name, options: [] }]);
  const update = (i: number, patch: Partial<Variation>) =>
    onChange(value.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Variaciones del producto
        </label>
        <div className="flex flex-wrap gap-1">
          {PRESETS.map((p) => (
            <Button
              key={p}
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => add(p)}
              className="h-6 border border-border/60 px-2 text-[10px]"
            >
              + {p}
            </Button>
          ))}
          <Button type="button" size="sm" variant="ghost" onClick={() => add()} className="h-6 border border-border/60 px-2 text-[10px]">
            <Plus className="mr-0.5 h-3 w-3" /> Otra
          </Button>
        </div>
      </div>

      {value.length === 0 ? (
        <p className="rounded-md border border-dashed border-border/60 p-3 text-center text-xs text-muted-foreground">
          Sin variaciones. Agrega Talla, Color, Tamaño, etc. para que el cliente pueda elegir.
        </p>
      ) : (
        <div className="space-y-2">
          {value.map((v, i) => (
            <div key={i} className="rounded-md border border-border/40 bg-white/[0.02] p-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Nombre (ej: Talla)"
                  value={v.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                  className="h-8 w-40"
                />
                <Input
                  placeholder="Opciones separadas por coma (ej: S, M, L)"
                  defaultValue={v.options.join(", ")}
                  onBlur={(e) =>
                    update(i, {
                      options: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  className="h-8 flex-1"
                />
                <Button type="button" size="sm" variant="ghost" onClick={() => remove(i)}>
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </Button>
              </div>
              {v.options.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {v.options.map((o, oi) => (
                    <span key={oi} className="rounded-full border border-[color:var(--luxury-gold)]/30 bg-[color:var(--luxury-gold)]/5 px-2 py-0.5 text-[10px] text-[color:var(--luxury-gold)]">
                      {o}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
