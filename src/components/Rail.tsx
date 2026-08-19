import { useRef, useState, useEffect, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Horizontal scroll-snap rail (shop.app style ribbon).
 * Drag/swipe on mobile, arrows on desktop.
 */
export function Rail({
  children,
  itemClassName = "w-[68vw] sm:w-[300px] lg:w-[280px]",
}: {
  children: ReactNode[];
  itemClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const measure = () => {
    const el = ref.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el) return;
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [children.length]);

  const nudge = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.8, 240), behavior: "smooth" });
  };

  return (
    <div className="relative -mx-4 sm:-mx-6">
      <div
        ref={ref}
        onScroll={measure}
        className="rail-scroll flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:px-6"
      >
        {children.map((child, i) => (
          <div key={i} className={`shrink-0 snap-start ${itemClassName}`}>
            {child}
          </div>
        ))}
      </div>

      {canPrev && (
        <button
          type="button"
          aria-label="Anterior"
          onClick={() => nudge(-1)}
          className="rail-nav left-1 hidden md:flex"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {canNext && (
        <button
          type="button"
          aria-label="Siguiente"
          onClick={() => nudge(1)}
          className="rail-nav right-1 hidden md:flex"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
