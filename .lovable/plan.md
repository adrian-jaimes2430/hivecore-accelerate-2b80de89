# NomadHive: catálogo móvil, niveles y Marel

Entrega en 4 fases. Cada fase se aprueba y se publica antes de pasar a la siguiente.

Niveles definidos: **1. Junior · 2. Senior · 3. Líder · 4. Staff Matriz**.
Regla base: el impulsador gana 20% del total de cada venta.

---

## Fase 1 — Catálogo interno optimizado para móvil

**Navegación**
- El menú lateral (rail de 72px) se mantiene igual en escritorio.
- En móvil aparece una **barra inferior tipo app**: sobrepuesta, flotante, con blur, animada, con indicador deslizante del ítem activo (estilo imagen 3): Inicio · Luxury · Pedidos · Marel · Perfil.
- Se elimina el margen izquierdo forzado en móvil (hoy el contenido queda corrido).

**Cintas horizontales por etiqueta (imagen 1)**
- Cada bloque (Destacados, Tendencia, Top ventas, Recomendados, Nuevos, y por categoría) pasa a ser un carrusel horizontal deslizable con scroll-snap, flechas en escritorio y arrastre en móvil.
- Mosaico de categoría en cuadrícula 2x2 con etiqueta sobre la imagen, como en la imagen 1.
- Fila de chips de etiquetas (TOP, HOT, NUEVO, MÁS GANANCIA) que filtra al instante sin salir de la página.
- Tarjetas con animación de entrada escalonada y hover 3D suave; se reutiliza el sistema visual actual (shop-card, tokens verdes existentes).

**Barra inferior de búsqueda (imagen 1)**
- Píldora flotante fija sobre la barra de navegación, con búsqueda por palabra sobre nombre, descripción, SKU, marca y categoría (productos funnel + Luxury).
- Resultados en panel expandible con agrupación por categoría y accesos rápidos.

## Fase 2 — Sistema de niveles + permisos

- Nuevo campo de nivel por usuario en la base de datos, con valor inicial Junior para nuevos registros.
- **Panel admin**: en la pestaña de impulsadores, selector de nivel por usuario (solo super admin), con registro de quién y cuándo lo cambió.
- **Puertas por nivel**: Junior no ve AnMa Luxury (oculto en el rail, en la barra móvil y bloqueado por ruta con pantalla explicativa "Disponible desde nivel Senior"). Senior en adelante sí.
- La lógica de niveles queda centralizada para poder habilitar/deshabilitar más opciones después.
- Insignia de nivel visible en el dashboard del impulsador, con su 20% de comisión estimada.

## Fase 3 — Marel, asistente IA interno

- Chat interno con **hilos guardados en la base de datos** por usuario (lista de conversaciones, nuevo chat, URL propia por hilo, historial al recargar).
- Logo adjunto (imagen 4) como avatar de Marel.
- Marel responde sobre: cómo funciona la plataforma, el proceso de impulso, cómo compartir funnels y links con referido, cobros y pagos, y ayuda a encontrar productos con mejor ganancia (calcula el 20% sobre el precio de cada producto y ordena por comisión).
- Marel ve el catálogo real y el nivel del usuario: a un Junior no le recomienda productos Luxury.
- Streaming de respuestas, indicador de escritura y formato enriquecido.

## Fase 4 — Homepage con partículas interactivas 3D

- Fondo de partículas interactivo a pantalla completa que reacciona al cursor y al scroll, con el texto y las secciones integrados dentro de la animación (referencia monopo.vn + guía de estilo indicada).
- Paleta y tipografía actuales conservadas; **el contenido de la homepage no cambia**, solo su presentación.
- Degradación segura: en móvil y en equipos de bajo rendimiento baja la densidad de partículas, y con "reducir movimiento" activo se muestra un fondo estático.

---

## Notas técnicas

- Barra inferior móvil: componente nuevo `MobileTabBar`, montado en el layout autenticado; el rail se oculta por debajo de `md`.
- Carruseles: componente `Rail` reutilizable con scroll-snap nativo (sin librería de carrusel) + `Reveal` existente para animación de entrada.
- Búsqueda: filtrado en cliente sobre los datos ya cargados por consulta; sin llamadas extra por tecla.
- Niveles: enum + columna en `profiles`, con política de escritura restringida a super admin y helper de nivel para las puertas de UI y de datos.
- Marel: ruta de chat en servidor con la pasarela de IA de Lovable (modelo por defecto), tablas de hilos y mensajes con RLS por usuario, y contexto de catálogo generado en el servidor.
- Homepage 3D: capa de partículas con Three.js cargada solo en cliente, aislada de la SSR de la ruta.
