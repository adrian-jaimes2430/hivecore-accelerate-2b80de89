import { Link, useNavigate } from "@tanstack/react-router";
import { HiveLogo } from "./HiveLogo";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, ShieldCheck, LogOut, Package, Crown } from "lucide-react";

export function AppNavbar() {
  const { profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link to="/app"><HiveLogo /></Link>
          <nav className="flex items-center gap-1 overflow-x-auto">
            <Link
              to="/app"
              className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground [&.active]:text-foreground [&.active]:bg-white/5"
              activeProps={{ className: "active" }}
            >
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Link>
            <Link
              to="/orders"
              className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground [&.active]:text-foreground [&.active]:bg-white/5"
              activeProps={{ className: "active" }}
            >
              <Package className="h-4 w-4" /> Pedidos
            </Link>
            <Link
              to="/luxury"
              className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-[color:var(--luxury-gold)] transition-colors hover:bg-[color:var(--luxury-gold)]/10 [&.active]:bg-[color:var(--luxury-gold)]/15"
              activeProps={{ className: "active" }}
            >
              <Crown className="h-4 w-4" /> Luxury
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground [&.active]:text-foreground [&.active]:bg-white/5"
                activeProps={{ className: "active" }}
              >
                <ShieldCheck className="h-4 w-4" /> Admin
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right text-xs sm:block">
            <p className="font-medium">{profile?.full_name ?? "Impulsador"}</p>
            <p className="text-muted-foreground">A&O Ecosystem</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
