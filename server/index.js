/* API + sitio — Sahumerios Casiopea */
const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const { db, obtenerClave, cambiarClave, verificarClave, obtenerContenido, guardarContenido } = require("./db");

const app = express();
const PUERTO = process.env.PUERTO || 3000;
const UPLOADS = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/uploads", express.static(UPLOADS, { maxAge: "30d", immutable: true }));
app.get("/admin", (_req, res) =>
  res.sendFile(path.join(__dirname, "..", "public", "admin.html"))
);

/* ---------- subida de fotos ---------- */
const STORAGE = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOADS),
  filename: (_, file, cb) => {
    const ext = (path.extname(file.originalname) || ".jpg").toLowerCase();
    cb(null, Date.now() + "-" + crypto.randomBytes(4).toString("hex") + ext);
  },
});
const subir = multer({
  storage: STORAGE,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const esImagen =
      /image\//.test(file.mimetype) ||
      /\.(jpe?g|png|webp|gif|avif)$/i.test(file.originalname);
    cb(null, esImagen);
  },
});

/* ---------- sesión (cookie firmada en memoria) ---------- */
const sesiones = new Map(); // token -> vencimiento
const COOKIE = "casiopea_sesion";
const VIDA_SESION = 1000 * 60 * 60 * 24 * 30; // 30 días

function crearSesion() {
  const token = crypto.randomBytes(32).toString("hex");
  sesiones.set(token, Date.now() + VIDA_SESION);
  return token;
}
function parsearCookie(req) {
  const cruda = req.headers.cookie || "";
  for (const parte of cruda.split(";")) {
    const [k, ...v] = parte.trim().split("=");
    if (k === COOKIE) return v.join("=");
  }
  return null;
}
function esAdmin(req) {
  const token = parsearCookie(req);
  if (!token || !sesiones.has(token)) return false;
  if (sesiones.get(token) < Date.now()) { sesiones.delete(token); return false; }
  return true;
}
function proteger(req, res, next) {
  if (esAdmin(req)) return next();
  res.status(401).json({ error: "No autorizado" });
}

/* ================= API pública ================= */
app.get("/api/products", (_req, res) => {
  const filas = db.prepare("SELECT * FROM products ORDER BY destacado DESC, orden, id").all();
  res.json(filas.map(filaProducto));
});
const filaProducto = (f) => ({
  id: f.id,
  titulo: f.titulo,
  descripcion: f.descripcion,
  foto: f.foto,
  categoria: f.categoria,
  tipo: f.tipo,
  aroma: f.aroma,
  precios: JSON.parse(f.precios || "{}"),
  stock: f.stock,
  destacado: !!f.destacado,
  novedad: !!f.novedad,
});

app.get("/api/content", (_req, res) => res.json(obtenerContenido()));

/* Configuración de la tienda (config.json en la raíz del proyecto) */
const CONFIG_PATH = path.join(__dirname, "..", "config.json");
app.get("/api/config", (_req, res) => {
  try {
    res.sendFile(CONFIG_PATH);
  } catch {
    res.json({});
  }
});

app.post("/api/coupon", (req, res) => {
  const codigo = String(req.body.codigo || "").trim().toUpperCase();
  const c = db.prepare("SELECT * FROM coupons WHERE codigo=? AND activo=1").get(codigo);
  if (!c) return res.status(404).json({ error: "Cupón inválido" });
  res.json({ codigo: c.codigo, tipo: c.tipo, valor: c.valor });
});

/* ================= API admin ================= */
app.post("/api/admin/login", (req, res) => {
  const clave = String(req.body.clave || "");
  const guardada = obtenerClave();
  if (guardada && verificarClave(clave, guardada)) {
    res.setHeader("Set-Cookie", `${COOKIE}=${crearSesion()}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${VIDA_SESION / 1000}`);
    return res.json({ ok: true });
  }
  res.status(401).json({ error: "Contraseña incorrecta" });
});
app.get("/api/admin/session", (req, res) => res.status(esAdmin(req) ? 200 : 401).json({ ok: esAdmin(req) }));
app.post("/api/admin/logout", (req, res) => {
  const token = parsearCookie(req);
  if (token) sesiones.delete(token);
  res.setHeader("Set-Cookie", `${COOKIE}=; HttpOnly; Path=/; Max-Age=0`);
  res.json({ ok: true });
});
app.post("/api/admin/clave", proteger, (req, res) => {
  const nueva = String(req.body.clave || "");
  if (nueva.length < 6) return res.status(400).json({ error: "Mínimo 6 caracteres" });
  cambiarClave(nueva);
  res.json({ ok: true });
});

/* productos */
app.get("/api/admin/products", proteger, (_req, res) => {
  res.json(db.prepare("SELECT * FROM products ORDER BY orden, id").all().map(filaProducto));
});
app.post("/api/admin/products", proteger, subir.single("foto"), (req, res) => {
  const p = datosProducto(req);
  const maxOrden = db.prepare("SELECT COALESCE(MAX(orden),0) m FROM products").get().m;
  const info = db.prepare(
    `INSERT INTO products (titulo, descripcion, foto, categoria, tipo, aroma, precios, stock, destacado, novedad, orden)
     VALUES (@titulo, @descripcion, @foto, @categoria, @tipo, @aroma, @precios, @stock, @destacado, @novedad, @orden)`
  ).run({ ...p, foto: req.file ? "/uploads/" + req.file.filename : p.foto, orden: maxOrden + 1 });
  res.json({ id: info.lastInsertRowid });
});
app.put("/api/admin/products/:id", proteger, subir.single("foto"), (req, res) => {
  const p = datosProducto(req);
  if (req.file) p.foto = "/uploads/" + req.file.filename;
  const set = Object.keys(p).map((k) => `${k}=@${k}`).join(", ");
  db.prepare(`UPDATE products SET ${set} WHERE id=@id`).run({ ...p, id: req.params.id });
  res.json({ ok: true });
});
app.delete("/api/admin/products/:id", proteger, (req, res) => {
  db.prepare("DELETE FROM products WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

function datosProducto(req) {
  const b = req.body;
  return {
    titulo: String(b.titulo || "").trim().slice(0, 120),
    descripcion: String(b.descripcion || "").trim().slice(0, 2000),
    foto: String(b.foto || "").slice(0, 400),
    categoria: b.categoria === "madera" ? "madera" : "sahumerios",
    tipo: b.tipo === "unitario" ? "unitario" : "packs",
    aroma: String(b.aroma || "").slice(0, 40),
    precios: normalizarPrecios(b.precios),
    stock: Math.max(0, parseInt(b.stock, 10) || 0),
    destacado: b.destacado == "1" || b.destacado === "true" ? 1 : 0,
    novedad: b.novedad == "1" || b.novedad === "true" ? 1 : 0,
  };
}
function normalizarPrecios(crudo) {
  let p = {};
  try { p = typeof crudo === "string" ? JSON.parse(crudo) : crudo || {}; } catch {}
  const limpio = {};
  for (const k of ["u", "p5", "p10", "p20", "p50", "p100"]) {
    const v = parseInt(p[k], 10);
    if (v > 0) limpio[k] = v;
  }
  return JSON.stringify(limpio);
}

/* contenido */
app.put("/api/admin/content", proteger, (req, res) => {
  const { historia_titulo = "", historia_texto = "", ferias = [] } = req.body;
  guardarContenido({
    historia_titulo: String(historia_titulo).slice(0, 200),
    historia_texto: String(historia_texto).slice(0, 4000),
    ferias: (Array.isArray(ferias) ? ferias : [])
      .slice(0, 50)
      .map((f) => ({
        fecha: String(f.fecha || "").slice(0, 60),
        lugar: String(f.lugar || "").slice(0, 120),
        detalle: String(f.detalle || "").slice(0, 300),
      }))
      .filter((f) => f.lugar || f.fecha),
  });
  res.json({ ok: true });
});

/* cupones */
app.get("/api/admin/coupons", proteger, (_req, res) =>
  res.json(db.prepare("SELECT * FROM coupons").all())
);
app.post("/api/admin/coupons", proteger, (req, res) => {
  const codigo = String(req.body.codigo || "").trim().toUpperCase().slice(0, 40);
  const tipo = req.body.tipo === "monto" ? "monto" : "porcentaje";
  const valor = Math.max(1, parseInt(req.body.valor, 10) || 0);
  if (!codigo || !valor) return res.status(400).json({ error: "Faltan datos" });
  if (tipo === "porcentaje" && valor > 90) return res.status(400).json({ error: "El % máximo es 90" });
  db.prepare("INSERT INTO coupons (codigo, tipo, valor, activo) VALUES (?, ?, ?, 1) ON CONFLICT(codigo) DO UPDATE SET tipo=excluded.tipo, valor=excluded.valor, activo=1")
    .run(codigo, tipo, valor);
  res.json({ ok: true });
});
app.post("/api/admin/coupons/:codigo/toggle", proteger, (req, res) => {
  db.prepare("UPDATE coupons SET activo = 1 - activo WHERE codigo=?").run(req.params.codigo.toUpperCase());
  res.json({ ok: true });
});
app.delete("/api/admin/coupons/:codigo", proteger, (req, res) => {
  db.prepare("DELETE FROM coupons WHERE codigo=?").run(req.params.codigo.toUpperCase());
  res.json({ ok: true });
});

app.listen(PUERTO, () => {
  console.log(`🌿 Sahumerios Casiopea corriendo en http://localhost:${PUERTO}`);
  console.log(`   Panel: http://localhost:${PUERTO}/admin`);
});
