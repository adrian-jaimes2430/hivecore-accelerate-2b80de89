# Optimización integral de AnMa Luxury

## Objetivo
Mejorar la lectura y exploración de productos en los catálogos público e interno, sustituir el banner actual por un carrusel 3D de tarjetas claramente visibles e interactivas, y permitir publicar productos con precio o bajo consulta previa.

## Cambios

### 1. Banner superior simplificado
- Reemplazar el anillo cilíndrico actual por un abanico/carrusel frontal de tarjetas 3D.
- Mantener siempre una tarjeta central grande y legible, con las laterales parcialmente visibles.
- Permitir navegación por arrastre, toque, flechas e indicadores; conservar una rotación automática suave que se pausa al interactuar.
- Mostrar imágenes o videos promocionales sin taparlos con demasiado texto; usar una capa breve con título y enlace cuando exista.
- Optimizar la escena para móviles, movimiento reducido y pausa fuera de pantalla.

### 2. Visibilidad de productos
- Mejorar las tarjetas de producto en el catálogo público y el catálogo de impulsadores: imagen más limpia, jerarquía clara, disponibilidad, marca, precio o estado “Consultar precio”, y acciones visibles.
- Añadir transiciones suaves al cargar, filtrar y pasar entre imágenes, sin retrasar la aparición del contenido.
- Mantener carga progresiva en el catálogo público y aplicarla también al catálogo interno para evitar renderizar cientos de productos de una vez.
- Ajustar la vista rápida para que distinga claramente entre productos comprables y productos sujetos a confirmación.
- Corregir el filtrado interno para incluir categorías secundarias, igual que el catálogo público.

### 3. Precio definido o bajo consulta
- Añadir en creación/edición un selector explícito: “Publicar con precio” o “Precio y disponibilidad por confirmar”.
- Al elegir consulta, guardar ambos precios en cero y ocultar los campos de precio; al volver a precio publicado, mostrarlos y exigir un precio final válido.
- Mostrar una etiqueta clara en la lista administrativa para productos bajo consulta.
- En fichas públicas e internas, ocultar compra/creación de pedido cuando no haya precio y priorizar la consulta por WhatsApp.
- Mantener intactos los productos y pedidos existentes; no se requiere cambio estructural de base de datos porque el catálogo ya interpreta precio cero como cotización.

## Verificación
- Revisar catálogo público e interno en escritorio y móvil.
- Probar carrusel con mouse, toque, flechas y movimiento reducido.
- Crear y editar un producto con precio y otro bajo consulta.
- Confirmar que un producto sin precio nunca abre compra ni crea pedidos, y que WhatsApp conserva producto, opciones y enlace.
- Confirmar compilación, consola y carga de imágenes/videos sin errores.

## Detalles técnicos
- Mantener Three.js cargado solo en el navegador y liberar texturas, videos y eventos al desmontar.
- Usar los tokens visuales y controles existentes de la plataforma.
- No modificar tablas ni migraciones para este cambio.
