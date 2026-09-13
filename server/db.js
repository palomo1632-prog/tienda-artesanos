/* Base de datos SQLite — Sahumerios Casiopea */
const Database = require("better-sqlite3");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "casiopea.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  descripcion TEXT DEFAULT '',
  foto TEXT DEFAULT '',
  categoria TEXT NOT NULL DEFAULT 'sahumerios',   -- sahumerios | madera
  tipo TEXT NOT NULL DEFAULT 'packs',             -- packs | unitario
  aroma TEXT DEFAULT '',
  precios TEXT NOT NULL DEFAULT '{}',             -- JSON {u, p5, p10, p20, p50, p100}
  stock INTEGER NOT NULL DEFAULT 0,
  destacado INTEGER DEFAULT 0,
  novedad INTEGER DEFAULT 0,
  orden INTEGER DEFAULT 0,
  creado_en TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS coupons (
  codigo TEXT PRIMARY KEY,
  tipo TEXT NOT NULL,                             -- porcentaje | monto
  valor INTEGER NOT NULL,
  activo INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS site_content (
  clave TEXT PRIMARY KEY,
  valor TEXT
);
CREATE TABLE IF NOT EXISTS settings (
  clave TEXT PRIMARY KEY,
  valor TEXT
);
`);

/* ---------- contraseña del panel ---------- */
function hashClave(clave) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(clave, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}
function verificarClave(clave, guardada) {
  const [salt, hash] = guardada.split(":");
  const intento = crypto.scryptSync(clave, salt, 32).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(intento, "hex"));
}
function obtenerClave() {
  let fila = db.prepare("SELECT valor FROM settings WHERE clave='clave_panel'").get();
  if (!fila) {
    // Sin CLAVE_PANEL se genera una clave aleatoria (plantilla pública: nada de claves fijas)
    const inicial = process.env.CLAVE_PANEL || crypto.randomBytes(3).toString("hex");
    db.prepare("INSERT INTO settings (clave, valor) VALUES ('clave_panel', ?)").run(hashClave(inicial));
    console.log(`\n⚠  Clave inicial del panel: "${inicial}" — cambiala desde el panel.\n`);
    fila = db.prepare("SELECT valor FROM settings WHERE clave='clave_panel'").get();
  }
  return fila.valor;
}
const cambiarClave = (nueva) =>
  db.prepare("UPDATE settings SET valor=? WHERE clave='clave_panel'").run(hashClave(nueva));

/* ---------- contenido ---------- */
const contenidoPorDefecto = {
  historia_titulo: "Un taller que rueda",
  historia_texto:
    "Somos Valeria y Cristian. Hacemos cada sahumerio a mano y tallamos cada cartel a cincel, y desde hace un tiempo recorremos las ferias de Argentina con nuestro motorhome como taller y casa. Lo que comprás acá salió de nuestras manos, no de una fábrica.",
  ferias: JSON.stringify([
    { fecha: "Este finde", lugar: "Consultanos por WhatsApp", detalle: "El motorhome anda siempre; te contamos dónde estacionamos esta semana." },
  ]),
};
function obtenerContenido() {
  const filas = db.prepare("SELECT clave, valor FROM site_content").all();
  const mapa = { ...contenidoPorDefecto };
  for (const f of filas) mapa[f.clave] = f.valor;
  mapa.ferias = JSON.parse(mapa.ferias || "[]");
  return mapa;
}
function guardarContenido(obj) {
  const up = db.prepare("INSERT INTO site_content (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor=excluded.valor");
  const tx = db.transaction((datos) => {
    for (const [clave, valor] of Object.entries(datos)) {
      if (clave === "ferias") up.run("ferias", JSON.stringify(valor));
      else up.run(clave, String(valor));
    }
  });
  tx(obj);
}

/* ---------- productos demo (solo si la tabla está vacía) ---------- */
function sembrarDemo() {
  const n = db.prepare("SELECT COUNT(*) c FROM products").get().c;
  if (n > 0) return;
  const ins = db.prepare(
    `INSERT INTO products (titulo, descripcion, foto, categoria, tipo, aroma, precios, stock, destacado, novedad, orden)
     VALUES (@titulo, @descripcion, @foto, @categoria, @tipo, @aroma, @precios, @stock, @destacado, @novedad, @orden)`
  );
  const escala = (u) => ({
    u,
    p5: Math.round(u * 4.5),
    p10: Math.round(u * 8.5),
    p20: Math.round(u * 15),
    p50: Math.round(u * 33),
    p100: Math.round(u * 60),
  });
  const foto = (num) => `/assets/fotos-w/IMG_20260802_${num}.webp`;
  const sahu = (titulo, aroma, u, fotoNum, extra = {}) => ({
    titulo,
    descripcion: `Sahumerio artesanal de ${titulo.toLowerCase()}, hecho a mano por nosotros. Varas gruesas de quema lenta y aroma que queda en la casa.`,
    foto: foto(fotoNum),
    categoria: "sahumerios",
    tipo: "packs",
    aroma,
    precios: JSON.stringify(escala(u)),
    stock: 10,
    destacado: 0,
    novedad: 0,
    ...extra,
  });
  const madera = (titulo, descripcion, u, extra = {}) => ({
    titulo,
    descripcion,
    foto: "/assets/img/ilus-madera.webp",
    categoria: "madera",
    tipo: "unitario",
    aroma: "",
    precios: JSON.stringify({ u }),
    stock: 5,
    destacado: 0,
    novedad: 0,
    ...extra,
  });
  const lista = [
    sahu("Lavanda", "floral", 500, "181237", { destacado: 1 }),
    sahu("Coco Mango", "dulce", 500, "181131", { destacado: 1, novedad: 1 }),
    sahu("Palo Santo", "amaderado", 600, "181138"),
    sahu("Copal", "resina", 550, "181153"),
    sahu("Sándalo de la India", "amaderado", 650, "181131", { destacado: 1 }),
    sahu("Opium", "especiado", 550, "181148"),
    sahu("Nag Champa", "resina", 550, "181153"),
    sahu("Canela", "especiado", 500, "181153"),
    sahu("Vainilla", "dulce", 500, "181131"),
    sahu("Jazmín", "floral", 550, "181237"),
    sahu("Limón", "citrico", 450, "181131", { novedad: 1 }),
    sahu("Mirra", "resina", 600, "181138"),
    sahu("Sangre de Dragón", "resina", 600, "181148", { novedad: 1 }),
    sahu("Salvia Blanca", "resina", 650, "181138"),
    sahu("Sándalo Dulce", "dulce", 550, "181131"),
    sahu("Reina de la Noche", "floral", 550, "181237"),
    madera(
      "Portasahumerios tallado",
      "Portasahumerios de madera maciza tallado a mano, para varas gruesas. Cada pieza es única: el tallado puede variar un poquito, esa es la gracia.",
      3500,
      { destacado: 1 }
    ),
    madera(
      "Cartel tallado a medida",
      "Cartel de madera con el nombre o la frase que quieras, tallado a cincel. Contanos qué buscás por WhatsApp y lo coordinamos.",
      12000,
      { novedad: 1 }
    ),
    madera(
      "Placa de dirección",
      "Tu dirección tallada en madera, estilo campechano. Ideal para regalar en casa nueva.",
      9000
    ),
  ];
  const tx = db.transaction(() => lista.forEach((p, i) => ins.run({ ...p, orden: i })));
  tx();
  console.log(`✔ Sembrados ${lista.length} productos de demostración`);
}

/* ---------- cupón demo ---------- */
function sembrarCupon() {
  db.prepare("INSERT OR IGNORE INTO coupons (codigo, tipo, valor, activo) VALUES ('BIENVENIDA10', 'porcentaje', 10, 1)").run();
}

sembrarDemo();
sembrarCupon();

module.exports = { db, obtenerClave, cambiarClave, verificarClave, obtenerContenido, guardarContenido };
