# PLANTILLA-GUIA.md — Cómo reutilizar esta plantilla para un artesano nuevo

**Para el agente de IA encargado de la adaptación:** este documento es tu procedimiento
completo. Léelo entero una vez y seguílo en orden; evita explorar el resto del código salvo
que algo falle (en `AGENTS.md` está el mapa técnico detallado).

**Para el humano:** al empezar una adaptación, dile al agente exactamente esto:
> "Descargá la plantilla de https://github.com/<USUARIO>/<REPO> y seguí PLANTILLA-GUIA.md
> para crear la página de este artesano. Te paso el material."

---

## El proyecto en 30 segundos

Tienda online **mobile-first** para artesanos: catálogo con fotos, venta por unidad y packs,
carrito y **pedidos por WhatsApp** (sin pago online). Panel `/admin` protegido para que el
artesano gestione productos/cupones/textos desde el celular. **Sin frameworks ni build**:
HTML/CSS/JS vanilla + Express + SQLite. Todo lo variable del negocio vive en **`config.json`**
(detalle en `CONFIG-GUIA.md`) — la adaptación es: editar config + reemplazar imágenes +
cargar productos. No rediseñes desde cero salvo que el artesano lo pida explícitamente.

## Requisitos del entorno

- Node.js ≥ 18 y npm. Git. Listo (no hay build step ni cuentas externas).
- Para el panel de captación (flujo B, opcional): mismo stack, puerto propio.

---

## FLUJO A — El artesano te pasa la información directamente

### Paso 1 · Reunir el material (pedilo TODO junto, en un solo mensaje)

Checklist para pedirle al artesano/humano (si falta algo, dejá el valor demo y marcándolo
en el resumen final):

1. Nombre de la marca + nombre corto (para la cabecera)
2. **WhatsApp de pedidos** con código de país (ej Argentina: `5491123456789`)
3. Usuario de Instagram (sin @) o "no tengo"
4. Lema o frase corta de la marca
5. Historia breve (cómo empezó, qué lo hace distinto) — 3-6 líneas
6. Qué vende: tipos de producto y ~10-20 productos con **título, descripción corta y precios**
   (unidad y, si vende packs, precio de cada pack)
7. Fotos de productos reales (las que tenga; si no, se generan con ChatGPT, paso 4)
8. Logo (si no tiene, se genera, paso 4)
9. Ciudad/provincia (para "dónde encontrarnos" si va a ferias)

### Paso 2 · Elegir tema y adaptar `config.json`

Presentale al artesano **las 3 opciones de diseño** (describíselas con palabras; si puede,
cambia `"tema"` en config.json y recarga para verlas):

| Tema | Ambiente | Ideal para |
|---|---|---|
| `kraft` | Rústico cálido, tinta sobre cartón, sellos vintage | Sahumerios, madera, cuero, mercería |
| `jardin` | Botánico claro y aireado, verdes suaves | Jabones, cosmética natural, velas, plantas |
| `noche` | Místico oscuro elegante, ámbar sobre marrón noche | Inciensos, cristales, joyería artesanal |

Después editá `config.json` siguiendo **`CONFIG-GUIA.md`** (guía campo por campo): marca,
contacto, textos, secciones on/off, packs. **No edites HTML/CSS para textos** — todo sale de
la config. Colores especiales: `colores` sobrescribe variables puntuales del tema.

### Paso 3 · Reemplazar/crear imágenes

Reemplazá en `public/assets/img/` (mismos nombres = cero cambios de config) y en
`public/assets/fotos-w/` las fotos de productos (cuadradas 800×800 webp, ver §imágenes).
Si el artesano no tiene logo/ilustraciones, dale los **prompts de ChatGPT** de la sección
"Prompts de imágenes" de abajo, un prompt por imagen, pidiéndole que respete medidas y estilo,
y que después de generar la primera la use como referencia de estilo ("mantené exactamente
este trazo y paleta") para las demás.

**Optimización obligatoria antes de producir**: los PNG de ChatGPT pesan 3 MB+. Convertí a
webp/jpg con cualquier herramienta (ej Python PIL) a ≤400 KB. En un clone con Node y Python:

```bash
python -c "
from PIL import Image; import os, sys
for f in sys.argv[1:]:
    im = Image.open(f).convert('RGB'); im.save(f.rsplit('.',1)[0]+'.webp','WEBP',quality=82)
    print(f, '->', os.path.getsize(f.rsplit('.',1)[0]+'.webp')//1024, 'KB')
" imagen1.png imagen2.png
```

### Paso 4 · Cargar los productos

Dos caminos (el segundo es mejor si el artesano va a autogestionarse):
- **Edición directa**: products en la BD vía `sqlite3` o editando `server/db.js` (función
  `sembrarDemo`) antes del primer arranque.
- **Recomendado**: arrancar el servidor, entrar a `/admin`, loguearse con la clave impresa en
  consola (o `CLAVE_PANEL` en env) y cargar los productos por el formulario (foto desde el
  celular incluida). Borrar los productos demo desde el panel.

### Paso 5 · Probar (checklist mínimo, 10 min)

1. `npm install && node server/index.js` → abrir `http://localhost:3000` con viewport mobile (390×844).
2. ¿Héroe muestra la marca correcta? ¿Catálogo carga los productos? ¿Buscador y filtros?
3. Agregar al carrito → cambiar formato → checkout completo → verificar que el mensaje de
   WhatsApp abre con el pedido y el número correcto.
4. `/admin` → login → crear/editar/borrar un producto → verificar en la tienda.
5. Cambiar cupón y probarlo en el carrito.
6. Si algo se ve "tachado/cortado" en capturas: es un artefacto de escalado de las miniaturas
   (ver AGENTS.md §5) — verificar con zoom sobre el PNG antes de "arreglar".

### Paso 6 · Publicar

Necesita un servidor (VPS) y un dominio apuntando. Procedimiento completo en `AGENTS.md` §7.
Resumen: `npm install --omit=dev` en el servidor → `systemd` apuntando a `server/index.js` →
reverse proxy con HTTPS (Caddy) → listo. Cambiar la clave del panel en el primer acceso.

---

## FLUJO B — El artesano llenó el formulario de captación

La página de captación de artesanos es un **proyecto aparte** (no forma parte de esta
plantilla): la opera quien regala las webs. Si te pasan un `solicitud.json` generado por ese
formulario (marca, WhatsApp, Instagram, ciudad, productos, historia y URLs de fotos), seguí el
FLUJO A usando esos datos directamente: completan `config.json` y los productos.
Las fotos del solicitante se descargan de las URLs del JSON y se optimizan igual (paso 3).

---

## Prompts de imágenes (ChatGPT) por tema

Dar SIEMPRE las medidas y pedir la primera imagen como referencia de estilo para las demás.
Sustituir lo que esté entre `<>`.

### Comunes a todos los temas (logo y fotos de producto)

1. **Logo** (2048×2048, cuadrado): "Emblema circular estilo sello vintage para la marca
   `<NOMBRE>`: ilustración line art de tinta `<NEGRA/COLOR>` sobre fondo `<COLOR DEL TEMA>`,
   con doble borde ornamentado y filigranas discretas. En el centro, `<ELEMENTO CENTRAL:
   ej. un sahumerio con humo en espiral / una cuchara de madera / una vela>` y pequeñas
   estrellas. Texto curvado arriba: `<TEXTO SUPERIOR>` y abajo: `<NOMBRE DE MARCA>`.
   Tipografía serif clásica. Bordes nítidos, alta resolución."
2. **Fotos de producto** (800×800): si el artesano no tiene fotos, "foto de producto
   artesanal de `<PRODUCTO>`, luz natural suave, fondo `<COLOR DEL TEMA>`, composición
   centrada, estilo cálido y auténtico de feria artesanal".

### TEMA KRAFT (rústico) — tinta negra sobre kraft `#C89B6D`, acentos `#5b3d24` y `#f6eedd`

3. **Héroe** (1920×1080): "Ilustración estilo grabado antiguo (line art, trazo negro fino,
   técnica xilografía) sobre fondo kraft texturizado color cartón (#C89B6D). Escena: `<ESCENA
   DEL OFICIO, ej: manos tallando madera con cincel / sahumerios atados con humo en espiral>`.
   Composición horizontal con los elementos principales en el tercio DERECHO para dejar
   espacio a texto en la izquierda. Estética cálida, artesanal, sin misticismo."
4. **Textura** (1024×1024): "Textura seamless de papel kraft/cartón artesanal color #C89B6D
   con grano sutil, sin elementos ni texto, repetible en mosaico." → `kraft-texture.jpg`
5. **Ilustración categoría A y B** (1080×1080): "Line art estilo grabado vintage, tinta negra
   sobre fondo kraft (#C89B6D): `<ESCENA A, ej: racimo de sahumerios atados>` / `<ESCENA B, ej:
   cincel y mazo sobre tablas talladas>`. Marco circular fino con filigranas discretas."
6. **Historia** (1920×800): "Line art estilo grabado antiguo, tinta negra sobre kraft (#C89B6D):
   `<ESCENA DE LA HISTORIA, ej: motorhome artesanal en un camino de campo con montañas y
   estrellas>`. Composición panorámica, cálida y nostálgica."

### TEMA JARDÍN (botánico claro) — fondo `#eef0e4`, verde `#5a6b3f`, terracota `#b0682f`

Mismas escenas, cambiando el estilo por: "Ilustración botánica delicada: líneas finas verde
bosque (#2c3524) y toques de acuarela suave en verde salvia y terracota (#b0682f) sobre fondo
crema roto (#eef0e4), hojas y ramitas como marco discreto, estética de herbario moderno,
mucho aire".

### TEMA NOCHE (místico oscuro) — fondo `#221509`, ámbar `#e09a5f`, crema `#f2e4cb`

Mismas escenas, cambiando el estilo por: "Ilustración line art dorada/ámbar (#e09a5f) sobre
fondo marrón noche muy oscuro (#221509), estrellas y destellos finos, atmósfera íntima y
elegante, estilo grabado antiguo en tinta clara, SIN gótico ni calaveras".

> Tras generar: recortar/optimizar (paso 3) y colocar en `public/assets/img/` con los mismos
> nombres que ya usa la config, o actualizar las rutas en `config.json → imagenes`.

---

## Mantener la plantilla viva (para el humano y agentes futuros)

- **Este repo es la plantilla maestra.** Si durante una adaptación arreglás un bug o agregás
  una función útil para todos, el cambio debe volver al repo (commit/push a la rama principal).
  La personalización del artesano vive SOLO en: `config.json`, `public/assets/` y la BD
  (`server/data/`, gitignoreada). Mantener esa frontera hace que actualizar la plantilla sea
  un `git pull`/merge sin conflictos.
- **Agregar funciones nuevas**: seguir los patrones existentes (§4 de AGENTS.md): API en
  `server/index.js`, esquema en `server/db.js`, UI vanilla en `public/`. Si una función tiene
  configuración, sumarla a `config.json` + `CONFIG-GUIA.md` + esta guía. Nada de frameworks.
- **Regla de oro**: cada feature nueva debe funcionar con cualquier tema y con cualquier
  texto de config (usar las variables CSS, no colores fijos; usar `{marca}`, no nombres fijos).
