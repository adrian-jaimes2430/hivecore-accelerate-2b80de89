# AnMa Luxury Collection — Nueva unidad premium

Una expansión 100% modular y desacoplada del catálogo actual. **No se modifica nada del sistema existente** (productos, funnels, categorías actuales, uploads, admin, navegación). Todo vive en rutas y tablas nuevas.

---

## 1. Base de datos (migración nueva, aislada)

Nuevas tablas con prefijo `luxury_` para no chocar con `products` / `categories` actuales:

- `luxury_categories` — name, slug, parent_id (auto-referencia para sub-categorías), sort_order, is_active
- `luxury_brands` — name, slug, logo_url, is_active
- `luxury_products` — sku, name, slug, short_description, description, images (jsonb), category_id, brand_id, price (costo impulsador), suggested_retail_price (precio sugerido venta), stock_status (in_stock/low_stock/out_of_stock/preorder), stock_quantity, attributes (jsonb, p.ej. material, quilates, género), is_active, is_featured

`utility = suggested_retail_price - price` → se calcula en el front, no se almacena.

RLS:
- Lectura pública para `is_active` (impulsadores aprobados ven todo) usando `is_approved(auth.uid())`.
- Escritura solo `admin` vía `has_role`.
- GRANTs `authenticated` + `service_role` en las 3 tablas.

Seed inicial de categorías:
```
AnMa Luxury Collection
├─ Perfumería Premium
├─ Relojería Premium
├─ Joyería AAA (oro, plata, esmeraldas)
└─ Marroquinería
   ├─ Calzado
   ├─ Morrales
   ├─ Billeteras
   ├─ Correas
   └─ Accesorios
```

---

## 2. Rutas nuevas (no se modifica ninguna ruta existente)

```
src/routes/_authenticated/
  luxury.tsx                    → /luxury (catálogo principal con filtros)
  luxury.$productSlug.tsx       → /luxury/<slug> (ficha producto)
  admin.luxury.tsx              → /admin/luxury (gestión productos luxury — solo admin)
```

`src/routes/_authenticated/admin.tsx` actual queda intacto; se añade un **link** en su header hacia `/admin/luxury`.

---

## 3. Catálogo `/luxury`

- Hero premium con branding A&O (oro/negro, tipografía display).
- Sidebar/Drawer filtros (mobile-first):
  - Categoría (árbol con sub-categorías Marroquinería)
  - Marca (multi-select)
  - Rango de precio (slider)
  - Disponibilidad (in_stock / preorder)
- Grid responsive (2 cols mobile → 4 cols desktop) con tarjetas:
  - Imagen principal (aspect 4/5)
  - Nombre + marca
  - Descripción corta (2 líneas)
  - **Precio impulsador** (S/ X)
  - **Precio sugerido** (tachado o destacado)
  - **Utilidad estimada** (chip dorado)
  - Botón "Vista rápida" → abre Dialog con galería + descripción completa + CTA "Ver ficha"
- URL search params para filtros (compartibles, `validateSearch` + zod).
- Paginación / infinite scroll preparado para miles de productos.
- Estado vacío y skeletons.

---

## 4. Ficha producto `/luxury/<slug>`

- Galería de imágenes
- Nombre, marca, descripción
- Bloque de precios (impulsador, sugerido, utilidad)
- Disponibilidad
- Atributos dinámicos (material, quilates, etc.)
- Botón "Compartir" (genera link público — fase futura, no en este sprint)

---

## 5. Admin `/admin/luxury` (solo rol admin)

- Tabs: Productos · Categorías · Marcas
- CRUD productos con `MediaUploader` ya existente (reutilizado, no se modifica)
- Selección de categoría/marca, edición de stock y precios

---

## 6. Navegación

Añadir un único item "Luxury Collection" en `AppNavbar` (con badge dorado) que enlaza a `/luxury`. No se mueve ni renombra nada existente.

---

## Detalles técnicos

- Lectura cliente: `supabase` browser client + TanStack Query (`useSuspenseQuery` desde loader con `ensureQueryData`).
- Filtros vía `validateSearch` (zod) — sin `useState` para estado URL.
- Diseño: tokens existentes + acento `--luxury-gold` nuevo en `src/styles.css` (solo añadir, no modificar tokens actuales).
- Mobile-first, escalable, preparado para integración futura de inventario (campo `stock_quantity` ya presente; webhook se añadirá luego sin migración).

## Lo que NO se toca
- `products`, `categories`, `orders`, funnels, `product.$slug.tsx`, `admin.tsx`, uploaders, auth flow, roles, RLS existentes, navbar links existentes, estilos globales.

¿Avanzo con la migración + implementación?
