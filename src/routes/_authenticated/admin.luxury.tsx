import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { toast } from "sonner";
import { ArrowLeft, Crown, Loader2, Plus, Save, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/luxury")({
  component: LuxuryAdmin,
});

type Brand = { id: string; name: string; slug: string; is_active: boolean; sort_order: number };
type Category = { id: string; name: string; slug: string; parent_id: string | null; sort_order: number; is_active: boolean };
type Product = {
  id: string; sku: string | null; name: string; slug: string;
  short_description: string | null; description: string | null;
  images: unknown; category_id: string | null; brand_id: string | null;
  price: number; suggested_retail_price: number;
  stock_status: string; stock_quantity: number;
  is_active: boolean; is_featured: boolean;
  attributes: Record<string, unknown>;
};

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function LuxuryAdmin() {
  const { isAdmin, loading } = useAuth();
  if (loading) return <div className="flex h-60 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/app" />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Admin
      </Link>
      <div className="mt-4 flex items-center gap-3">
        <Crown className="h-6 w-6 text-[color:var(--luxury-gold)]" />
        <h1 className="font-display text-3xl font-bold luxury-gradient-text">AnMa Luxury — Gestión</h1>
      </div>

      <Tabs defaultValue="products" className="mt-8">
        <TabsList>
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="categories">Categorías</TabsTrigger>
          <TabsTrigger value="brands">Marcas</TabsTrigger>
        </TabsList>
        <TabsContent value="products"><ProductsTab /></TabsContent>
        <TabsContent value="categories"><CategoriesTab /></TabsContent>
        <TabsContent value="brands"><BrandsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function ProductsTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Product> | null>(null);

  const { data: products = [] } = useQuery({
    queryKey: ["lux-admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("luxury_products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["lux-admin-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("luxury_categories").select("*").order("sort_order");
      return (data ?? []) as Category[];
    },
  });
  const { data: brands = [] } = useQuery({
    queryKey: ["lux-admin-brands"],
    queryFn: async () => {
      const { data } = await supabase.from("luxury_brands").select("*").order("name");
      return (data ?? []) as Brand[];
    },
  });

  const save = async () => {
    if (!editing) return;
    const payload = {
      sku: editing.sku || null,
      name: editing.name ?? "",
      slug: editing.slug || slugify(editing.name ?? ""),
      short_description: editing.short_description ?? null,
      description: editing.description ?? null,
      images: editing.images ?? [],
      category_id: editing.category_id || null,
      brand_id: editing.brand_id || null,
      price: Number(editing.price ?? 0),
      suggested_retail_price: Number(editing.suggested_retail_price ?? 0),
      stock_status: editing.stock_status ?? "in_stock",
      stock_quantity: Number(editing.stock_quantity ?? 0),
      is_active: editing.is_active ?? true,
      is_featured: editing.is_featured ?? false,
      attributes: editing.attributes ?? {},
    };
    const { error } = editing.id
      ? await supabase.from("luxury_products").update(payload as never).eq("id", editing.id)
      : await supabase.from("luxury_products").insert(payload as never);
    if (error) return toast.error(error.message);
    toast.success("Guardado");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["lux-admin-products"] });
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar producto?")) return;
    const { error } = await supabase.from("luxury_products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Eliminado");
    qc.invalidateQueries({ queryKey: ["lux-admin-products"] });
  };

  return (
    <div className="mt-6 space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setEditing({ images: [], stock_status: "in_stock", is_active: true })} className="hive-btn-primary">
          <Plus className="mr-1 h-4 w-4" /> Nuevo producto
        </Button>
      </div>

      {editing && (
        <div className="hive-card space-y-4 p-5">
          <h3 className="font-display text-lg font-semibold">{editing.id ? "Editar" : "Nuevo"} producto</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Nombre" value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <Input placeholder="SKU (opcional)" value={editing.sku ?? ""} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} />
            <Input placeholder="Slug (auto)" value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
            <Select value={editing.category_id ?? ""} onValueChange={(v) => setEditing({ ...editing, category_id: v })}>
              <SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.parent_id ? "↳ " : ""}{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={editing.brand_id ?? ""} onValueChange={(v) => setEditing({ ...editing, brand_id: v })}>
              <SelectTrigger><SelectValue placeholder="Marca" /></SelectTrigger>
              <SelectContent>
                {brands.map((b) => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={editing.stock_status ?? "in_stock"} onValueChange={(v) => setEditing({ ...editing, stock_status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="in_stock">En stock</SelectItem>
                <SelectItem value="low_stock">Pocas unidades</SelectItem>
                <SelectItem value="out_of_stock">Agotado</SelectItem>
                <SelectItem value="preorder">Pre-orden</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Precio impulsador" value={editing.price ?? ""} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} />
            <Input type="number" placeholder="Precio sugerido venta" value={editing.suggested_retail_price ?? ""} onChange={(e) => setEditing({ ...editing, suggested_retail_price: Number(e.target.value) })} />
            <Input type="number" placeholder="Stock" value={editing.stock_quantity ?? ""} onChange={(e) => setEditing({ ...editing, stock_quantity: Number(e.target.value) })} />
          </div>
          <Textarea placeholder="Descripción corta" value={editing.short_description ?? ""} onChange={(e) => setEditing({ ...editing, short_description: e.target.value })} />
          <Textarea placeholder="Descripción" rows={5} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          <ImageUploader
            value={Array.isArray(editing.images) ? (editing.images as string[]) : []}
            onChange={(urls) => setEditing({ ...editing, images: urls })}
            folder="luxury"
            label="Imágenes"
            max={10}
          />
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Activo</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_featured ?? false} onChange={(e) => setEditing({ ...editing, is_featured: e.target.checked })} /> Destacado</label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save} className="hive-btn-primary"><Save className="mr-1 h-4 w-4" /> Guardar</Button>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {products.map((p) => (
          <div key={p.id} className="hive-card flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              {Array.isArray(p.images) && (p.images as string[])[0] ? (
                <img src={(p.images as string[])[0]} className="h-12 w-12 rounded-md object-cover" alt="" />
              ) : (
                <div className="h-12 w-12 rounded-md bg-zinc-900" />
              )}
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">S/ {Number(p.price).toFixed(2)} · {p.stock_status} {p.is_featured && "· ⭐"} {!p.is_active && "· inactivo"}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>Editar</Button>
              <Button size="sm" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-red-400" /></Button>
            </div>
          </div>
        ))}
        {products.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay productos.</p>}
      </div>
    </div>
  );
}

function CategoriesTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Category> | null>(null);
  const { data: cats = [] } = useQuery({
    queryKey: ["lux-admin-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("luxury_categories").select("*").order("sort_order");
      return (data ?? []) as Category[];
    },
  });
  const roots = cats.filter((c) => !c.parent_id);

  const save = async () => {
    if (!editing?.name) return;
    const payload = {
      name: editing.name,
      slug: editing.slug || slugify(editing.name),
      parent_id: editing.parent_id || null,
      sort_order: Number(editing.sort_order ?? 0),
      is_active: editing.is_active ?? true,
    };
    const { error } = editing.id
      ? await supabase.from("luxury_categories").update(payload).eq("id", editing.id)
      : await supabase.from("luxury_categories").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Guardado");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["lux-admin-categories"] });
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar categoría?")) return;
    const { error } = await supabase.from("luxury_categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["lux-admin-categories"] });
  };

  return (
    <div className="mt-6 space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setEditing({ is_active: true, sort_order: 0 })} className="hive-btn-primary">
          <Plus className="mr-1 h-4 w-4" /> Nueva categoría
        </Button>
      </div>
      {editing && (
        <div className="hive-card space-y-3 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Nombre" value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <Input placeholder="Slug" value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
            <Select value={editing.parent_id ?? "none"} onValueChange={(v) => setEditing({ ...editing, parent_id: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="Padre" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin padre (raíz)</SelectItem>
                {roots.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Orden" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save} className="hive-btn-primary">Guardar</Button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {roots.map((r) => (
          <div key={r.id}>
            <CategoryRow c={r} onEdit={() => setEditing(r)} onDelete={() => remove(r.id)} />
            <div className="ml-6 space-y-1">
              {cats.filter((c) => c.parent_id === r.id).map((c) => (
                <CategoryRow key={c.id} c={c} onEdit={() => setEditing(c)} onDelete={() => remove(c.id)} child />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryRow({ c, onEdit, onDelete, child }: { c: Category; onEdit: () => void; onDelete: () => void; child?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-md border border-border/40 p-3 ${child ? "bg-white/[0.02]" : ""}`}>
      <div>
        <p className="font-medium">{child && "↳ "}{c.name}</p>
        <p className="text-xs text-muted-foreground">/{c.slug}</p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={onEdit}>Editar</Button>
        <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="h-4 w-4 text-red-400" /></Button>
      </div>
    </div>
  );
}

function BrandsTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Brand> | null>(null);
  const { data: brands = [] } = useQuery({
    queryKey: ["lux-admin-brands"],
    queryFn: async () => {
      const { data } = await supabase.from("luxury_brands").select("*").order("name");
      return (data ?? []) as Brand[];
    },
  });

  const save = async () => {
    if (!editing?.name) return;
    const payload = {
      name: editing.name,
      slug: editing.slug || slugify(editing.name),
      is_active: editing.is_active ?? true,
      sort_order: Number(editing.sort_order ?? 0),
    };
    const { error } = editing.id
      ? await supabase.from("luxury_brands").update(payload).eq("id", editing.id)
      : await supabase.from("luxury_brands").insert(payload);
    if (error) return toast.error(error.message);
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["lux-admin-brands"] });
  };
  const remove = async (id: string) => {
    if (!confirm("¿Eliminar marca?")) return;
    const { error } = await supabase.from("luxury_brands").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["lux-admin-brands"] });
  };

  return (
    <div className="mt-6 space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setEditing({ is_active: true })} className="hive-btn-primary"><Plus className="mr-1 h-4 w-4" /> Nueva marca</Button>
      </div>
      {editing && (
        <div className="hive-card space-y-3 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Nombre" value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <Input placeholder="Slug" value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save} className="hive-btn-primary">Guardar</Button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {brands.map((b) => (
          <div key={b.id} className="flex items-center justify-between rounded-md border border-border/40 p-3">
            <p className="font-medium">{b.name}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(b)}>Editar</Button>
              <Button size="sm" variant="ghost" onClick={() => remove(b.id)}><Trash2 className="h-4 w-4 text-red-400" /></Button>
            </div>
          </div>
        ))}
        {brands.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay marcas.</p>}
      </div>
    </div>
  );
}
