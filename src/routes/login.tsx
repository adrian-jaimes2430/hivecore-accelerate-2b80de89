import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HiveLogo } from "@/components/HiveLogo";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Loader2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Acceso — HIVECORE" }] }),
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!loading && user && profile) {
      navigate({ to: profile.status === "approved" ? "/app" : "/pending" });
    }
  }, [loading, user, profile, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Bienvenido a HIVECORE");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        data: { full_name: fullName, phone },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Cuenta creada. Espera la aprobación del administrador.");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="hive-grid-bg absolute inset-0 opacity-50" />
      <Link to="/" className="absolute left-6 top-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <HiveLogo size={48} withText={false} />
          <h1 className="mt-4 font-display text-2xl font-bold">Acceso HIVECORE</h1>
          <p className="mt-1 text-sm text-muted-foreground">Plataforma privada de impulsadores A&O</p>
        </div>

        <div className="hive-card hive-gradient-border p-8">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
            <TabsList className="grid w-full grid-cols-2 bg-white/5">
              <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
              <TabsTrigger value="signup">Solicitar acceso</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 bg-white/5" />
                </div>
                <div>
                  <Label htmlFor="pwd">Contraseña</Label>
                  <Input id="pwd" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 bg-white/5" />
                </div>
                <Button type="submit" disabled={busy} className="hive-btn-primary w-full border-0 h-11">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre completo</Label>
                  <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5 bg-white/5" />
                </div>
                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5 bg-white/5" />
                </div>
                <div>
                  <Label htmlFor="email2">Email</Label>
                  <Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 bg-white/5" />
                </div>
                <div>
                  <Label htmlFor="pwd2">Contraseña</Label>
                  <Input id="pwd2" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 bg-white/5" />
                </div>
                <Button type="submit" disabled={busy} className="hive-btn-primary w-full border-0 h-11">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Solicitar acceso"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Tu cuenta debe ser aprobada por un administrador antes de poder ingresar.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
