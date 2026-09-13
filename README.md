![Vista de la tienda en escritorio](https://github.com/palomo1632-prog/tienda-artesanos/blob/main/tienda.png?raw=true)

![Vista de la tienda en celular](https://github.com/palomo1632-prog/tienda-artesanos/blob/main/tiendacelular.png?raw=true)

![Panel de administración en celular](https://github.com/palomo1632-prog/tienda-artesanos/blob/main/panelcelular.png?raw=true)


# 🌿 Plantilla de tienda online para artesanos

**Proyecto libre de uso.** Tienda mobile-first lista para adaptar a cualquier artesano:
catálogo con fotos, venta por unidad y packs, carrito y **pedidos por WhatsApp** (sin pago
online), panel de administración para gestionar productos desde el celular. Sin frameworks,
sin build step, sin servicios externos de pago: HTML/CSS/JS vanilla + Node/Express + SQLite.

> La instancia demo de esta plantilla es **Sahumerios Casiopea** (sahumerios artesanales y
> madera tallada, artesanos de feria que viajan en motorhome).

## 🚀 Arranque rápido

```bash
npm install
node server/index.js        # tienda: http://localhost:3000 · panel: /admin
```

La primera corrida siembra productos demo y muestra la clave del panel en la consola.

## 🎨 ¿Cómo se adapta a un artesano nuevo?

**Editando `config.json` y reemplazando imágenes. Nada más.** Marca, WhatsApp, Instagram,
textos, colores, tema visual, secciones, packs — todo sale de un solo archivo (guía campo por
campo en [`CONFIG-GUIA.md`](CONFIG-GUIA.md)).

Incluye **3 temas visuales** conmutables con una línea de config (`"tema"`):

| Tema | Ambiente |
|---|---|
| `kraft` | Rústico cálido: tinta grabada sobre cartón, sellos vintage (el original) |
| `jardin` | Botánico claro y aireado: verdes suaves y terracota |
| `noche` | Místico oscuro elegante: ámbar sobre marrón noche |

## 📚 Documentación

| Documento | Para qué |
|---|---|
| [`PLANTILLA-GUIA.md`](PLANTILLA-GUIA.md) | **Empezá acá**: procedimiento completo (para humanos y agentes de IA) para crear una tienda nueva con esta plantilla, incluyendo los prompts de imágenes |
| [`CONFIG-GUIA.md`](CONFIG-GUIA.md) | Guía campo por campo de `config.json` |
| [`AGENTS.md`](AGENTS.md) | Mapa técnico profundo: archivos, esquema de datos, API, gotchas de debugging, convenciones |
| [`README.md`](README.md) | Este archivo: uso y estructura |

## 🗂️ Estructura

```
config.json          ← todo lo variable del negocio (editá esto)
public/              tienda + panel (HTML/CSS/JS vanilla) + temas en css/temas/
server/              API Express + SQLite (index.js, db.js)
```

## 📄 Licencia / uso

Libre de usar, copiar y adaptar para cualquier artesano o proyecto. Si te sirve, mejoralo y
compartí las mejoras.
