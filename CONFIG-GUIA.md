# CONFIG-GUIA.md — Guía campo por campo de `config.json`

Este archivo es **la única edición necesaria** para adaptar la plantilla a un artesano nuevo
(junto con reemplazar las imágenes de `public/assets/`). Todo el frontend lo lee de
`GET /api/config` al cargar; los cambios de config.json NO requieren tocar código y se aplican
recargando la página (el servidor lo lee en cada pedido, no hace falta reiniciar).

Convención general: cualquier texto con `{marca}` se reemplaza automáticamente por el nombre
completo de la marca. Los campos vacíos o en `false` desactivan la función.

## Raíz

| Campo | Qué hace |
|---|---|
| `marca.nombre` | Nombre completo (títulos, mensaje de WhatsApp del pedido) |
| `marca.nombreCorto` | Lo que se ve en la cabecera junto al logo |
| `marca.lema` | Frase del pie de página |
| `contacto.whatsapp` | **Número de pedidos**, formato internacional sin `+` (ej Argentina: `5491123456789`) |
| `contacto.instagram` | Usuario SIN `@` |
| `contacto.instagramActivo` | `false` oculta el botón de Instagram del pie |
| `contacto.mensajeBurbuja` | Mensaje pre-cargado de la burbuja flotante (usar `{marca}`) |
| `contacto.mensajeConsulta` | Mensaje del botón "Escribinos" del pie |
| `tema` | `"kraft"` (rústico original), `"jardin"` (botánico claro) o `"noche"` (místico oscuro) |
| `colores` | Opcional. Sobrescribe variables CSS del tema, ej `{"teja": "#c0392b"}`. Variables disponibles: `kraft, kraft-claro, kraft-suave, tinta, tinta-2, madera, teja, crema, verde` |
| `imagenes` | Rutas de las imágenes (ver abajo). Reemplazar los archivos y/o cambiar rutas |
| `imagenes.heroPosicion` | CSS `object-position` del héroe: qué parte de la foto se ve en móvil |
| `secciones.historia` / `secciones.ferias` | `false` oculta esas secciones completas |
| `credito.texto` | Línea de crédito del pie (ej: "Creado con ♥️ por … para …"). `activo:false` lo oculta |
| `credito.captacion` | `{activo, url, texto}`: link del pie para que otros artesanos pidan su web. `activo:false` lo oculta |
| `tienda.moneda` | Solo estético (hoy se formatea como peso argentino) |
| `tienda.packs` | Tamaños de pack que se ofrecen, ej `[5,10,20,50,100]`. El formato "por unidad" siempre existe |

## `textos.*`

| Campo | Qué hace |
|---|---|
| `textos.banda` | Frases de la marquesina superior que se desliza (array, se repiten en bucle) |
| `textos.hero.*` | Portada: `eyebrow` (etiqueta chica), `palabra` (título gigante), `fonetica`, `definiciones` (array de líneas numeradas), `botonPrincipal`, `botonSecundario` |
| `textos.catalogo.*` | Títulos del catálogo, placeholder del buscador y mensaje "sin resultados" |
| `textos.categorias` | Las 2 planchas grandes: `{id: "sahumerios"|"madera", titulo, descripcion}`. El `id` debe ser uno de esos dos (así filtra el catálogo) |
| `textos.historia` | Sección "Nuestra historia" (los cambios desde el panel `/admin` pisan estos valores) |
| `textos.ferias` | Sección "Dónde encontrarnos": `paradas` es array de `{fecha, lugar, detalle}` |
| `textos.checkout.*` | Carrito: `tituloCarrito`, `subtituloCarrito` (usan `{marca}`), `etiquetaRetiro`, `etiquetaEnvio`, `pideNota` y `pideCupon` (`false` oculta el campo) |

## `imagenes.*`

| Clave | Dónde se ve | Medida recomendada |
|---|---|---|
| `logo` | Cabecera, pie, favicon | Cuadrada 900×900, fondo del color del tema |
| `hero` | Portada a pantalla completa | 1920×1080, composición con "aire" a la izquierda para el titular |
| `categoriaSahumerios` | Plancha de categoría | 1080×1080 (se recorta a 16:9) |
| `categoriaMadera` | Plancha de categoría | 1080×1080 |
| `historia` | Sección historia | 1920×800 panorámica |

> Los archivos viven en `public/assets/img/`. Podés usar `.webp` (recomendado, ~200-400 KB) o jpg/png.
> Convertir/optimizar: cualquier herramienta; los originales de ChatGPT (PNG 3 MB) NUNCA ir a producción.
