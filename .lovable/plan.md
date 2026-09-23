# Pago anticipado por producto e imágenes completas

## Objetivo
Permitir que cada producto Luxury vendido con precio pueda aceptar ambos métodos de pago o únicamente pago anticipado, y evitar que las fotos se recorten en los catálogos Luxury y base.

## Cambios

### 1. Modalidad de pago en Admin Luxury
- Añadir al formulario de creación y edición una selección clara entre “Pago anticipado o contra entrega” y “Solo pago anticipado”.
- Guardar la selección dentro de los atributos existentes del producto, sin modificar tablas.
- Mantener “ambos métodos” como valor predeterminado para todos los productos actuales y nuevos, salvo que se seleccione expresamente “solo pago anticipado”.

### 2. Compra pública y pedidos de impulsadores
- En la ficha pública Luxury, pasar la modalidad configurada al formulario de compra.
- Cuando el producto sea solo pago anticipado, mostrar únicamente “Pagar ahora”, seleccionarlo automáticamente y evitar que se envíe pago contra entrega.
- Aplicar la misma restricción al flujo interno del impulsador: esos productos no podrán generar pedidos manuales contra entrega y dirigirán a la ficha pública para pagar ahora.
- Mantener sin cambios los productos con precio por confirmar, que continúan usando consulta por WhatsApp.

### 3. Imágenes completas
- Cambiar las imágenes principales y miniaturas de las fichas, tarjetas y vistas rápidas de los catálogos Luxury y base para usar encuadre completo en lugar de recorte.
- Conservar un fondo neutro y dimensiones estables para que imágenes verticales, cuadradas o con varios productos se vean completas sin deformarse.
- Mantener el recorte únicamente en piezas publicitarias donde la imagen funciona como fondo.

## Verificación
- Crear o editar un producto Luxury como “solo pago anticipado” y confirmar que no aparece pago contra entrega.
- Confirmar que un producto normal mantiene ambos métodos y que uno sin precio mantiene la consulta.
- Revisar en móvil y escritorio tarjetas, vista rápida, ficha Luxury y ficha base con imágenes verticales y composiciones de varios productos.
- Validar compilación, consola y el flujo de compra hasta el envío del formulario.

## Detalles técnicos
- La modalidad se guardará en `attributes.online_payment_only` para evitar una migración de base de datos.
- La restricción se aplicará también en el servidor al crear pedidos públicos, no solo en la interfaz.
