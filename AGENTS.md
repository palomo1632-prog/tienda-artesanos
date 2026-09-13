# AGENTS.md — Plantilla de tienda para artesanos (mapa técnico)

Guía técnica para agentes/codesarrolladores. **Si tu objetivo es adaptar la plantilla a un
artesano nuevo, leé `PLANTILLA-GUIA.md` primero** — este archivo es el mapa profundo para
debuggear o extender el código.

## 1. Qué es (30 segundos)

Tienda online **mobile-first** para artesanos: catálogo con fotos, venta por unidad y packs
x5/10/20/50/100 (configurables), carrito y **pedidos por WhatsApp** (sin pago online). Panel
`/admin` protegido para gestión por parte del artesano. **Sin frameworks ni build step**:
HTML/CSS/JS vanilla + Express + SQLite (better-sqlite3, síncrono) + Multer para fotos.

Principio rector: **todo lo variable del negocio sale de `config.json`** (raíz del proyecto).
Un cambio de feature nueva debe: 1) funcionar con cualquier tema, 2) usar `{marca}` en vez de
nombres fijos, 3) documentarse en `CONFIG-GUIA.md` si agrega configuración.

Textos en español rioplatense, tono cálido, SIN misticismo/esoterismo.

## 2. Mapa de archivos

```
config.json          ÚNICA fuente de verdad del negocio: marca, WhatsApp, Instagram, tema,
                     colores, textos, imágenes, secciones on/off, packs. Servido por GET /api/config
                     (se lee del disco en cada pedido: los cambios aplican sin reiniciar).
public/
  index.html         Tienda. IDs/clases ancla que el JS llena desde la config:
                     #linkTema, #btnHeroPrincipal/Secundario, #plancha{Sahumerios|Madera}{Img,Titulo,Desc},
                     #buscador, #catalogoVacio, #historia/#ferias (ocultables), #pieLogo,
                     #pieInstagram (con <span> para el handle), #burbujaWa, #carrito, #ficha,
                     #barraCompra, .banda__pista (marquesina), .heroe__* , .catalogo__*
  admin.html         Panel: login → tabs Productos/Contenido/Cupones + modal de producto
  css/temas/         tema-kraft.css | tema-jardin.css | tema-noche.css  ← TODAS las variables
                     :root y fondos de body/hojas viven acá. styles.css NO define colores.
  css/styles.css     Layout completo (clases): .etiqueta (card con agujerito+hilván),
                     .ficha/.hoja (bottom-sheets), .chip/.formato, .sello-giro, .burbuja-wa,
                     .banda, .ruta, .plancha, .pie__*
  css/admin.css      Solo el panel
  js/app.js          Tienda: carga /api/config + /api/products + /api/content al arranque,
                     aplica config (aplicarConfig()), catálogo/filtros/buscador, carrito en
                     localStorage ("casiopea_carrito"), cupón, checkout → wa.me.
                     FORMATOS se arma desde config.tienda.packs. demoProductos() = fallback
                     si /api falla (mantener coherente con el seed de db.js).
  js/admin.js        Panel: sesión, CRUD productos (FormData con foto), contenido, cupones
  assets/img/        logo, hero, kraft-texture.jpg, ilus-* (SIEMPRE versiones optimizadas ≤400KB)
  assets/fotos-w/    fotos de producto demo (cuadradas 800px webp)
  assets/fotos/      originales sin optimizar (referencia, no se enlazan)
server/
  index.js           Express: estáticos + GET /admin (ruta limpia) + /uploads (cache immutable)
                     + API pública y de admin. Sesiones en MEMORIA (Map + cookie HttpOnly
                     "casiopea_sesion"): reiniciar el proceso desloguea (normal).
  db.js              Esquema products/coupons/site_content/settings + scrypt de contraseña +
                     contenido por defecto + siembra demo (solo si products está vacía)
captacion/           Mini-app INDEPENDIENTE (opcional): formulario de postulación de artesanos
  server.js            → SQLite + panel /panel con export solicitud.json. Puerto 8091.
  public/              Formulario (index.html) y panel (panel.html)
```

## 3. Esquema de datos

**products**: `titulo, descripcion, foto (ruta /uploads/... o /assets/...), categoria
('sahumerios'|'madera' — también alimenta planchas/filtros), tipo ('packs'|'unitario'),
aroma (familia: dulce/amaderado/floral/citrico/especiado/resina — chips de filtro),
precios JSON {u,p5,p10,p20,p50,p100} (claves ausentes = formato no ofrecido; el precio/unidad
mostrado es el mínimo por unidad), stock (0 = "Sin stock"), destacado, novedad, orden`.

**site_content**: `historia_titulo, historia_texto, ferias (JSON array {fecha,lugar,detalle})`.
⚠️ La tabla puede estar VACÍA: entonces se sirven los defaults de `contenidoPorDefecto` en
db.js (y encima de eso los defaults de config.json si /api/content falla). No buscar en la BD
lo que se sirve desde defaults.

**settings**: `clave_panel` (scrypt). Default de primera instalación: `CLAVE_PANEL` en env o
clave impresa en consola al sembrar. **coupons**: `codigo (PK), tipo (porcentaje|monto), valor, activo`.

## 4. API

- Público: `GET /api/products` · `GET /api/content` · `GET /api/config` · `POST /api/coupon {codigo}`
- Admin (cookie): `POST /api/admin/login|logout` · `GET /api/admin/session` ·
  `POST/PUT/DELETE /api/admin/products[/:id]` (multipart, campo `foto`) ·
  `GET/POST /api/admin/coupons` · `POST /api/admin/coupons/:codigo/toggle` ·
  `DELETE /api/admin/coupons/:codigo` · `PUT /api/admin/content` · `POST /api/admin/clave`

Multer acepta imágenes por mimetype **o extensión** (curl manda octet-stream para .webp).

## 5. Gotchas de debugging (leídos y aprendidos a la hard)

1. **`[hidden]{display:none !important}` global en styles.css**: sin ella, cualquier
   `display:grid/flex` pisa el atributo `hidden` y "aparecen" elementos ocultos. No borrarla.
2. **Fuentes que "parecen tachadas" en screenshots**: los dígitos finos de Cormorant/Lora a
   ~20px aliasing en miniaturas de captura y SIMULAN un tachado. Es artefacto de la imagen
   escalada, no un bug. Verificar con zoom (PIL crop + resize NEAREST 3x) sobre el PNG real
   antes de tocar nada.
3. **Fondo de hojas/temas**: los colores viven SOLO en `css/temas/`. Si agregás un componente,
   usá las variables (`var(--kraft)` etc.), nunca colores fijos, o romperá los otros temas.
4. **Ruta limpia `/admin`**: existe porque express.static no resuelve admin.html sin extensión.
   Si agregás otra página con URL limpia, sumar su `app.get`.
5. **Sesiones en memoria**: reiniciar el proceso desloguea el panel (aceptado por diseño).
6. **better-sqlite3 es síncrono**: no envolver en promesas; en Windows usa prebuilds (Node ≥18).
7. **Fotos**: Multer filtra por mimetype O extensión. Nunca enlazar los originales de
   `assets/fotos/` (pesan MB): usar las versiones de `fotos-w/`/`img/` optimizadas.
8. **demoProductos() en app.js** es el fallback sin API; si cambiás el seed de db.js, no hace
   falta cambiarlo (sirve solo para abrir el HTML sin servidor).

## 6. Desarrollo local

```bash
npm install
node server/index.js        # tienda: http://localhost:3000 · panel: /admin
npm run captacion           # (opcional) formulario de postulación: http://localhost:8091
```

La primera corrida siembra 19 productos demo + cupón BIENVENIDA10 y muestra la clave del panel
en consola (configurable con `CLAVE_PANEL`). Reset total: borrar `server/data/` (NUNCA en
producción) y reiniciar.

## 7. Puesta en producción (resumen)

Necesita: un VPS con Node ≥18 y un dominio apuntando (para HTTPS). Pasos:

1. Subir el proyecto (sin `node_modules`, `server/data`, `server/uploads`).
2. `npm install --omit=dev` en el servidor.
3. Servicio systemd: `ExecStart=<ruta real de node> server/index.js`, env `PUERTO` (default 3000).
   ⚠️ verificar `which node` en el servidor: muchas veces NO es /usr/bin/node (status 203/EXEC
   = ruta de ExecStart mal).
4. Reverse proxy con HTTPS automático (Caddy recomendado):
   `midominio.com { reverse_proxy 127.0.0.1:<PUERTO> }`.
5. Abrir el puerto público solo vía el proxy (80/443); dejar la app escuchando en localhost o
   puerto interno.
6. Primer acceso al panel: cambiar la clave (POST /api/admin/clave o botón del panel).
7. Backups: `server/data/` + `server/uploads/` son TODO el estado del negocio.

## 8. Convenciones para features nuevas

- API en `server/index.js` (validar y acotar strings), esquema en `server/db.js`, UI vanilla
  en `public/` siguiendo el design system (§2). Sin frameworks, sin build.
- Si la feature es configurable → sumarla a `config.json` + `CONFIG-GUIA.md` + `PLANTILLA-GUIA.md`.
- Probar SIEMPRE con los 3 temas y en viewport mobile 390×844.
