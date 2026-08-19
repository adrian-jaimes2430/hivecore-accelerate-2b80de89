import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { HiveLogo } from "./HiveLogo";
import {
  LayoutDashboard,
  Package,
  Crown,
  Sparkles,
  ShieldCheck,
  Store,
  LogOut,
  type LucideIcon,
} from "lucide-react";

interface Item {
  to: string;
  label: string;
  icon: LucideIcon;
  accent?: boolean;
  external?: boolean;
}

export function AppSidebar() {
  const { profile, isAdmin, canLuxury, signOut } = useAuth();
  const navigate = useNavigate();

  const items: Item[] = [
    { to: "/app", label: "Inicio", icon: LayoutDashboard },
    ...(canLuxury ? [{ to: "/luxury", label: "AnMa Luxury", icon: Crown, accent: true }] : []),
    { to: "/orders", label: "Pedidos", icon: Package },
    { to: "/marel", label: "Marel IA", icon: Sparkles },
    { to: "/catalogo", label: "Vista pública", icon: Store, external: true },
    ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: ShieldCheck }] : []),
  ];

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-[72px] flex-col items-center justify-between border-r border-border/50 bg-surface-elevated/70 py-5 backdrop-blur-xl">
      <div className="flex w-full flex-col items-center gap-6">
        <Link to="/app" className="transition-transform duration-300 hover:scale-105">
          <HiveLogo size={30} withText={false} />
        </Link>

        <nav className="flex w-full flex-col items-center gap-2">
          {items.map((item) =>
            item.external ? (
              <a
                key={item.to}
                href={item.to}
                target="_blank"
                rel="noopener noreferrer"
                className="rail-item group"
              >
                <item.icon className="h-[22px] w-[22px]" />
                <span className="rail-tip">{item.label}</span>
              </a>
            ) : (
              <Link
                key={item.to}
                to={item.to}
                activeProps={{ className: "rail-active" }}
                className={`rail-item group ${item.accent ? "rail-gold" : ""}`}
              >
                <item.icon className="h-[22px] w-[22px]" />
                <span className="rail-tip">{item.label}</span>
              </Link>
            ),
          )}
        </nav>
      </div>

      <div className="flex w-full flex-col items-center gap-3">
        <div className="rail-item group cursor-default">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-hive/15 text-[11px] font-semibold text-hive">
            {(profile?.full_name ?? "A").charAt(0).toUpperCase()}
          </span>
          <span className="rail-tip">{profile?.full_name ?? "Impulsador"}</span>
        </div>
        <button
          onClick={async () => {
            await signOut();
            navigate({ to: "/login" });
          }}
          className="rail-item group"
        >
          <LogOut className="h-[20px] w-[20px]" />
          <span className="rail-tip">Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
