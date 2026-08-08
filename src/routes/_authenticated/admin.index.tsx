import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { forwardOrderEvent } from "@/lib/integrations.functions";
import { listUserEmails } from "@/lib/admin-users.functions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { MediaUploader } from "@/components/admin/MediaUploader";
import {
  ShieldCheck, Users, ShoppingBag, BarChart3, Check, Ban, Loader2,
  Plus, Pencil, Trash2, Package, Tag, Sparkles, GripVertical, ClipboardList, X,
} from "lucide-react";


export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin — HIVECORE" }] }),
});

interface ProfileRow { id: string; full_name: string | null; phone: string | null; status: string; created_at: string }
interface Category { id: string; name: string; slug: string; description: string | null; color: string | null; icon: string | null; sort_order: number | null }
interface FunnelSection { title: string; content: string; image?: string; video?: string }
interface Product {
  id: string; slug: string; sku: string; name: string; category_id: string | null;
  secondary_category_ids: string[];
  price: number; upsell_price: number | null;
  bundle_pricing_enabled: boolean; price_2: number | null; price_3: number | null;
  meta_pixel_enabled?: boolean; meta_pixel_id?: string | null; meta_test_event_code?: string | null;

  short_description: string | null; description: string | null;
  benefits: string[]; images: string[]; funnel_sections: FunnelSection[];
  cta_label: string | null;
  is_active: boolean; is_featured: boolean; is_new: boolean;
  is_bestseller: boolean; is_recommended: boolean; is_trending: boolean;
}


const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/app" });
  }, [loading, isAdmin, navigate]);

  if (loading || !isAdmin) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-hive" /></div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-hive" />
          <h1 className="font-display text-3xl font-bold">Panel administrativo</h1>
        </div>
        <div className="flex items-center gap-2">
          <a href="/admin/integrations" className="inline-flex items-center gap-2 rounded-md border border-hive/40 bg-hive/10 px-4 py-2 text-sm text-hive hover:bg-hive/20">
            <Package className="h-4 w-4" /> Integraciones
          </a>
          <a href="/admin/luxury" className="inline-flex items-center gap-2 rounded-md border border-[color:var(--luxury-gold)]/40 bg-[color:var(--luxury-gold)]/10 px-4 py-2 text-sm text-[color:var(--luxury-gold)] hover:bg-[color:var(--luxury-gold)]/20">
            <Sparkles className="h-4 w-4" /> AnMa Luxury
          </a>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-white/5 border border-border/40">
          <TabsTrigger value="overview"><BarChart3 className="mr-1.5 h-4 w-4" />Resumen</TabsTrigger>
          <TabsTrigger value="products"><Package className="mr-1.5 h-4 w-4" />Productos</TabsTrigger>
          <TabsTrigger value="orders"><ClipboardList className="mr-1.5 h-4 w-4" />Pedidos</TabsTrigger>
          <TabsTrigger value="categories"><Tag className="mr-1.5 h-4 w-4" />Categorías</TabsTrigger>
          <TabsTrigger value="users"><Users className="mr-1.5 h-4 w-4" />Impulsadores</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><Overview /></TabsContent>
        <TabsContent value="products"><ProductsTab /></TabsContent>
        <TabsContent value="orders"><OrdersTab /></TabsContent>
        <TabsContent value="categories"><CategoriesTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
      </Tabs>

    </div>
  );
}

/* ─────────────── OVERVIEW ─────────────── */
function Overview() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [{ count: profilesCount }, { count: pendingCount }, { count: products }, { count: orders }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
      ]);
      return { profiles: profilesCount ?? 0, pending: pendingCount ?? 0, products: products ?? 0, orders: orders ?? 0 };
    },
  });

  return (
    <div className="grid gap-4 sm:grid-cols-4">
      <Metric icon={Users} label="Impulsadores" value={stats?.profiles ?? 0} accent="text-hive" />
      <Metric icon={Users} label="Pendientes" value={stats?.pending ?? 0} accent="text-anma-orange" />
      <Metric icon={ShoppingBag} label="Productos" value={stats?.products ?? 0} accent="text-ao-red" />
      <Metric icon={BarChart3} label="Pedidos" value={stats?.orders ?? 0} accent="text-hive" />
    </div>
  );
}

function Metric({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number; accent: string }) {
  return (
    <div className="hive-card p-5">
      <Icon className={`h-5 w-5 ${accent}`} />
      <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold">{value}</p>
    </div>
  );
}

/* ─────────────── USERS ─────────────── */
type RoleType = "super_admin" | "collaborator" | "impulsador";
interface ProfileWithRole extends ProfileRow { role: RoleType }

function UsersTab() {
  const qc = useQueryClient();
  const fetchEmails = useServerFn(listUserEmails);
  const { data: emailMap = {} } = useQuery({
    queryKey: ["admin-user-emails"],
    queryFn: async () => (await fetchEmails({})).emails as Record<string, string>,
    staleTime: 60_000,
  });
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const [{ data: profs, error: e1 }, { data: roles, error: e2 }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const roleMap = new Map<string, RoleType>();
      (roles ?? []).forEach((r: any) => {
        const prev = roleMap.get(r.user_id);
        if (!prev || r.role === "super_admin") roleMap.set(r.user_id, r.role);
      });
      return (profs ?? []).map((p: any) => ({
        ...p,
        role: roleMap.get(p.id) ?? "impulsador",
      })) as ProfileWithRole[];
    },
  });


  const setStatus = async (id: string, status: "approved" | "blocked" | "pending") => {
    const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return false; }
    qc.invalidateQueries({ queryKey: ["admin-profiles"] });
    return true;
  };

  const setRole = async (userId: string, role: RoleType) => {
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (delErr) { toast.error(delErr.message); return false; }
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) { toast.error(error.message); return false; }
    qc.invalidateQueries({ queryKey: ["admin-profiles"] });
    return true;
  };

  const approveAs = async (userId: string, role: RoleType) => {
    const okRole = await setRole(userId, role);
    const okStatus = await setStatus(userId, "approved");
    if (okRole && okStatus) toast.success(`Aprobado como ${roleLabel(role)}`);
  };

  return (
    <div className="hive-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Correo registrado</th>
            <th className="px-4 py-3">Teléfono</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Rol</th>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((p) => (
            <tr key={p.id} className="border-t border-border/40">
              <td className="px-4 py-3 font-medium">{p.full_name ?? "—"}</td>
              <td className="px-4 py-3"><EmailCell email={emailMap[p.id]} /></td>
              <td className="px-4 py-3"><PhoneEditor id={p.id} phone={p.phone} /></td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusChip(p.status)}`}>
                  {p.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <Select value={p.role} onValueChange={(v) => setRole(p.id, v as RoleType).then((ok) => ok && toast.success("Rol actualizado"))}>
                  <SelectTrigger className="h-8 w-[160px] bg-white/5 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="impulsador">Impulsador</SelectItem>
                    <SelectItem value="collaborator">Colaborador</SelectItem>
                    <SelectItem value="super_admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex flex-wrap justify-end gap-2">
                  {p.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => approveAs(p.id, "impulsador")} className="hive-btn-primary h-8 border-0">
                        <Check className="mr-1 h-3 w-3" /> Aprobar como Impulsador
                      </Button>
                      <Button size="sm" onClick={() => approveAs(p.id, "super_admin")} className="h-8 border-0 bg-hive/20 text-hive hover:bg-hive/30">
                        <ShieldCheck className="mr-1 h-3 w-3" /> Aprobar como Admin
                      </Button>
                    </>
                  )}
                  {p.status === "approved" && (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(p.id, "blocked").then((ok) => ok && toast.success("Usuario bloqueado"))} className="h-8 border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20">
                      <Ban className="mr-1 h-3 w-3" /> Bloquear
                    </Button>
                  )}
                  {p.status === "blocked" && (
                    <Button size="sm" onClick={() => setStatus(p.id, "approved").then((ok) => ok && toast.success("Usuario reactivado"))} className="hive-btn-primary h-8 border-0">
                      <Check className="mr-1 h-3 w-3" /> Reactivar
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function roleLabel(r: RoleType) {
  if (r === "super_admin") return "Administrador";
  if (r === "collaborator") return "Colaborador";
  return "Impulsador";
}

function statusChip(s: string) {
  if (s === "approved") return "bg-hive/15 text-hive";
  if (s === "blocked") return "bg-destructive/15 text-destructive";
  return "bg-anma-orange/15 text-anma-orange";
}

function EmailCell({ email }: { email?: string }) {
  if (!email) return <span className="text-xs italic text-muted-foreground">—</span>;
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(email);
        toast.success("Correo copiado");
      }}
      title="Correo con el que se registró (copiar para cotejar en CORE OS)"
      className="max-w-[240px] truncate rounded-md px-2 py-1 text-left text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground"
    >
      {email}
    </button>
  );
}

function PhoneEditor({ id, phone }: { id: string; phone: string | null }) {

  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(phone ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const clean = value.trim();
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ phone: clean || null }).eq("id", id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Teléfono actualizado");
    qc.invalidateQueries({ queryKey: ["admin-profiles"] });
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => { setValue(phone ?? ""); setEditing(true); }}
        className="group inline-flex items-center gap-2 rounded-md px-2 py-1 text-left text-muted-foreground hover:bg-white/5 hover:text-foreground"
        title="Editar teléfono"
      >
        <span className={phone ? "" : "italic opacity-60"}>{phone ?? "Agregar teléfono"}</span>
        <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
        placeholder="+57 300..."
        className="h-8 w-40 bg-white/5 text-xs"
      />
      <Button size="sm" onClick={save} disabled={busy} className="hive-btn-primary h-8 border-0 px-2">
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-8 px-2">
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

/* ─────────────── CATEGORIES ─────────────── */
function CategoriesTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Category | null>(null);

  const { data: cats = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data as Category[];
    },
  });

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar esta categoría?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Categoría eliminada");
    qc.invalidateQueries({ queryKey: ["admin-categories"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEdit(null); setOpen(true); }} className="hive-btn-primary border-0">
          <Plus className="mr-1 h-4 w-4" /> Nueva categoría
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cats.map((c) => (
          <div key={c.id} className="hive-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-display text-lg font-bold">{c.name}</p>
                <p className="text-xs text-muted-foreground">/{c.slug}</p>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => { setEdit(c); setOpen(true); }} className="h-7 w-7">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove(c.id)} className="h-7 w-7 text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            {c.description && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{c.description}</p>}
          </div>
        ))}
      </div>

      <CategoryDialog open={open} onOpenChange={setOpen} category={edit} />
    </div>
  );
}

function CategoryDialog({ open, onOpenChange, category }: { open: boolean; onOpenChange: (o: boolean) => void; category: Category | null }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", slug: "", description: "", color: "green", icon: "", sort_order: 0 });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(category
        ? { name: category.name, slug: category.slug, description: category.description ?? "", color: category.color ?? "green", icon: category.icon ?? "", sort_order: category.sort_order ?? 0 }
        : { name: "", slug: "", description: "", color: "green", icon: "", sort_order: 0 });
    }
  }, [open, category]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const payload = { ...form, slug: form.slug || slugify(form.name) };
    const { error } = category
      ? await supabase.from("categories").update(payload).eq("id", category.id)
      : await supabase.from("categories").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(category ? "Categoría actualizada" : "Categoría creada");
    qc.invalidateQueries({ queryKey: ["admin-categories"] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-elevated border-border/60">
        <DialogHeader><DialogTitle>{category ? "Editar" : "Nueva"} categoría</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Nombre</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })} className="bg-white/5" /></div>
          <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} className="bg-white/5" /></div>
          <div><Label>Descripción</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-white/5" /></div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Color</Label>
              <Select value={form.color} onValueChange={(v) => setForm({ ...form, color: v })}>
                <SelectTrigger className="bg-white/5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["green","orange","red","yellow","blue","purple","pink","cyan","white","gray"].map((c) => (
                    <SelectItem key={c} value={c}>{c.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Icono</Label>
              <Select value={form.icon || "none"} onValueChange={(v) => setForm({ ...form, icon: v === "none" ? "" : v })}>
                <SelectTrigger className="bg-white/5"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sin ícono —</SelectItem>
                  {["FIRE","STAR","BOLT","HEART","GIFT","CART","TAG","CROWN","SPARKLES","ROCKET","TROPHY","DIAMOND"].map((i) => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Orden</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} className="bg-white/5" /></div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy} className="hive-btn-primary border-0">
              {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────── PRODUCTS ─────────────── */
function ProductsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Product | null>(null);

  const { data: products = [] } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((p: any) => ({
        ...p,
        benefits: Array.isArray(p.benefits) ? p.benefits : [],
        images: Array.isArray(p.images) ? p.images : [],
        funnel_sections: Array.isArray(p.funnel_sections) ? p.funnel_sections : [],
        secondary_category_ids: Array.isArray(p.secondary_category_ids) ? p.secondary_category_ids : [],
      })) as Product[];
    },
  });

  const { data: cats = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("sort_order");
      return (data ?? []) as Category[];
    },
  });

  const remove = async (p: Product) => {
    if (!confirm(`¿Eliminar "${p.name}"? Esto no se puede deshacer.`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Producto eliminado");
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  const toggleActive = async (p: Product) => {
    const { error } = await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEdit(null); setOpen(true); }} className="hive-btn-primary border-0">
          <Plus className="mr-1 h-4 w-4" /> Nuevo producto
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <div key={p.id} className="hive-card overflow-hidden">
            <div className="aspect-video bg-gradient-to-br from-hive/20 to-ao-red/10 relative">
              {p.images[0] ? (
                <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center font-display text-5xl font-black opacity-30">{p.name.charAt(0)}</div>
              )}
              {!p.is_active && (
                <div className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold uppercase">Inactivo</div>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display text-base font-bold truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground truncate">S/ {Number(p.price).toFixed(2)} · /{p.slug}</p>
                  <p className="mt-1 text-[10px] font-mono font-bold text-hive">SKU: {p.sku}</p>
                </div>

                <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {p.is_featured && <Tag2 label="Destacado" />}
                {p.is_new && <Tag2 label="Nuevo" />}
                {p.is_bestseller && <Tag2 label="Bestseller" />}
                {p.is_trending && <Tag2 label="Trending" />}
              </div>
              <div className="mt-3 flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => { setEdit(p); setOpen(true); }} className="h-8 flex-1 border border-border/60">
                  <Pencil className="mr-1 h-3 w-3" /> Editar
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove(p)} className="h-8 w-8 text-destructive border border-destructive/30">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ProductDialog open={open} onOpenChange={setOpen} product={edit} categories={cats} />
    </div>
  );
}

function Tag2({ label }: { label: string }) {
  return <span className="rounded-full bg-hive/15 px-2 py-0.5 text-[10px] font-semibold text-hive">{label}</span>;
}

function ProductDialog({ open, onOpenChange, product, categories }: {
  open: boolean; onOpenChange: (o: boolean) => void; product: Product | null; categories: Category[];
}) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const empty: Product = {
    id: "", slug: "", sku: "", name: "", category_id: null, secondary_category_ids: [],
    price: 0, upsell_price: null,
    bundle_pricing_enabled: false, price_2: null, price_3: null,
    meta_pixel_enabled: false, meta_pixel_id: "", meta_test_event_code: "",

    short_description: "", description: "", benefits: [], images: [], funnel_sections: [],
    cta_label: "Pedir ahora",
    is_active: true, is_featured: false, is_new: false, is_bestseller: false, is_recommended: false, is_trending: false,
  };

  const [form, setForm] = useState<Product>(empty);
  const [benefitsText, setBenefitsText] = useState("");

  useEffect(() => {
    if (open) {
      const p = product ?? empty;
      setForm(p);
      setBenefitsText((p.benefits ?? []).join("\n"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product]);

  const update = <K extends keyof Product>(k: K, v: Product[K]) => setForm((f) => ({ ...f, [k]: v }));

  const addFunnel = () => update("funnel_sections", [...form.funnel_sections, { title: "", content: "", image: "", video: "" }]);
  const updateFunnel = (i: number, patch: Partial<FunnelSection>) => {
    const next = [...form.funnel_sections];
    next[i] = { ...next[i], ...patch };
    update("funnel_sections", next);
  };
  const removeFunnel = (i: number) => update("funnel_sections", form.funnel_sections.filter((_, idx) => idx !== i));
  const moveFunnel = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= form.funnel_sections.length) return;
    const next = [...form.funnel_sections];
    [next[i], next[j]] = [next[j], next[i]];
    update("funnel_sections", next);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const payload = {
      slug: form.slug || slugify(form.name),
      name: form.name,
      category_id: form.category_id,
      secondary_category_ids: form.secondary_category_ids.filter((id) => id && id !== form.category_id) as any,
      price: form.price,
      upsell_price: form.upsell_price,
      bundle_pricing_enabled: form.bundle_pricing_enabled,
      price_2: form.bundle_pricing_enabled ? form.price_2 : null,
      price_3: form.bundle_pricing_enabled ? form.price_3 : null,
      short_description: form.short_description,
      description: form.description,
      benefits: benefitsText.split("\n").map((s) => s.trim()).filter(Boolean),
      images: form.images as any,
      funnel_sections: form.funnel_sections as any,
      cta_label: form.cta_label,
      is_active: form.is_active,
      is_featured: form.is_featured,
      is_new: form.is_new,
      is_bestseller: form.is_bestseller,
      is_recommended: form.is_recommended,
      is_trending: form.is_trending,
    };
    const { error } = product
      ? await supabase.from("products").update(payload).eq("id", product.id)
      : await supabase.from("products").insert(payload as any);

    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(product ? "Producto actualizado" : "Producto creado");
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["product", payload.slug] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-elevated border-border/60 max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{product ? "Editar producto" : "Nuevo producto"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          {/* Básico */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-hive">Información básica</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Nombre</Label>
                <Input required value={form.name} onChange={(e) => {
                  update("name", e.target.value);
                  if (!product && !form.slug) update("slug", slugify(e.target.value));
                }} className="bg-white/5" />
              </div>
              <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => update("slug", slugify(e.target.value))} className="bg-white/5" /></div>
              <div>
                <Label>Categoría principal</Label>
                <Select value={form.category_id ?? "none"} onValueChange={(v) => update("category_id", v === "none" ? null : v)}>
                  <SelectTrigger className="bg-white/5"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin categoría</SelectItem>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Categorías secundarias</Label>
                <div className="rounded-md border border-border/40 bg-white/5 p-2 space-y-2">
                  {form.secondary_category_ids.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {form.secondary_category_ids.map((id) => {
                        const c = categories.find((x) => x.id === id);
                        if (!c) return null;
                        return (
                          <span key={id} className="inline-flex items-center gap-1 rounded-full bg-hive/15 px-2 py-0.5 text-xs text-hive">
                            {c.name}
                            <button type="button" onClick={() => update("secondary_category_ids", form.secondary_category_ids.filter((x) => x !== id))} className="hover:text-destructive">
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <Select
                    value=""
                    onValueChange={(v) => {
                      if (!v || v === form.category_id || form.secondary_category_ids.includes(v)) return;
                      update("secondary_category_ids", [...form.secondary_category_ids, v]);
                    }}
                  >
                    <SelectTrigger className="h-8 bg-background/60 text-xs"><SelectValue placeholder="Añadir categoría secundaria" /></SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter((c) => c.id !== form.category_id && !form.secondary_category_ids.includes(c.id))
                        .map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Precio (S/)</Label><Input type="number" step="0.01" required value={form.price} onChange={(e) => update("price", Number(e.target.value))} className="bg-white/5" /></div>
              <div><Label>Precio antes (S/)</Label><Input type="number" step="0.01" value={form.upsell_price ?? ""} onChange={(e) => update("upsell_price", e.target.value ? Number(e.target.value) : null)} className="bg-white/5" /></div>
              <div className="sm:col-span-2 rounded-md border border-border/40 bg-white/5 p-3 space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={form.bundle_pricing_enabled}
                    onChange={(e) => update("bundle_pricing_enabled", e.target.checked)}
                    className="h-4 w-4 accent-[hsl(var(--hive))]"
                  />
                  Activar precios por combo (x2 / x3 unidades)
                </label>
                {form.bundle_pricing_enabled && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Precio total x2 unidades (S/)</Label>
                      <Input type="number" step="0.01" value={form.price_2 ?? ""} onChange={(e) => update("price_2", e.target.value ? Number(e.target.value) : null)} className="bg-white/5" />
                    </div>
                    <div>
                      <Label>Precio total x3 unidades (S/)</Label>
                      <Input type="number" step="0.01" value={form.price_3 ?? ""} onChange={(e) => update("price_3", e.target.value ? Number(e.target.value) : null)} className="bg-white/5" />
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Si se desactiva, el pedido siempre calcula precio unitario × cantidad.
                </p>
              </div>
              <div className="sm:col-span-2"><Label>Descripción corta</Label><Input value={form.short_description ?? ""} onChange={(e) => update("short_description", e.target.value)} className="bg-white/5" /></div>
              <div className="sm:col-span-2"><Label>Descripción completa</Label><Textarea rows={4} value={form.description ?? ""} onChange={(e) => update("description", e.target.value)} className="bg-white/5" /></div>
              <div className="sm:col-span-2">
                <Label>Beneficios (uno por línea)</Label>
                <Textarea rows={4} value={benefitsText} onChange={(e) => setBenefitsText(e.target.value)} className="bg-white/5" placeholder="Ej: Resultados en 7 días" />
              </div>
              <div><Label>Texto CTA</Label><Input value={form.cta_label ?? ""} onChange={(e) => update("cta_label", e.target.value)} className="bg-white/5" /></div>
            </div>
          </section>

          {/* Imágenes */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-hive">Imágenes del producto</h3>
            <ImageUploader
              value={form.images}
              onChange={(v) => update("images", v)}
              folder={`products/${form.slug || "draft"}`}
              label="Galería"
            />
          </section>

          {/* Funnel */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-hive flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Secciones del funnel
              </h3>
              <Button type="button" size="sm" variant="ghost" onClick={addFunnel} className="h-7 border border-border/60">
                <Plus className="mr-1 h-3 w-3" /> Sección
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Carga aquí las secciones e imágenes generadas por tu IA externa.</p>
            <div className="space-y-3">
              {form.funnel_sections.map((s, i) => (
                <div key={i} className="rounded-lg border border-border/40 bg-white/5 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-bold text-muted-foreground">Sección {i + 1}</span>
                    <div className="ml-auto flex gap-1">
                      <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveFunnel(i, -1)}>↑</Button>
                      <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveFunnel(i, 1)}>↓</Button>
                      <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeFunnel(i)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <Input placeholder="Título (interno, no se muestra)" value={s.title} onChange={(e) => updateFunnel(i, { title: e.target.value })} className="bg-background/60" />
                  <MediaUploader
                    image={s.image}
                    video={s.video}
                    onChange={(next) => updateFunnel(i, { image: next.image ?? "", video: next.video ?? "" })}
                    folder={`products/${form.slug || "draft"}/funnel`}
                    label="Medio de sección (imagen o video)"
                  />
                </div>
              ))}
              {form.funnel_sections.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-6 border border-dashed border-border/40 rounded-lg">
                  Sin secciones aún. Agrega la primera para construir tu funnel.
                </p>
              )}
            </div>
          </section>

          {/* Flags */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-hive">Visibilidad y etiquetas</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Flag label="Activo" v={form.is_active} on={(v) => update("is_active", v)} />
              <Flag label="Destacado" v={form.is_featured} on={(v) => update("is_featured", v)} />
              <Flag label="Nuevo" v={form.is_new} on={(v) => update("is_new", v)} />
              <Flag label="Bestseller" v={form.is_bestseller} on={(v) => update("is_bestseller", v)} />
              <Flag label="Recomendado" v={form.is_recommended} on={(v) => update("is_recommended", v)} />
              <Flag label="Trending" v={form.is_trending} on={(v) => update("is_trending", v)} />
            </div>
          </section>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={busy} className="hive-btn-primary border-0">
              {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Guardar producto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Flag({ label, v, on }: { label: string; v: boolean; on: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-md border border-border/40 bg-white/5 px-3 py-2 cursor-pointer">
      <span className="text-xs font-medium">{label}</span>
      <Switch checked={v} onCheckedChange={on} />
    </label>
  );
}

/* ─────────────── ORDERS ─────────────── */
interface OrderRow {
  id: string; order_code: string; client_name: string; client_phone: string;
  client_address: string | null; notes: string | null; quantity: number;
  total: number | null; status: string; created_at: string;
  product_id: string | null;
  luxury_product_id: string | null;
  impulsador_id: string | null;
  impulsador_name?: string | null;
  source?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  products?: { name: string; sku: string } | null;
  luxury_products?: { name: string; sku: string | null } | null;
}

function OrdersTab() {
  const qc = useQueryClient();
  const [editOrder, setEditOrder] = useState<OrderRow | null>(null);
  const forwardEvent = useServerFn(forwardOrderEvent);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, products(name, sku), luxury_products(name, sku)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as unknown as OrderRow[];
      const impIds = Array.from(new Set(rows.map((r) => r.impulsador_id).filter(Boolean))) as string[];
      if (impIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", impIds);
        const map = new Map((profs ?? []).map((p: any) => [p.id, p.full_name as string | null]));
        rows.forEach((r) => { r.impulsador_name = r.impulsador_id ? map.get(r.impulsador_id) ?? null : null; });
      }
      return rows;
    },
  });

  const remove = async (o: OrderRow) => {
    if (!confirm(`¿Eliminar pedido ${o.order_code}? Esta acción no se puede deshacer y se sincronizará con A&O CORE OS.`)) return;
    try {
      // The server fn dispatches order.deleted to all active integrations
      // AND deletes the row (service role bypasses RLS).
      const r = await forwardEvent({ data: { orderId: o.id, event: "order.deleted" } });
      if (r.error && r.forwarded === 0 && r.total > 0) {
        toast.error(`No se pudo sincronizar la eliminación: ${r.error}`);
        return;
      }
      toast.success("Pedido eliminado" + (r.forwarded ? ` y sincronizado (${r.forwarded})` : ""));
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Error al eliminar");
    }
  };

  const updateStatus = async (o: OrderRow, status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", o.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
    qc.invalidateQueries({ queryKey: ["orders"] });
    // Fire-and-forget sync to A&O CORE OS
    forwardEvent({ data: { orderId: o.id, event: "order.updated" } }).catch((e) =>
      console.warn("[integrations] updateStatus forward", e),
    );
  };

  if (isLoading) {
    return <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-hive" /></div>;
  }

  return (
    <div className="hive-card overflow-x-auto">
      <table className="w-full text-sm min-w-[900px]">
        <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Código</th>
            <th className="px-4 py-3">Producto / SKU</th>
            <th className="px-4 py-3">Impulsador</th>
            <th className="px-4 py-3">Pago</th>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">Teléfono</th>
            <th className="px-4 py-3">Cant.</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-t border-border/40">
              <td className="px-4 py-3 font-mono text-xs font-bold text-hive">{o.order_code}</td>
              <td className="px-4 py-3">
                <div className="font-medium">{o.products?.name ?? o.luxury_products?.name ?? "—"} {o.luxury_product_id && <span className="ml-1 rounded bg-[color:var(--luxury-gold)]/15 px-1.5 py-0.5 text-[9px] uppercase text-[color:var(--luxury-gold)]">Luxury</span>}</div>
                <div className="text-[10px] font-mono text-muted-foreground">{o.products?.sku ?? o.luxury_products?.sku ?? "—"}</div>
              </td>
              <td className="px-4 py-3 text-xs">
                {o.impulsador_name ? (
                  o.impulsador_name
                ) : (
                  <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-blue-300">
                    Tráfico pago · Meta Ads
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-xs">
                <div className="font-medium">
                  {o.payment_method === "online" ? "Pago en línea" : "Contra entrega"}
                </div>
                <div
                  className={
                    o.payment_status === "paid"
                      ? "text-emerald-400"
                      : o.payment_status === "failed" || o.payment_status === "voided"
                        ? "text-red-400"
                        : "text-muted-foreground"
                  }
                >
                  {o.payment_status === "paid"
                    ? "Pagado"
                    : o.payment_status === "failed"
                      ? "Rechazado"
                      : o.payment_status === "voided"
                        ? "Anulado"
                        : "Pendiente"}
                </div>
              </td>

              <td className="px-4 py-3">{o.client_name}</td>
              <td className="px-4 py-3 text-muted-foreground">{o.client_phone}</td>
              <td className="px-4 py-3">{o.quantity}</td>
              <td className="px-4 py-3">S/ {Number(o.total ?? 0).toFixed(2)}</td>
              <td className="px-4 py-3">
                <Select value={o.status} onValueChange={(v) => updateStatus(o, v)}>
                  <SelectTrigger className="h-7 w-32 bg-white/5 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditOrder(o)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(o)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {orders.length === 0 && (
            <tr><td colSpan={11} className="px-4 py-10 text-center text-muted-foreground">Aún no hay pedidos.</td></tr>
          )}
        </tbody>
      </table>
      <EditOrderDialog order={editOrder} onClose={() => setEditOrder(null)} />
    </div>
  );
}

function EditOrderDialog({ order, onClose }: { order: OrderRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const forwardEvent = useServerFn(forwardOrderEvent);
  const [form, setForm] = useState({ client_name: "", client_phone: "", client_address: "", quantity: 1, notes: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (order) {
      setForm({
        client_name: order.client_name,
        client_phone: order.client_phone,
        client_address: order.client_address ?? "",
        quantity: order.quantity,
        notes: order.notes ?? "",
      });
    }
  }, [order]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setBusy(true);
    const { error } = await supabase.from("orders").update({
      client_name: form.client_name,
      client_phone: form.client_phone,
      client_address: form.client_address || null,
      quantity: form.quantity,
      notes: form.notes || null,
    }).eq("id", order.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Pedido actualizado");
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
    qc.invalidateQueries({ queryKey: ["orders"] });
    // Sync change to A&O CORE OS (fire-and-forget)
    forwardEvent({ data: { orderId: order.id, event: "order.updated" } }).catch((e) =>
      console.warn("[integrations] editOrder forward", e),
    );
    onClose();
  };

  return (
    <Dialog open={!!order} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-surface-elevated border-border/60">
        <DialogHeader><DialogTitle>Editar pedido {order?.order_code}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Nombre cliente</Label><Input required value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} className="bg-white/5" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Teléfono</Label><Input required value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} className="bg-white/5" /></div>
            <div><Label>Cantidad</Label><Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} className="bg-white/5" /></div>
          </div>
          <div><Label>Dirección</Label><Input value={form.client_address} onChange={(e) => setForm({ ...form, client_address: e.target.value })} className="bg-white/5" /></div>
          <div><Label>Observaciones</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-white/5" /></div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={busy} className="hive-btn-primary border-0">
              {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Guardar cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

