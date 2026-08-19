import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { canAccessLuxury, type ImpulsorLevel } from "@/lib/levels";

export type AppRole = "super_admin" | "collaborator" | "impulsador";
export type UserStatus = "pending" | "approved" | "blocked";

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: UserStatus;
  level: ImpulsorLevel;
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  hasRole: (r: AppRole) => boolean;
  isAdmin: boolean;
  isApproved: boolean;
  level: ImpulsorLevel;
  canLuxury: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const restored = useRef(false);
  const signingOut = useRef(false);

  /**
   * Carga perfil + roles con reintentos. Un fallo de red NUNCA borra los datos
   * ya cargados: de lo contrario el botón Admin desaparecía en cualquier
   * hipo de conexión.
   */
  const loadProfile = async (uid: string, attempt = 0): Promise<void> => {
    try {
      const [{ data: p, error: pe }, { data: r, error: re }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);
      if (pe || re) throw pe ?? re;
      if (p) setProfile(p as Profile);
      setRoles(((r ?? []) as { role: AppRole }[]).map((x) => x.role));
    } catch (error) {
      console.error("No fue posible cargar los datos de la cuenta", error);
      if (attempt < 3 && !signingOut.current) {
        await new Promise((res) => setTimeout(res, 600 * (attempt + 1)));
        return loadProfile(uid, attempt + 1);
      }
    }
  };

  const clearIdentity = () => {
    setSession(null);
    setUser(null);
    setProfile(null);
    setRoles([]);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      // Antes de que getSession() resuelva, un evento sin sesión (INITIAL_SESSION)
      // no debe expulsar al usuario del panel.
      if (!s && !restored.current && event !== "SIGNED_OUT") return;

      if (s?.user) {
        restored.current = true;
        setSession(s);
        setUser(s.user);
        setLoading(false);
        setTimeout(() => void loadProfile(s.user.id), 0);
        return;
      }

      if (event === "SIGNED_OUT") {
        restored.current = true;
        clearIdentity();
        setLoading(false);
      }
    });

    void supabase.auth.getSession()
      .then(({ data: { session: s } }) => {
        restored.current = true;
        setSession(s);
        setUser(s?.user ?? null);
        setLoading(false);
        if (s?.user) void loadProfile(s.user.id);
      })
      .catch((error) => {
        console.error("No fue posible restaurar la sesión", error);
        restored.current = true;
        clearIdentity();
        setLoading(false);
      });

    return () => sub.subscription.unsubscribe();
  }, []);

  const isStaff = roles.includes("super_admin") || roles.includes("collaborator");
  const level: ImpulsorLevel = profile?.level ?? "junior";

  const value: AuthCtx = {
    user, session, profile, roles, loading,
    hasRole: (r) => roles.includes(r),
    isAdmin: roles.includes("super_admin"),
    isApproved: profile?.status === "approved",
    level,
    canLuxury: canAccessLuxury({ level, isStaff }),
    refresh: async () => { if (user) await loadProfile(user.id); },
    signOut: async () => {
      signingOut.current = true;
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error("Cierre de sesión con error, limpiando localmente", error);
        try {
          await supabase.auth.signOut({ scope: "local" });
        } catch { /* ignorado: el estado local se limpia igual */ }
      } finally {
        clearIdentity();
        setLoading(false);
        signingOut.current = false;
      }
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be inside AuthProvider");
  return v;
}
