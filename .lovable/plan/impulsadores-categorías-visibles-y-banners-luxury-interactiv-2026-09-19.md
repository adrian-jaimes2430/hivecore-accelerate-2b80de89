# Impulsadores, categorías visibles y banners Luxury interactivos

## 1. Eliminación definitiva de impulsadores

- Añadir en **Admin → Impulsadores** una acción visible solo para superadministradores.
- Usar una confirmación reforzada antes de borrar para evitar acciones accidentales.
- Ejecutar el borrado en el servidor, comprobando nuevamente que quien solicita la acción sea superadministrador.
- Impedir que el administrador elimine su propia cuenta.
- Conservar los pedidos históricos: antes de eliminar la cuenta, desligar sus pedidos del usuario y guardar una referencia legible del impulsador eliminado para los reportes.
- Eliminar definitivamente su acceso, perfil, rol e historial privado de Marel; refrescar inmediatamente el listado del panel.

## 2. Colores e iconos de categorías

- Crear una única correspondencia entre los valores del editor (`YELLOW`, `DIAMOND`, etc.), colores visuales e iconos reales.
- Mostrar una vista previa del color y el icono dentro del editor de categoría.
- Aplicar esos valores en las categorías del catálogo base, tanto en el inicio interno como en las páginas y controles públicos donde aparecen.
- Mantener textos y contraste legibles en escritorio y móvil, incluso si una categoría no tiene icono o color configurado.

## 3. Banner Luxury en fichas 3D

- Mantener únicamente los publicitarios activos, respetando su orden configurado.
- Sustituir la composición actual por un carrusel/abanico más sencillo: una ficha frontal completamente visible y fichas laterales reconocibles.
- Hacer que cada ficha muestre claramente su propia imagen o video, título, descripción y botón configurado.
- Permitir pulsar una ficha lateral para llevarla al frente; pulsar la ficha frontal o su botón abrirá el enlace configurado.
- Mantener cambio automático, controles manuales, arrastre táctil y una versión estable para movimiento reducido o falta de WebGL.

## 4. Validación

- Verificar el editor de categorías y su reflejo visual en catálogo interno y público.
- Verificar el borrado con pedidos existentes y confirmar que las ventas permanecen visibles.
- Probar el banner en escritorio y móvil: orden, contenido, reproducción, arrastre, clic y apertura del enlace.
- Revisar errores de compilación, consola, ejecución y peticiones antes de finalizar.

## Detalles técnicos

- El borrado utilizará una función protegida de servidor y acceso administrativo solo después de validar el rol con la sesión real.
- La base de datos recibirá un cambio aditivo para preservar el historial de pedidos sin borrar ventas: referencia opcional al usuario y campos de identificación histórica; no se eliminarán columnas actuales.
- Los iconos usarán la biblioteca visual existente y los colores se expresarán mediante tokens/clases semánticas compartidas.
- La interacción de fichas 3D usará detección de clic sobre objetos y distinguirá clic de arrastre.
