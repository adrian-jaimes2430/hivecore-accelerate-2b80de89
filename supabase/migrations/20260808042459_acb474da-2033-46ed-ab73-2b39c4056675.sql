UPDATE public.luxury_categories SET name = 'Hombres', slug = 'hombres', sort_order = 1 WHERE slug = 'caballeros';
UPDATE public.luxury_categories SET name = 'Mujeres', slug = 'mujeres', sort_order = 2 WHERE slug = 'damas';
UPDATE public.luxury_categories SET name = 'Línea Blanca', sort_order = 3 WHERE slug = 'lineablanca';

UPDATE public.luxury_categories c
SET parent_id = (SELECT id FROM public.luxury_categories WHERE slug = 'hombres')
WHERE c.parent_id IS NULL
  AND c.slug NOT IN ('hombres', 'mujeres', 'lineablanca');

INSERT INTO public.luxury_categories (name, slug, description, parent_id, sort_order, is_active)
SELECT c.name,
       'mujeres-' || c.slug,
       c.description,
       (SELECT id FROM public.luxury_categories WHERE slug = 'mujeres'),
       c.sort_order,
       true
FROM public.luxury_categories c
WHERE c.parent_id = (SELECT id FROM public.luxury_categories WHERE slug = 'hombres')
ON CONFLICT (slug) DO NOTHING;