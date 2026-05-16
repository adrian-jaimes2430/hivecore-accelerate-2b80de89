import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { AppNavbar } from "@/components/AppNavbar";
import { HiveLogo } from "@/components/HiveLogo";
import { Loader2, ShieldAlert, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-hive" />
      </div>
    );
  }

  if (profile?.status === "pending") return <PendingScreen onLogout={signOut} />;
  if (profile?.status === "blocked") return <BlockedScreen onLogout={signOut} />;

  return (
    <div className="min-h-screen">
      <AppNavbar />
      <main><Outlet /></main>
    </div>
  );
}

function PendingScreen({ onLogout }: { onLogout: () => Promise<void> }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="hive-card hive-gradient-border max-w-md p-10 text-center">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-anma-orange/15 text-anma-orange">
          <Clock className="h-6 w-6" />
        </div>
        <h2 className="mt-4 font-display text-2xl font-bold">Cuenta en revisión</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tu solicitud fue recibida. Un administrador debe aprobar tu acceso al ecosistema HIVECORE antes de continuar.
        </p>
        <Button onClick={onLogout} variant="ghost" className="mt-6 border border-border/60 bg-white/5">
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}

function BlockedScreen({ onLogout }: { onLogout: () => Promise<void> }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="hive-card max-w-md p-10 text-center">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-destructive/15 text-destructive">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h2 className="mt-4 font-display text-2xl font-bold">Cuenta bloqueada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tu acceso a HIVECORE ha sido suspendido. Contacta a tu administrador.
        </p>
        <Button onClick={onLogout} variant="ghost" className="mt-6 border border-border/60 bg-white/5">
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
