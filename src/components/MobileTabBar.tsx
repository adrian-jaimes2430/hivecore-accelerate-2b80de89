import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { LayoutDashboard, Crown, Package, ShieldCheck, Sparkles, LogOut, type LucideIcon } from "lucide-react";

interface Tab {
  to: string;
  label: string;
  icon: LucideIcon;
  accent?: boolean;
}

/** Bottom app-style navigation for mobile (mirrors the desktop icon rail). */
export function MobileTabBar() {
  const { isAdmin, canLuxury, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const tabs: Tab[] = [
    { to: "/app", label: "Inicio", icon: LayoutDashboard },
    ...(canLuxury ? [{ to: "/luxury", label: "Luxury", icon: Crown, accent: true }] : []),
    { to: "/orders", label: "Pedidos", icon: Package },
    { to: "/marel", label: "Marel", icon: Sparkles },
    ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: ShieldCheck }] : []),
  ];

  const total = tabs.length + 1; // + logout
  const activeIndex = Math.max(
    0,
    tabs.findIndex((t, i) => (i === 0 ? pathname === "/app" : pathname.startsWith(t.to))),
  );

  return (
    <nav className="tabbar md:hidden" aria-label="Navegación principal">
      <div className="tabbar-inner">
        <span
          className="tabbar-indicator"
          style={{
            width: `calc(100% / ${total})`,
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        />
        {tabs.map((t, i) => (
          <Link
            key={`${t.to}-${i}`}
            to={t.to}
            className={`tabbar-item ${i === activeIndex ? "tabbar-item-active" : ""} ${t.accent ? "tabbar-item-gold" : ""}`}
          >
            <t.icon className="h-[19px] w-[19px]" />
            <span className="truncate text-[10px] font-medium tracking-tight">{t.label}</span>
          </Link>
        ))}
        <button
          type="button"
          aria-label="Cerrar sesión"
          onClick={async () => {
            await signOut();
            await navigate({ to: "/login", replace: true });
          }}
          className="tabbar-item text-destructive"
        >
          <LogOut className="h-[19px] w-[19px]" />
          <span className="truncate text-[10px] font-medium tracking-tight">Salir</span>
        </button>
      </div>
    </nav>
  );
}

