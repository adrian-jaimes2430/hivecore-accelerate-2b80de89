# Hivecore Commerce

Crear una aplicación web SaaS privada llamada “HIVECORE”.

OBJETIVO:
Construir una plataforma comercial inteligente para impulsadores, donde puedan acceder a un catálogo premium de productos, compartir productos, visualizar funnels de venta y gestionar pedidos dentro del ecosistema Company A&O Ecosystem.

IMPORTANTE:
NO crear un ecommerce tradicional.
NO crear una tienda básica.
La experiencia debe sentirse como una plataforma comercial moderna y premium.

STACK:

Frontend:

React

TypeScript

Tailwind

Shadcn UI

Backend:

Supabase

Hosting:

Vercel

Storage:

Supabase Storage

DISEÑO:

Inspiración:

Shopify

Kommo

Stripe

Linear

Framer

Apple

Estilo:

Futurista

Premium

Minimalista

Dark mode

Glassmorphism

UX limpia

COLORES:

Base:

Negro profundo

Gris grafito

Blanco humo

Acentos:

Rojo A&O

Verde NomadHive

Naranja ANMA

FUNCIONALIDADES:

1. AUTENTICACIÓN

Sistema privado de acceso.

Roles:

Super Admin

Colaborador

Gestión de productos

Gestión de impulsadores

Impulsador

Solo usuarios aprobados pueden ingresar.

2. DASHBOARD IMPULSADOR

Cada impulsador verá:

Productos destacados

Categorías

Productos más vendidos

Productos recomendados

Nuevos lanzamientos

Productos tendencia

Diseño moderno tipo SaaS.

3. CATÁLOGO PREMIUM

Cada producto debe incluir:

Nombre

Categoría

Precio

Upsell

Descripción

Beneficios

Imágenes

CTA

Funnel completo

4. FUNNEL POR PRODUCTO

Al abrir un producto NO mostrar ficha básica.

Mostrar:

Landing premium tipo funnel

Secciones visuales completas

Imágenes verticales

Storytelling

Beneficios

CTA

Escasez

Oferta

Inspiración:
https://emanuelbolivar.com/aguaje2

5. GENERADOR DE PEDIDOS

El impulsador puede:

Crear orden

Capturar datos del cliente

Generar código único

Guardar pedido

Compartir pedido

Datos:

Nombre cliente

Teléfono

Dirección

Producto

Cantidad

Observaciones

6. COMPARTIR

Cada producto debe permitir:

Compartir por WhatsApp

Compartir por Email

Copiar enlace

Compartir categoría completa

7. PANEL ADMINISTRATIVO

Super Admin puede:

Aprobar impulsadores

Bloquear cuentas

Crear productos

Editar productos

Eliminar productos

Crear categorías

Editar funnels

Subir imágenes

Gestionar usuarios

Asignar permisos

8. GESTIÓN DE FUNNELS

Al crear producto:

Permitir subir:

imágenes

banners

secciones

textos

beneficios

testimonios

CTA

El funnel debe construirse visualmente desde el panel.

9. SISTEMA DE ROLES

Permisos independientes.

Ejemplo:

algunos colaboradores solo editan productos

otros solo aprueban usuarios

otros solo gestionan categorías

10. MÉTRICAS

Mostrar:

productos más vendidos

impulsadores destacados

pedidos generados

actividad reciente

11. FUTURO

Preparar arquitectura escalable para:

IA integrada

recomendaciones automáticas

automatizaciones

wallet

comisiones

leaderboard

gamificación

12. RESPONSIVE

Perfecta en:

desktop

tablet

mobile

13. EXPERIENCIA

La plataforma debe sentirse:

extremadamente moderna

premium

rápida

limpia

corporativa

NO quiero una app básica.

Quiero una experiencia tipo startup tecnológica internacional.

14. RUTAS

Landing:
/

Login:
/login

Dashboard:
/app

Admin:
/admin

Producto:
/product/:slug

Categoría:
/category/:slug

15. OBJETIVO FINAL

Construir el núcleo comercial digital del sistema de impulsadores de Company A&O Ecosystem. puedes usar el favicon subido como logo de la plataforma

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://hivecore-accelerate.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/77c6b513-d8a7-4570-b2ba-3d1a42a2e650).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
