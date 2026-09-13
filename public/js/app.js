/* ============================================================
   SAHUMERIOS CASIOPEA — tienda
   Catálogo + carrito + checkout por WhatsApp
   ============================================================ */
"use strict";

/* La configuración real vive en /config.json (ver CONFIG-GUIA.md).
   Este bloque es solo el fallback si la API no responde. */
const CONFIG = {
  whatsapp: "5491166728297",
};
let CFG = null; // config.json cargada al arrancar

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const dinero = (n) =>
  "$ " + n.toLocaleString("es-AR", { maximumFractionDigits: 0 });

const FORMATOS_BASE = [{ id: "u", etiqueta: "x 1", sub: "unidad" }];
let FORMATOS = FORMATOS_BASE.slice();
const packsDe = () => (CFG && CFG.tienda && CFG.tienda.packs) || [5, 10, 20, 50, 100];
function armarFormatos() {
  FORMATOS = FORMATOS_BASE.concat(
    packsDe().map((n) => ({ id: "p" + n, etiqueta: "x " + n, sub: "pack" }))
  );
}
armarFormatos();
const nombreFormato = (id) => {
  const f = FORMATOS.find((f) => f.id === id);
  return f ? (id === "u" ? "unidad" : `pack x${f.etiqueta.slice(2)}`) : id;
};

/* ---------- estado ---------- */
let productos = [];
let contenido = {};
let carrito = JSON.parse(localStorage.getItem("casiopea_carrito") || "[]");
let cuponAplicado = null;
let filtroActual = "todos";
let busquedaActual = "";
let fichaActual = null; // {producto, formato, cantidad}

const guardarCarrito = () =>
  localStorage.setItem("casiopea_carrito", JSON.stringify(carrito));

const precioDe = (p, formato) => (p.precios && p.precios[formato]) || 0;
const unidadesDe = (formato) =>
  formato === "u" ? 1 : parseInt(nombreFormato(formato).replace(/\D/g, ""), 10);
const precioMinimo = (p) => {
  if (!p.precios) return 0;
  const vals = Object.entries(p.precios)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => v / unidadesDe(k));
  return vals.length ? Math.min(...vals) : 0;
};

/* ---------- carga inicial ---------- */
async function cargar() {
  try {
    const [rp, rc, rcf] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/content"),
      fetch("/api/config"),
    ]);
    productos = await rp.json();
    contenido = await rc.json();
    CFG = await rcf.json();
  } catch (e) {
    productos = JSON.parse(localStorage.getItem("casiopea_demo") || "[]");
  }
  if (!productos.length) productos = demoProductos();
  aplicarConfig();
  aplicarContenido();
  pintarChips();
  pintarCatalogo();
  pintarCarrito();
  actualizarContadores();
}

function aplicarConfig() {
  if (!CFG) return;
  const q = (sel) => document.querySelector(sel);
  const marca = (CFG.marca && CFG.marca.nombre) || "la tienda";
  const corto = (CFG.marca && CFG.marca.nombreCorto) || marca;

  if (CFG.tema) {
    const link = q("#linkTema");
    if (link) link.href = "/css/temas/tema-" + CFG.tema + ".css";
  }
  if (CFG.colores)
    for (const [k, v] of Object.entries(CFG.colores))
      document.documentElement.style.setProperty("--" + k, v);

  if (CFG.contacto && CFG.contacto.whatsapp) CONFIG.whatsapp = CFG.contacto.whatsapp;

  const burbuja = q("#burbujaWa");
  if (burbuja && CFG.contacto) {
    const msg = ((CFG.contacto.mensajeBurbuja || "").replaceAll("{marca}", marca)) ||
      "¡Hola " + marca + "! Les escribo desde su página web.";
    burbuja.href = "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(msg);
  }

  const banda = CFG.textos && CFG.textos.banda;
  if (Array.isArray(banda) && banda.length) {
    const tira = banda.join("&nbsp;✦&nbsp;") + "&nbsp;✦&nbsp;";
    q(".banda__pista").innerHTML = "<span>" + tira + "</span><span>" + tira + "</span>";
  }

  const hero = CFG.textos && CFG.textos.hero;
  if (hero) {
    if (hero.eyebrow) q(".heroe__eyebrow").textContent = hero.eyebrow;
    if (hero.palabra) q(".heroe__palabra").textContent = hero.palabra;
    if (hero.fonetica) q(".heroe__fonetica").textContent = hero.fonetica;
    if (Array.isArray(hero.definiciones))
      q(".heroe__definicion").innerHTML =
        hero.definiciones.map((d, i) => (i + 1) + ".&nbsp; " + d).join("<br>");
    if (hero.botonPrincipal) q("#btnHeroPrincipal").textContent = hero.botonPrincipal;
    if (hero.botonSecundario) q("#btnHeroSecundario").textContent = hero.botonSecundario;
  }

  const img = CFG.imagenes || {};
  if (img.hero) {
    const heroImg = q(".heroe__imagen img");
    if (heroImg) {
      heroImg.src = img.hero;
      const src = q(".heroe__imagen source");
      if (src) src.srcset = img.hero;
      if (img.heroPosicion) heroImg.style.objectPosition = img.heroPosicion;
    }
  }
  if (img.logo) {
    q(".cabecera__logo").src = img.logo;
    const pl = q("#pieLogo"); if (pl) pl.src = img.logo;
  }

  const cats = (CFG.textos && CFG.textos.categorias) || [];
  const nombreCat = { sahumerios: "Sahumerios", madera: "Madera" };
  cats.forEach((c) => {
    const base = "plancha" + (nombreCat[c.id] || "");
    if (!c.id || !q("#" + base)) return;
    if (c.titulo) q("#" + base + "Titulo").textContent = c.titulo;
    if (c.descripcion) q("#" + base + "Desc").textContent = c.descripcion;
    const im = img["categoria" + (nombreCat[c.id] || "")];
    if (im) q("#" + base + "Img").src = im;
  });

  const cat = CFG.textos && CFG.textos.catalogo;
  if (cat) {
    if (cat.eyebrow) q(".catalogo__eyebrow").textContent = cat.eyebrow;
    if (cat.titulo) q(".catalogo__titulo").textContent = cat.titulo;
    if (cat.placeholderBusqueda) q("#buscador").placeholder = cat.placeholderBusqueda;
    if (cat.mensajeVacio) q("#catalogoVacio").textContent = cat.mensajeVacio;
  }

  if (CFG.marca) {
    q(".cabecera__nombre").textContent = corto;
    const lemaPie = q(".pie__nombre");
    if (lemaPie) lemaPie.textContent = marca;
    if (CFG.marca.lema) q(".pie__frase").textContent = CFG.marca.lema;
  }
  const ig = q("#pieInstagram");
  if (ig) {
    const activo = CFG.contacto && CFG.contacto.instagramActivo !== false && CFG.contacto.instagram;
    ig.hidden = !activo;
    if (activo) {
      ig.href = "https://www.instagram.com/" + CFG.contacto.instagram + "/";
      ig.querySelector("span").textContent = "@" + CFG.contacto.instagram;
    }
  }

  const sec = CFG.secciones || {};
  if (sec.historia === false) { const el = q("#historia"); if (el) el.hidden = true; }
  if (sec.ferias === false) { const el = q("#ferias"); if (el) el.hidden = true; }
  if (sec.historia === false && sec.ferias === false) { const el = q("#btnHeroSecundario"); if (el) el.hidden = true; }

  const ck = CFG.textos && CFG.textos.checkout;
  if (ck) {
    if (ck.tituloCarrito) _ckTitulo = ck.tituloCarrito.replaceAll("{marca}", marca);
    if (ck.subtituloCarrito) _ckSubtitulo = ck.subtituloCarrito.replaceAll("{marca}", marca);
    _ckEtiquetas = ck;
  }
  _ckMarca = marca;
}
let _ckTitulo = "Tu pedido", _ckSubtitulo = "— nota de la tienda —", _ckMarca = "la tienda", _ckEtiquetas = {};

function aplicarContenido() {
  if (contenido.historia_titulo)
    $("#historiaTitulo").textContent = contenido.historia_titulo;
  if (contenido.historia_texto)
    $("#historiaTexto").textContent = contenido.historia_texto;
  if (Array.isArray(contenido.ferias) && contenido.ferias.length) {
    $("#listaFerias").innerHTML = contenido.ferias
      .map(
        (f) => `
      <div class="ruta__parada">
        <span class="ruta__punto"></span>
        <div>
          ${f.fecha ? `<span class="ruta__fecha">${escapar(f.fecha)}</span>` : ""}
          <strong>${escapar(f.lugar)}</strong>
          <p>${escapar(f.detalle || "")}</p>
        </div>
      </div>`
      )
      .join("");
  }
}

/* ---------- chips de filtro ---------- */
const FAMILIAS = [
  { id: "todos",     nombre: "Todo" },
  { id: "sahumerios",nombre: "Sahumerios" },
  { id: "madera",    nombre: "Madera tallada" },
  { id: "dulce",     nombre: "Dulces" },
  { id: "amaderado", nombre: "Amaderados" },
  { id: "floral",    nombre: "Florales" },
  { id: "citrico",   nombre: "Cítricos" },
  { id: "especiado", nombre: "Especiados" },
  { id: "resina",    nombre: "Resinas" },
];
function pintarChips() {
  $("#chipsFamilia").innerHTML = FAMILIAS.map(
    (f) =>
      `<button class="chip" role="tab" aria-selected="${f.id === filtroActual}" data-familia="${f.id}">${f.nombre}</button>`
  ).join("");
  $$("#chipsFamilia .chip").forEach((c) =>
    c.addEventListener("click", () => {
      filtroActual = c.dataset.familia;
      pintarChips();
      pintarCatalogo();
    })
  );
}

/* ---------- catálogo ---------- */
function productosFiltrados() {
  const q = busquedaActual.trim().toLowerCase();
  return productos.filter((p) => {
    const okFamilia =
      filtroActual === "todos" ||
      p.categoria === filtroActual ||
      p.aroma === filtroActual;
    const okQ =
      !q ||
      (p.titulo + " " + (p.descripcion || "") + " " + (p.aroma || ""))
        .toLowerCase()
        .includes(q);
    return okFamilia && okQ;
  });
}

function pintarCatalogo() {
  const lista = productosFiltrados();
  $("#catalogoVacio").hidden = lista.length > 0;
  $("#grillaProductos").innerHTML = lista
    .map((p, i) => {
      const agotada = (p.stock ?? 1) <= 0;
      const esPack = p.tipo === "packs" && precioDe(p, "p5") > 0;
      return `
      <article class="etiqueta ${agotada ? "etiqueta--agotada" : ""}" style="animation-delay:${Math.min(i * 40, 400)}ms">
        <button class="etiqueta__foto" data-ver="${p.id}" aria-label="Ver ${escapar(p.titulo)}">
          <img src="${p.foto}" alt="${escapar(p.titulo)}" loading="lazy" width="800" height="800">
          <span class="etiqueta__badges">
            ${p.novedad ? '<span class="badge badge--novedad">Novedad</span>' : ""}
            ${p.destacado ? '<span class="badge badge--top">Top ventas</span>' : ""}
          </span>
        </button>
        <h3 class="etiqueta__nombre">${escapar(p.titulo)}</h3>
        ${p.aroma ? `<p class="etiqueta__aroma">${escapar(nombreAroma(p.aroma))}</p>` : ""}
        <div class="etiqueta__pie">
          <span class="etiqueta__desde">${agotada ? "Sin stock" : esPack ? "desde" : "precio"}</span>
          <span class="etiqueta__precio">${agotada ? "—" : dinero(precioMinimo(p))}<small>/u</small></span>
        </div>
        ${
          agotada
            ? ""
            : `<button class="etiqueta__agregar" data-rapido="${p.id}">+ Agregar</button>`
        }
      </article>`;
    })
    .join("");

  $$("#grillaProductos [data-ver]").forEach((b) =>
    b.addEventListener("click", () => abrirFicha(b.dataset.ver))
  );
  $$("#grillaProductos [data-rapido]").forEach((b) =>
    b.addEventListener("click", () => agregarRapido(b.dataset.rapido))
  );
}

const nombreAroma = (a) =>
  ({
    dulce: "familia dulce",
    amaderado: "familia amaderada",
    floral: "familia floral",
    citrico: "familia cítrica",
    especiado: "familia especiada",
    resina: "resinas e inciensos",
  }[a] || a);
const escapar = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

/* ---------- ficha ---------- */
function abrirFicha(id) {
  const p = productos.find((x) => String(x.id) === String(id));
  if (!p) return;
  const agotada = (p.stock ?? 1) <= 0;
  const formatosDisponibles =
    p.tipo === "packs"
      ? FORMATOS.filter((f) => precioDe(p, f.id) > 0)
      : FORMATOS.filter((f) => f.id === "u");
  fichaActual = { producto: p, formato: formatosDisponibles[0]?.id || "u" };

  $("#ficha").innerHTML = `
    <button class="ficha__cerrar" data-cerrar aria-label="Cerrar">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg>
    </button>
    <div class="ficha__grilla">
      <div class="ficha__foto"><img src="${p.foto}" alt="${escapar(p.titulo)}"></div>
      <div>
        ${p.aroma ? `<p class="ficha__aroma">${escapar(nombreAroma(p.aroma))}</p>` : ""}
        <h3 class="ficha__nombre">${escapar(p.titulo)}</h3>
        <p class="ficha__desc">${escapar(p.descripcion || "")}</p>
        <div class="ficha__formatos">
          <p class="ficha__formatos-titulo">Elegí el formato</p>
          <div class="formatos">
            ${formatosDisponibles
              .map(
                (f) => `
              <button class="formato" data-formato="${f.id}" aria-pressed="${f.id === fichaActual.formato}">
                ${f.etiqueta}<small>${f.sub} · ${dinero(precioDe(p, f.id))}</small>
              </button>`
              )
              .join("")}
          </div>
        </div>
        <div class="ficha__pie">
          <div class="ficha__total">
            <small>Total</small>
            <strong id="fichaTotal">${dinero(precioDe(p, fichaActual.formato))}</strong>
          </div>
          <button class="btn-agregar" id="fichaAgregar" ${agotada ? "disabled" : ""}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
            Agregar al pedido
          </button>
        </div>
      </div>
    </div>`;

  abrirHoja("#ficha", "#veloFicha");
  $$("#ficha .formato").forEach((b) =>
    b.addEventListener("click", () => {
      fichaActual.formato = b.dataset.formato;
      $$("#ficha .formato").forEach((x) =>
        x.setAttribute("aria-pressed", x === b ? "true" : "false")
      );
      $("#fichaTotal").textContent = dinero(
        precioDe(p, fichaActual.formato)
      );
    })
  );
  $("#fichaAgregar").addEventListener("click", () => {
    agregarAlCarrito(p, fichaActual.formato, 1);
    cerrarFicha();
  });
  $$("#ficha [data-cerrar]").forEach((b) =>
    b.addEventListener("click", cerrarFicha)
  );
}
const cerrarFicha = () => cerrarHoja("#ficha", "#veloFicha");

/* ---------- carrito ---------- */
function agregarAlCarrito(p, formato, cantidad = 1) {
  const clave = `${p.id}-${formato}`;
  const existente = carrito.find((l) => l.clave === clave);
  if (existente) existente.cantidad += cantidad;
  else
    carrito.push({
      clave,
      id: p.id,
      formato,
      cantidad,
      titulo: p.titulo,
      foto: p.foto,
      precio: precioDe(p, formato),
    });
  guardarCarrito();
  pintarCarrito();
  actualizarContadores();
  avisar(`${p.titulo} agregado 🌿`);
}
function agregarRapido(id) {
  const p = productos.find((x) => String(x.id) === String(id));
  if (!p) return;
  const formato =
    p.tipo === "packs" && precioDe(p, "u") > 0 ? "u" : FORMATOS.find((f) => precioDe(p, f.id) > 0)?.id;
  if (formato) agregarAlCarrito(p, formato, 1);
}

const totalCarrito = () =>
  carrito.reduce((s, l) => s + l.precio * l.cantidad, 0);

function pintarCarrito() {
  const cont = $("#carritoContenido");
  if (!carrito.length) {
    cont.innerHTML = `
      <h3 class="pedido__titulo">${escapar(_ckTitulo)} está vacío</h3>
      <div class="carrito-vacio">
        <p>Todavía no elegiste ningún aroma…</p>
        <button class="btn-sello" data-seguir>Ver el catálogo</button>
      </div>`;
    $("[data-seguir]", cont).addEventListener("click", cerrarCarrito);
    return;
  }
  const subtotal = totalCarrito();
  const descuento = cuponAplicado
    ? cuponAplicado.tipo === "porcentaje"
      ? Math.round((subtotal * cuponAplicado.valor) / 100)
      : Math.min(cuponAplicado.valor, subtotal)
    : 0;

  cont.innerHTML = `
    <h3 class="pedido__titulo">Tu pedido</h3>
    <p class="pedido__sub">— nota de Casiopea —</p>
    <div class="pedido__lineas">
      ${carrito
        .map(
          (l) => `
        <div class="linea-pedido">
          <img src="${l.foto}" alt="" width="52" height="52">
          <div class="linea-pedido__datos">
            <p class="linea-pedido__nombre">${escapar(l.titulo)}</p>
            <p class="linea-pedido__formato">${escapar(nombreFormato(l.formato))}</p>
            <button class="linea-pedido__quitar" data-quitar="${l.clave}">quitar</button>
          </div>
          <div class="linea-pedido__cant">
            <button class="cant-btn" data-menos="${l.clave}" aria-label="Menos">−</button>
            <span>${l.cantidad}</span>
            <button class="cant-btn" data-mas="${l.clave}" aria-label="Más">+</button>
          </div>
          <span class="linea-pedido__precio">${dinero(l.precio * l.cantidad)}</span>
        </div>`
        )
        .join("")}
    </div>
    <div class="perforacion" aria-hidden="true"></div>
    <div class="pedido__totales">
      <div class="pedido__fila"><span>Subtotal</span><span>${dinero(subtotal)}</span></div>
      ${
        cuponAplicado
          ? `<div class="pedido__fila" style="color:var(--verde)"><span>Cupón ${escapar(cuponAplicado.codigo)} (${cuponAplicado.tipo === "porcentaje" ? cuponAplicado.valor + "%" : dinero(cuponAplicado.valor)})</span><span>−${dinero(descuento)}</span></div>`
          : ""
      }
      <div class="pedido__fila pedido__fila--total"><span>Total</span><strong>${dinero(subtotal - descuento)}</strong></div>
    </div>

    <div class="form-checkout">
      <div class="campo">
        <label for="ckNombre">Tu nombre</label>
        <input id="ckNombre" autocomplete="name" placeholder="Nombre y apellido">
      </div>
      <div class="campo-duo">
        <div class="campo">
          <label for="ckTel">Teléfono</label>
          <input id="ckTel" type="tel" inputmode="tel" autocomplete="tel" placeholder="11 2345 6789">
        </div>
        ${(_ckEtiquetas && _ckEtiquetas.pideCupon === false) ? "" : `
        <div class="campo">
          <label for="ckCupon">Cupón (opcional)</label>
          <div class="fila-cupon">
            <input id="ckCupon" placeholder="CÓDIGO">
            <button class="btn-cupon" id="btnCupon">OK</button>
          </div>
          <span id="cuponAviso"></span>
        </div>`}
      </div>
      <div class="campo">
        <label>¿Retirás o te lo enviamos?</label>
        <div class="eleccion" id="ckEntrega">
          <button data-entrega="retiro" aria-pressed="true">${escapar((_ckEtiquetas && _ckEtiquetas.etiquetaRetiro) || "🏠 Retiro en Feria/Casa")}</button>
          <button data-entrega="envio" aria-pressed="false">${escapar((_ckEtiquetas && _ckEtiquetas.etiquetaEnvio) || "📦 Envío a domicilio")}</button>
        </div>
      </div>
      <div class="campo" id="campoDireccion" hidden>
        <label for="ckDireccion">Dirección de envío</label>
        <input id="ckDireccion" autocomplete="street-address" placeholder="Calle, número, ciudad">
      </div>
      ${(_ckEtiquetas && _ckEtiquetas.pideNota === false) ? "" : `
      <div class="campo">
        <label for="ckNota">Nota para nosotros (opcional)</label>
        <textarea id="ckNota" rows="2" placeholder="Ej: si tienen stock de otro aroma, ¡avisenme!"></textarea>
      </div>`}
      <button class="btn-wa" id="btnWhatsApp">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.5.5c-.2.2-.3.4-.1.7.2.3.8 1.4 1.8 2.2 1.2 1.1 2.3 1.4 2.6 1.6.3.1.5.1.7-.1l1-1.2c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.4 0 .1 0 .8-.2 1.4Z"/></svg>
        Enviar pedido por WhatsApp
      </button>
    </div>`;

  // eventos
  $$("[data-quitar]", cont).forEach((b) =>
    b.addEventListener("click", () => {
      carrito = carrito.filter((l) => l.clave !== b.dataset.quitar);
      guardarCarrito(); pintarCarrito(); actualizarContadores();
    })
  );
  $$("[data-mas]", cont).forEach((b) =>
    b.addEventListener("click", () => {
      carrito.find((l) => l.clave === b.dataset.mas).cantidad++;
      guardarCarrito(); pintarCarrito(); actualizarContadores();
    })
  );
  $$("[data-menos]", cont).forEach((b) =>
    b.addEventListener("click", () => {
      const l = carrito.find((x) => x.clave === b.dataset.menos);
      l.cantidad--;
      if (l.cantidad <= 0) carrito = carrito.filter((x) => x !== l);
      guardarCarrito(); pintarCarrito(); actualizarContadores();
    })
  );
  let entrega = "retiro";
  $$("#ckEntrega button", cont).forEach((b) =>
    b.addEventListener("click", () => {
      entrega = b.dataset.entrega;
      $$("#ckEntrega button", cont).forEach((x) =>
        x.setAttribute("aria-pressed", x === b ? "true" : "false")
      );
      $("#campoDireccion", cont).hidden = entrega !== "envio";
    })
  );
  $("#btnCupon", cont).addEventListener("click", validarCupon);

  $("#btnWhatsApp", cont).addEventListener("click", () => {
    const nombre = $("#ckNombre", cont).value.trim();
    const tel = $("#ckTel", cont).value.trim();
    if (!nombre) return $("#ckNombre", cont).focus();
    if (!tel) return $("#ckTel", cont).focus();
    const direccion =
      entrega === "envio" ? $("#ckDireccion", cont).value.trim() : "";
    if (entrega === "envio" && !direccion)
      return $("#ckDireccion", cont).focus();
    const nota = $("#ckNota", cont).value.trim();

    const lineas = carrito
      .map(
        (l, i) =>
          `${i + 1}. ${l.cantidad} × ${l.titulo} (${nombreFormato(l.formato)}) — ${dinero(l.precio * l.cantidad)}`
      )
      .join("\n");
    let msg =
      `🌿 *Nuevo pedido — ${_ckMarca}*\n\n` +
      `${lineas}\n\n` +
      `Subtotal: ${dinero(subtotal)}\n` +
      (cuponAplicado
        ? `Cupón *${cuponAplicado.codigo}*: −${dinero(descuento)}\n`
        : "") +
      `*Total: ${dinero(subtotal - descuento)}*\n\n` +
      `👤 ${nombre} — ${tel}\n` +
      (entrega === "envio"
        ? `📦 Envío a: ${direccion}\n`
        : `🏠 Retiro en Feria/Casa\n`) +
      (nota ? `\n📝 Nota: ${nota}` : "");
    window.open(
      `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`,
      "_blank"
    );
  });
}

async function validarCupon() {
  const input = $("#ckCupon");
  const aviso = $("#cuponAviso");
  const codigo = input.value.trim().toUpperCase();
  if (!codigo) return;
  cuponAplicado = null;
  aviso.className = "";
  aviso.textContent = "";
  try {
    const r = await fetch("/api/coupon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo }),
    });
    if (!r.ok) throw new Error();
    const c = await r.json();
    cuponAplicado = { ...c, codigo: c.codigo.toUpperCase() };
    aviso.className = "cupon-ok";
    aviso.textContent = "✔ Cupón aplicado";
  } catch {
    aviso.className = "cupon-error";
    aviso.textContent = "Ese cupón no existe o no está activo";
  }
  pintarCarrito();
  // restaurar el valor luego del repintado
  const inp = $("#ckCupon");
  if (inp && codigo) inp.value = codigo;
}

/* ---------- hojas (bottom sheets) ---------- */
function abrirHoja(selHoja, selVelo) {
  const h = $(selHoja), v = $(selVelo);
  h.hidden = false; v.hidden = false;
  requestAnimationFrame(() => {
    h.classList.add("--ver".replace("--ver", "hoja--ver").replace("ficha--ver", "ficha--ver"));
    h.classList.add(selHoja === "#ficha" ? "ficha--ver" : "hoja--ver");
    v.classList.add("velo--ver");
  });
  document.body.style.overflow = "hidden";
}
function cerrarHoja(selHoja, selVelo) {
  const h = $(selHoja), v = $(selVelo);
  h.classList.remove("ficha--ver", "hoja--ver");
  v.classList.remove("velo--ver");
  document.body.style.overflow = "";
  setTimeout(() => { h.hidden = true; v.hidden = true; }, 300);
}
function cerrarCarrito() { cerrarHoja("#carrito", "#veloCarrito"); }

/* ---------- contadores y avisos ---------- */
function actualizarContadores() {
  const unidades = carrito.reduce((s, l) => s + l.cantidad, 0);
  const contador = $("#carritoContador");
  contador.hidden = unidades === 0;
  contador.textContent = unidades;
  $("#barraCompra").hidden = unidades === 0;
  $("#barraTexto").textContent =
    unidades === 1 ? "Ver tu pedido" : `Ver tu pedido (${unidades})`;
  $("#barraTotal").textContent = dinero(totalCarrito());
}
let avisoTimer;
function avisar(texto) {
  let el = $("#aviso");
  if (!el) {
    el = document.createElement("div");
    el.id = "aviso";
    el.style.cssText =
      "position:fixed;z-index:90;left:50%;top:calc(1rem + env(safe-area-inset-top));transform:translateX(-50%);background:var(--tinta);color:var(--kraft-claro);padding:.7rem 1.2rem;border-radius:99px;font-weight:600;box-shadow:var(--sombra);transition:opacity .3s;pointer-events:none";
    document.body.appendChild(el);
  }
  el.textContent = texto;
  el.style.opacity = "1";
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => (el.style.opacity = "0"), 2200);
}

/* ---------- eventos globales ---------- */
$("#btnCarrito").addEventListener("click", () => {
  abrirHoja("#carrito", "#veloCarrito");
});
$("#veloCarrito").addEventListener("click", cerrarCarrito);
$("#veloFicha").addEventListener("click", cerrarFicha);
$("#barraBtn").addEventListener("click", () => {
  abrirHoja("#carrito", "#veloCarrito");
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { cerrarCarrito(); cerrarFicha(); }
});
$("#buscador").addEventListener("input", (e) => {
  busquedaActual = e.target.value;
  pintarCatalogo();
});
$$(".plancha[data-filtro]").forEach((a) =>
  a.addEventListener("click", () => {
    filtroActual = a.dataset.filtro;
    pintarChips();
    pintarCatalogo();
  })
);

/* ---------- demo (fallback sin API) ---------- */
function demoProductos() {
  const foto = (n) => `/assets/fotos-w/IMG_20260802_${n}.webp`;
  const sahu = (id, titulo, aroma, precio, extra = {}) => ({
    id,
    titulo,
    descripcion: `Sahumerio artesanal de ${titulo.toLowerCase()}, hecho a mano por nosotros. Varas gruesas de quema lenta.`,
    foto: foto(extra.f || "31"),
    categoria: "sahumerios",
    tipo: "packs",
    aroma,
    precios: { u: precio, p5: Math.round(precio * 4.5), p10: Math.round(precio * 8.5), p20: Math.round(precio * 15), p50: Math.round(precio * 33), p100: Math.round(precio * 60) },
    stock: 10,
    ...extra,
  });
  const madera = (id, titulo, descripcion, precio, extra = {}) => ({
    id,
    titulo,
    descripcion,
    foto: foto("181148"),
    categoria: "madera",
    tipo: "unitario",
    precios: { u: precio },
    stock: 5,
    ...extra,
  });
  return [
    sahu(1, "Lavanda", "floral", 500, { destacado: true, f: "181237" }),
    sahu(2, "Coco Mango", "dulce", 500, { destacado: true, novedad: true, f: "181131" }),
    sahu(3, "Palo Santo", "amaderado", 600, { f: "181138" }),
    sahu(4, "Copal", "resina", 550, { f: "181153" }),
    sahu(5, "Sándalo de la India", "amaderado", 650, { f: "181131" }),
    sahu(6, "Opium", "especiado", 550, { f: "181148" }),
    sahu(7, "Nag Champa", "resina", 550, { f: "181153" }),
    sahu(8, "Canela", "especiado", 500, { f: "181153" }),
    sahu(9, "Vainilla", "dulce", 500, { f: "181131" }),
    sahu(10, "Jazmín", "floral", 550, { f: "181237" }),
    sahu(11, "Limón", "citrico", 450, { novedad: true, f: "181131" }),
    sahu(12, "Mirra", "resina", 600, { f: "181138" }),
    madera(20, "Portasahumerios tallado", "Portasahumerios de madera maciza tallado a mano, para varas gruesas. Cada pieza es única.", 3500, { destacado: true }),
    madera(21, "Cartel tallado a medida", "Cartel de madera con el nombre o frase que quieras, tallado a cincel. Contanos qué buscás y lo coordinamos por WhatsApp.", 12000, { novedad: true }),
    madera(22, "Placa de dirección", "Tu dirección tallada en madera, estilo campechano. Ideal para regalar casa nueva.", 9000),
  ];
}

cargar();
