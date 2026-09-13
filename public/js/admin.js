/* ===== Panel de administración — Casiopea ===== */
"use strict";
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const dinero = (n) => "$ " + (n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 });
const escapar = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let productos = [];
let contenido = {};
let cupones = [];
let tipoActual = "packs";
let fotoNueva = null; // File

/* ---------- sesión ---------- */
async function init() {
  try { // el panel sigue el tema definido en config.json
    const c = await (await fetch("/api/config")).json();
    if (c.tema) $("#linkTema").href = "/css/temas/tema-" + c.tema + ".css";
  } catch {}
  const r = await fetch("/api/admin/session");
  if (r.ok) mostrarPanel();
  else mostrarLogin();
}
function mostrarLogin() {
  $("#vistaLogin").hidden = false;
  $("#formLogin").addEventListener("submit", async (e) => {
    e.preventDefault();
    const r = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clave: $("#loginClave").value }),
    });
    if (r.ok) mostrarPanel();
    else $("#loginError").hidden = false;
  });
}
async function mostrarPanel() {
  $("#vistaLogin").hidden = true;
  $("#vistaPanel").hidden = false;
  await Promise.all([cargarProductos(), cargarContenido(), cargarCupones()]);
}
$("#btnSalir").addEventListener("click", async () => {
  await fetch("/api/admin/logout", { method: "POST" });
  location.reload();
});

/* ---------- tabs ---------- */
$$(".panel-tab").forEach((t) =>
  t.addEventListener("click", () => {
    $$(".panel-tab").forEach((x) => x.setAttribute("aria-selected", x === t));
    $$(".panel-seccion").forEach((s) => (s.hidden = s.id !== "tab-" + t.dataset.tab));
  })
);

/* ---------- productos ---------- */
async function cargarProductos() {
  productos = await (await fetch("/api/products?todas=1")).json();
  $("#contadorProductos").textContent = `(${productos.length})`;
  $("#listaProductos").innerHTML = productos
    .map((p) => {
      const sin = (p.stock ?? 0) <= 0;
      const precios = p.tipo === "packs"
        ? `desde ${dinero(minimo(p))}/u`
        : dinero(p.precios?.u || 0);
      return `
      <div class="fila-producto ${sin ? "fila-producto--sin" : ""}">
        <img src="${p.foto}" alt="">
        <div class="fila-producto__datos">
          <p class="fila-producto__nombre">${escapar(p.titulo)}</p>
          <p class="fila-producto__meta">
            <span>${p.categoria === "madera" ? "🪵 Madera" : "🌿 Sahumerios"}</span>
            <span>${precios}</span>
            <span>${sin ? "❗ sin stock" : "stock " + p.stock}</span>
            ${p.destacado ? "<span>⭐</span>" : ""}${p.novedad ? "<span>🌱</span>" : ""}
          </p>
        </div>
        <div class="fila-producto__acciones">
          <button class="btn-accion" data-editar="${p.id}">Editar</button>
          <button class="btn-accion btn-accion--borrar" data-borrar="${p.id}">Borrar</button>
        </div>
      </div>`;
    })
    .join("");
  $$("[data-editar]").forEach((b) => b.addEventListener("click", () => abrirFormProducto(b.dataset.editar)));
  $$("[data-borrar]").forEach((b) =>
    b.addEventListener("click", async () => {
      if (!confirm("¿Borrar este producto definitivamente?")) return;
      await fetch(`/api/admin/products/${b.dataset.borrar}`, { method: "DELETE" });
      cargarProductos();
    })
  );
}
const minimo = (p) => {
  const vals = Object.entries(p.precios || {}).filter(([, v]) => v > 0).map(([k, v]) => v / (k === "u" ? 1 : +k.slice(1)));
  return vals.length ? Math.round(Math.min(...vals)) : 0;
};

function abrirFormProducto(id) {
  fotoNueva = null;
  $("#formProductoError").hidden = true;
  const p = productos.find((x) => String(x.id) === String(id));
  $("#tituloFormProducto").textContent = p ? "Editar producto" : "Nuevo producto";
  $("#prId").value = p?.id || "";
  $("#prTitulo").value = p?.titulo || "";
  $("#prDesc").value = p?.descripcion || "";
  $("#prCategoria").value = p?.categoria || "sahumerios";
  $("#prAroma").value = p?.aroma || "";
  $("#prStock").value = p?.stock ?? 10;
  $("#prDestacado").checked = !!p?.destacado;
  $("#prNovedad").checked = !!p?.novedad;
  setTipo(p?.tipo || "packs");
  const pr = p?.precios || {};
  $("#prPu").value = pr.u || "";
  $("#prP5").value = pr.p5 || "";
  $("#prP10").value = pr.p10 || "";
  $("#prP20").value = pr.p20 || "";
  $("#prP50").value = pr.p50 || "";
  $("#prP100").value = pr.p100 || "";
  const vista = $("#prFotoVista");
  if (p?.foto) { vista.src = p.foto; vista.hidden = false; } else vista.hidden = true;
  $("#prFoto").value = "";
  abrirDialogo();
}
function setTipo(t) {
  tipoActual = t;
  $$("#prTipo button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.tipo === t));
  $("#campoPreciosPack").querySelector("label").textContent =
    t === "packs" ? "Precios por formato (vacío = no se ofrece)" : "Precio por pieza";
  ["prP5","prP10","prP20","prP50","prP100"].forEach((id) => {
    $("#" + id).parentElement.style.display = t === "packs" ? "" : "none";
  });
}
$$("#prTipo button").forEach((b) => b.addEventListener("click", () => setTipo(b.dataset.tipo)));
$("#prFoto").addEventListener("change", (e) => {
  fotoNueva = e.target.files[0] || null;
  if (fotoNueva) {
    const vista = $("#prFotoVista");
    vista.src = URL.createObjectURL(fotoNueva);
    vista.hidden = false;
  }
});
$("#btnNuevoProducto").addEventListener("click", () => abrirFormProducto(null));
$("#btnCerrarProducto").addEventListener("click", cerrarDialogo);
$("#veloProducto").addEventListener("click", cerrarDialogo);
function abrirDialogo() {
  $("#formProducto").hidden = false; $("#veloProducto").hidden = false;
  requestAnimationFrame(() => {
    $("#formProducto").classList.add("ficha--ver");
    $("#veloProducto").classList.add("velo--ver");
  });
  document.body.style.overflow = "hidden";
}
function cerrarDialogo() {
  $("#formProducto").classList.remove("ficha--ver");
  $("#veloProducto").classList.remove("velo--ver");
  document.body.style.overflow = "";
  setTimeout(() => { $("#formProducto").hidden = true; $("#veloProducto").hidden = true; }, 300);
}

$("#formProductoCampos").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData();
  fd.append("titulo", $("#prTitulo").value.trim());
  fd.append("descripcion", $("#prDesc").value.trim());
  fd.append("categoria", $("#prCategoria").value);
  fd.append("aroma", $("#prAroma").value);
  fd.append("tipo", tipoActual);
  fd.append("stock", $("#prStock").value || 0);
  fd.append("destacado", $("#prDestacado").checked ? 1 : 0);
  fd.append("novedad", $("#prNovedad").checked ? 1 : 0);
  const precios = {};
  if ($("#prPu").value) precios.u = +$("#prPu").value;
  if (tipoActual === "packs") {
    if ($("#prP5").value) precios.p5 = +$("#prP5").value;
    if ($("#prP10").value) precios.p10 = +$("#prP10").value;
    if ($("#prP20").value) precios.p20 = +$("#prP20").value;
    if ($("#prP50").value) precios.p50 = +$("#prP50").value;
    if ($("#prP100").value) precios.p100 = +$("#prP100").value;
  }
  if (!precios.u) {
    const err = $("#formProductoError");
    err.hidden = false;
    err.textContent = "Falta el precio por unidad/pieza";
    return;
  }
  fd.append("precios", JSON.stringify(precios));
  if (fotoNueva) fd.append("foto", fotoNueva);
  const id = $("#prId").value;
  const r = await fetch(id ? `/api/admin/products/${id}` : "/api/admin/products", {
    method: id ? "PUT" : "POST",
    body: fd,
  });
  if (r.ok) { cerrarDialogo(); cargarProductos(); }
  else {
    const err = $("#formProductoError");
    err.hidden = false;
    err.textContent = "No se pudo guardar (¿faltan datos o la foto?)";
  }
});

/* ---------- contenido ---------- */
async function cargarContenido() {
  contenido = await (await fetch("/api/content")).json();
  $("#ctHistoriaTitulo").value = contenido.historia_titulo || "";
  $("#ctHistoriaTexto").value = contenido.historia_texto || "";
  pintarFeriasAdmin();
}
function pintarFeriasAdmin() {
  const ferias = contenido.ferias || [];
  $("#listaFeriasAdmin").innerHTML = ferias
    .map(
      (f, i) => `
    <div class="feria-row">
      <input data-feria="${i}" data-campo="fecha" value="${escapar(f.fecha)}" placeholder="Fecha">
      <input data-feria="${i}" data-campo="lugar" value="${escapar(f.lugar)}" placeholder="Lugar / ciudad">
      <input data-feria="${i}" data-campo="detalle" value="${escapar(f.detalle)}" placeholder="Detalle (opcional)">
      <button type="button" class="btn-accion btn-accion--borrar" data-feria-quitar="${i}">✕</button>
    </div>`
    )
    .join("");
  $$("[data-feria]").forEach((inp) =>
    inp.addEventListener("input", () => {
      contenido.ferias[+inp.dataset.feria][inp.dataset.campo] = inp.value;
    })
  );
  $$("[data-feria-quitar]").forEach((b) =>
    b.addEventListener("click", () => {
      contenido.ferias.splice(+b.dataset.feriaQuitar, 1);
      pintarFeriasAdmin();
    })
  );
}
$("#btnAgregarFerias").addEventListener("click", () => {
  if (!Array.isArray(contenido.ferias)) contenido.ferias = [];
  contenido.ferias.push({ fecha: "", lugar: "", detalle: "" });
  pintarFeriasAdmin();
});
$("#formContenido").addEventListener("submit", async (e) => {
  e.preventDefault();
  await fetch("/api/admin/content", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      historia_titulo: $("#ctHistoriaTitulo").value,
      historia_texto: $("#ctHistoriaTexto").value,
      ferias: (contenido.ferias || []).filter((f) => f.lugar || f.fecha),
    }),
  });
  alert("Contenido guardado ✔ — la tienda ya lo muestra");
});

/* ---------- cupones ---------- */
async function cargarCupones() {
  cupones = await (await fetch("/api/admin/coupons")).json();
  $("#listaCupones").innerHTML = cupones
    .map(
      (c) => `
    <div class="fila-cupon-admin">
      <strong>${escapar(c.codigo)}</strong>
      <span>${c.tipo === "porcentaje" ? c.valor + "% off" : dinero(c.valor) + " off"}</span>
      <span class="cupon-off">${c.activo ? "activo" : "inactivo"}</span>
      <button class="btn-accion" data-cupon-toggle="${c.codigo}">${c.activo ? "Desactivar" : "Activar"}</button>
      <button class="btn-accion btn-accion--borrar" data-cupon-borrar="${c.codigo}">Borrar</button>
    </div>`
    )
    .join("");
  $$("[data-cupon-toggle]").forEach((b) =>
    b.addEventListener("click", async () => {
      await fetch(`/api/admin/coupons/${b.dataset.cuponToggle}/toggle`, { method: "POST" });
      cargarCupones();
    })
  );
  $$("[data-cupon-borrar]").forEach((b) =>
    b.addEventListener("click", async () => {
      if (!confirm("¿Borrar el cupón " + b.dataset.cuponBorrar + "?")) return;
      await fetch(`/api/admin/coupons/${b.dataset.cuponBorrar}`, { method: "DELETE" });
      cargarCupones();
    })
  );
}
$("#formCupon").addEventListener("submit", async (e) => {
  e.preventDefault();
  const codigo = $("#cpCodigo").value.trim().toUpperCase();
  const valor = +$("#cpValor").value;
  if (!codigo || !valor) return;
  await fetch("/api/admin/coupons", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ codigo, tipo: $("#cpTipo").value, valor }),
  });
  $("#cpCodigo").value = ""; $("#cpValor").value = "";
  cargarCupones();
});

init();
