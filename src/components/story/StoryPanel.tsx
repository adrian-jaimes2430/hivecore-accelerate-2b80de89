import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  /** número de capítulo, ej. "01" */
  index: string;
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
  align?: "left" | "center" | "right";
};

/**
 * Ficha (capítulo) de la historia: aparece con desenfoque + desplazamiento
 * cuando entra en pantalla y se retira al salir, sobre el video de fondo.
 */
export function StoryPanel({ index, eyebrow, title, children, align = "left" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"before" | "in" | "after">("before");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setState("in");
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setState("in");
        else setState(entry.boundingClientRect.top > 0 ? "before" : "after");
      },
      { threshold: 0.35, rootMargin: "-8% 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className="story-chapter" data-align={align}>
      <div className="story-ficha" data-state={state}>
        <span className="story-chapter-index">{index}</span>
        <p className="story-eyebrow">{eyebrow}</p>
        <h2 className="story-title">{title}</h2>
        {children && <div className="story-panel-body">{children}</div>}
      </div>
    </section>
  );
}
