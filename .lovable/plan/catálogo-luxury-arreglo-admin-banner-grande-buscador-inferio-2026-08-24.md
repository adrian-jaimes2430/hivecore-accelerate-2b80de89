# Catálogo Luxury: arreglo admin, banner grande, buscador inferior y burbuja 3D con Marel

## 1. Error al entrar a la gestión del catálogo Luxury

El error exacto todavía no está confirmado (el registro de compilación está limpio, así que es un fallo en tiempo de ejecución). Primer paso del trabajo: reproducirlo entrando a `/admin/luxury` con una sesión super admin en el navegador de pruebas, capturar el mensaje real de consola/red y corregir la causa (consulta a base de datos, permiso o render). No se toca nada más de esa pantalla hasta tener el error a la vista.

## 2. Banner publicitario superior (estilo shop.com)

Hoy el catálogo público usa una cinta delgada (`PromoTicker`) que se ve muy pequeña. Se reemplaza por un bloque superior grande:

- Collage de tarjetas flotantes con las imágenes/videos de las promos activas, a distintas alturas y tamaños, como en la referencia.
- Título/marca al centro y degradado hacia el fondo.
- Movimiento suave y profundidad 3D con three.js: las tarjetas reaccionan al puntero/scroll con paralaje ligero; en móvil y con "reduced motion" se degrada a una versión estática ligera.
- Alto generoso (aprox. 55–70% de pantalla en escritorio, más compacto en móvil), sin empujar el catálogo demasiado abajo.

## 3. Buscador inferior en el catálogo Luxury (público e interno)

Se reutiliza el patrón del catálogo base (`CatalogSearch`): píldora flotante fija en la parte inferior con resultados instantáneos al escribir.

- En el catálogo público se busca sobre los productos Luxury ya cargados (nombre, descripción, SKU, marca, categoría), agrupados por categoría, con imagen y precio de venta sugerido.
- Los resultados llevan a la ficha pública `/catalogo/{slug}` conservando el `?ref=` del impulsador.
- Convive con el buscador interno existente sin superponerse a la barra móvil.

## 4. Burbuja 3D de chat con Marel (reemplaza el botón de WhatsApp)

- El botón verde de WhatsApp del catálogo Luxury se reemplaza por una burbuja de conversación en 3D (three.js, con animación de flotado y respuesta al hover/tap).
- Al pulsarla se abre un chat ligero con Marel para visitantes: responde dudas del catálogo público (productos, precios, disponibilidad) sin necesidad de cuenta y sin guardar historial en base de datos (solo en el navegador durante la visita).
- Cuando Marel detecta intención de compra o necesidad de ayuda humana, muestra un botón de "Continuar por WhatsApp" con el mensaje ya redactado y dirigido a:
  1. el impulsador del `?ref=` del enlace compartido, si existe;
  2. si no hay impulsador (enlaces públicos de Meta Ads), el número de la cuenta de tráfico pago / pruebas (`studio.ayosoluciones@gmail.com`), y como último respaldo el número oficial actual.

## Detalles técnicos

- Nueva dependencia: `three` (+ tipos). Se carga solo en el cliente mediante import dinámico dentro de `<ClientOnly>`, para no romper el renderizado en servidor.
- Componentes nuevos: `src/components/luxury/PromoHero3D.tsx` (banner), `src/components/luxury/LuxurySearchDock.tsx` (buscador inferior), `src/components/marel/MarelBubble3D.tsx` + `MarelPublicChat.tsx` (burbuja y chat).
- Nueva función de servidor pública `askMarelPublic` en `src/lib/marel-public.functions.ts`, sin autenticación, con límite de longitud y de mensajes por sesión, que reutiliza `buildCatalogContext` limitado al catálogo Luxury público y devuelve además una señal de "derivar a WhatsApp".
- El número de destino se resuelve con un helper que consulta el teléfono del perfil de tráfico pago y cae a `DEFAULT_WHATSAPP` de `src/lib/whatsapp.ts`.
- `PromoTicker` deja de usarse en el catálogo público (se mantiene el archivo por si se reutiliza en otra vista).

## Pendiente de confirmar

Si el número de "cuenta de prueba" para enlaces sin impulsador debe ser distinto al del perfil de tráfico pago, indícalo y lo fijo directamente.
