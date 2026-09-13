/* ============================================================
   CAPTACIÓN — formulario para artesanos interesados
   Mini-app independiente: guarda solicitudes en SQLite y las
   exporta como solicitud.json para el agente de adaptación.
   Corre aparte de la tienda:  node captacion/server.js
   Puerto por env PUERTO (default 8091). Clave del panel por
   env CLAVE_CAPTACION (si no existe, se genera y se imprime).
   ============================================================ */
const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const PUERTO = process.env.PUERTO || 8091;
const BASE = __dirname;
const DATA = path.join(BASE, "data");
const UPLOADS = path.join(BASE, "uploads");
for (const d of [DATA, UPLOADS]) if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });

const db = new Database(path.join(DATA, "captacion.db"));
db.pragma("journal_mode = WAL");
db.exec(`CREATE TABLE IF NOT EXISTS solicitudes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creada TEXT DEFAULT (datetime('now')),
  estado TEXT DEFAULT 'nueva',            -- nueva | contactada | hecha | descartada
  nombre TEXT, marca TEXT, whatsapp TEXT, instagram TEXT,
  ciudad TEXT, productos TEXT, historia TEXT, algoMas TEXT,
  fotos TEXT DEFAULT '[]'                 -- JSON array de rutas
)`);

/* ---------- clave del panel ---------- */
function hashClave(clave) {
  const salt = crypto.randomBytes(16).toString("hex");
  return salt + ":" + crypto.scryptSync(clave, salt, 32).toString("hex");
}
function verificar(clave, guardada) {
  const [salt, hash] = guardada.split(":");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(crypto.scryptSync(clave, salt, 32).toString("hex"), "hex"));
}
const FILE_CLAVE = path.join(DATA, ".clave-panel");
let CLAVE;
if (process.env.CLAVE_CAPTACION) CLAVE = process.env.CLAVE_CAPTACION;
else if (fs.existsSync(FILE_CLAVE)) CLAVE = fs.readFileSync(FILE_CLAVE, "utf8").trim();
else {
  CLAVE = crypto.randomBytes(4).toString("hex");
  fs.writeFileSync(FILE_CLAVE, CLAVE);
  console.log(`\n🔑 Clave del panel de captación: ${CLAVE}  (guardada en ${FILE_CLAVE})\n`);
}
const HASH = hashClave(CLAVE);

const sesiones = new Map();
const COOKIE = "captacion_sesion";
function esAdmin(req) {
  const t = (req.headers.cookie || "").split(";").map(s => s.trim().split("=")).find(p => p[0] === COOKIE);
  if (!t) return false;
  const venc = sesiones.get(t[1]);
  if (!venc || venc < Date.now()) { sesiones.delete(t[1]); return false; }
  return true;
}
const proteger = (req, res, next) => esAdmin(req) ? next() : res.status(401).json({ error: "No autorizado" });

/* ---------- subida de fotos ---------- */
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOADS),
  filename: (_, file, cb) => cb(null, Date.now() + "-" + crypto.randomBytes(4).toString("hex") + (path.extname(file.originalname) || ".jpg").toLowerCase()),
});
const subir = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024, files: 8 },
  fileFilter: (_, f, cb) => cb(null, /image\//.test(f.mimetype) || /\.(jpe?g|png|webp|gif|avif)$/i.test(f.originalname)),
});

const app = express();
app.use(express.json());
app.use(express.static(path.join(BASE, "public")));
app.use("/recursos", express.static(path.join(BASE, "..", "public", "assets")));
app.use("/fotos", express.static(UPLOADS, { maxAge: "30d", immutable: true }));

app.get("/panel", (_req, res) => res.sendFile(path.join(BASE, "public", "panel.html")));

/* ---- login ---- */
app.post("/api/panel/login", (req, res) => {
  if (verificar(String(req.body.clave || ""), HASH)) {
    const token = crypto.randomBytes(24).toString("hex");
    sesiones.set(token, Date.now() + 1000 * 60 * 60 * 12);
    res.setHeader("Set-Cookie", `${COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=43200`);
    return res.json({ ok: true });
  }
  res.status(401).json({ error: "Clave incorrecta" });
});


app.delete("/api/panel/login", (req, res) => {
  const t = (req.headers.cookie || "").split(";").map(x => x.trim().split("=")).find(p => p[0] === COOKIE);
  if (t) sesiones.delete(t[1]);
  res.setHeader("Set-Cookie", `${COOKIE}=; HttpOnly; Path=/; Max-Age=0`);
  res.json({ ok: true });
});

/* ---- alta de solicitud (público) ---- */
app.post("/api/solicitud", subir.array("fotos", 8), (req, res) => {
  const b = req.body;
  const lim = (v, n) => String(v || "").trim().slice(0, n);
  if (!lim(b.nombre, 120) || !lim(b.marca, 120) || !lim(b.whatsapp, 40))
    return res.status(400).json({ error: "Faltan datos obligatorios (nombre, marca o WhatsApp)" });
  const info = db.prepare(`INSERT INTO solicitudes
      (nombre, marca, whatsapp, instagram, ciudad, productos, historia, algoMas, fotos)
      VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(
      lim(b.nombre, 120), lim(b.marca, 120), lim(b.whatsapp, 40), lim(b.instagram, 120),
      lim(b.ciudad, 120), lim(b.productos, 500), lim(b.historia, 4000), lim(b.algoMas, 2000),
      JSON.stringify((req.files || []).map(f => "/fotos/" + f.filename))
    );
  res.json({ ok: true, id: info.lastInsertRowid });
});

/* ---- listado / detalle / export / estado (panel) ---- */
const fila = (s) => ({ ...s, fotos: JSON.parse(s.fotos || "[]") });

app.get("/api/panel/solicitudes", proteger, (_req, res) =>
  res.json(db.prepare("SELECT * FROM solicitudes ORDER BY id DESC").all().map(fila)));

app.get("/api/panel/solicitudes/:id/export", proteger, (req, res) => {
  const s = db.prepare("SELECT * FROM solicitudes WHERE id=?").get(req.params.id);
  if (!s) return res.status(404).json({ error: "No existe" });
  const f = fila(s);
  const base = `${req.protocol}://${req.get("host")}`;
  res.setHeader("Content-Disposition", `attachment; filename="solicitud-${f.marca.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json"`);
  res.json({
    _nota: "Solicitud generada por la página de captación. Las fotos se descargan de las URLs 'fotos' (host de captación). Usar con la plantilla de tienda (ver PLANTILLA-GUIA.md).",
    nombre: f.nombre, marca: f.marca, whatsapp: f.whatsapp, instagram: f.instagram,
    ciudad: f.ciudad, productos: f.productos, historia: f.historia, algoMas: f.algoMas,
    fotos: f.fotos.map(ruta => base + ruta),
  });
});
app.post("/api/panel/solicitudes/:id/estado", proteger, (req, res) => {
  const estados = ["nueva", "contactada", "hecha", "descartada"];
  if (!estados.includes(req.body.estado)) return res.status(400).json({ error: "Estado inválido" });
  db.prepare("UPDATE solicitudes SET estado=? WHERE id=?").run(req.body.estado, req.params.id);
  res.json({ ok: true });
});

app.listen(PUERTO, () => {
  console.log(`📥 Captación corriendo en http://localhost:${PUERTO}  (panel: /panel)`);
});
