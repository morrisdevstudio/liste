const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const outputPath = path.resolve('db', 'catalog-test.db');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.rmSync(outputPath, { force: true });

const db = new Database(outputPath);
db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE manufacturers (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );
  CREATE TABLE references_data (
    ref TEXT PRIMARY KEY,
    designation TEXT,
    fabCode TEXT,
    weight REAL,
    typeId INTEGER
  );
  CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
  CREATE TABLE filiales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );
  CREATE TABLE charge_affaires (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filiale_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    FOREIGN KEY (filiale_id) REFERENCES filiales(id) ON DELETE CASCADE
  );
  CREATE TABLE component_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL UNIQUE
  );
`);

const insertManufacturer = db.prepare('INSERT INTO manufacturers (code, name) VALUES (?, ?)');
[
  ['0001', 'Schneider Electric'],
  ['0002', 'Siemens'],
  ['0003', 'Legrand'],
  ['0004', 'Phoenix Contact'],
].forEach((row) => insertManufacturer.run(...row));

const insertType = db.prepare('INSERT INTO component_types (name, color) VALUES (?, ?)');
const typeIds = {};
[
  ['Disjoncteur', '#2563EB'],
  ['Vigi', '#16A34A'],
  ['Auxiliaire OF', '#EA580C'],
  ['Auxiliaire SD', '#DC2626'],
  ['Contacteur', '#7C3AED'],
  ['Sectionneur', '#0891B2'],
  ['Parafoudre', '#CA8A04'],
  ['Voyant', '#DB2777'],
  ['Bornier', '#65A30D'],
  ['Autre', '#78716C'],
].forEach(([name, color]) => {
  typeIds[name] = Number(insertType.run(name, color).lastInsertRowid);
});

const insertReference = db.prepare(
  'INSERT INTO references_data (ref, designation, fabCode, weight, typeId) VALUES (?, ?, ?, ?, ?)',
);
[
  ['A9F74116', 'Disjoncteur iC60N 1P+N C16A', '0001', 0.215, typeIds.Disjoncteur],
  ['A9F74220', 'Disjoncteur iC60N 2P C20A', '0001', 0.270, typeIds.Disjoncteur],
  ['3RV2011-1HA10', 'Disjoncteur moteur 0,55 à 0,8 A', '0002', 0.245, typeIds.Disjoncteur],
  ['3RT2016-1BB41', 'Contacteur 9 A bobine 24 V CC', '0002', 0.280, typeIds.Contacteur],
  ['0 092 52', 'Bornier de raccordement 16 mm²', '0003', 0.038, typeIds.Bornier],
  ['4 049 26', 'Interrupteur-sectionneur 40 A', '0003', 0.190, typeIds.Sectionneur],
  ['UK 5 N', 'Bornier à vis 4 mm² bleu', '0004', 0.018, typeIds.Bornier],
  ['PT 2,5-PE', 'Bornier de terre 2,5 mm²', '0004', 0.021, typeIds.Bornier],
].forEach((row) => insertReference.run(...row));

const insertFiliale = db.prepare('INSERT INTO filiales (name) VALUES (?)');
const parisId = Number(insertFiliale.run('Agence Paris').lastInsertRowid);
const lyonId = Number(insertFiliale.run('Agence Lyon').lastInsertRowid);

const insertChargeAffaire = db.prepare('INSERT INTO charge_affaires (filiale_id, name) VALUES (?, ?)');
[
  [parisId, 'Camille Martin'],
  [parisId, 'Nicolas Durand'],
  [lyonId, 'Sarah Bernard'],
].forEach((row) => insertChargeAffaire.run(...row));

db.prepare("INSERT INTO settings (key, value) VALUES ('adminPassword', 'admin')").run();
const counts = {
  manufacturers: db.prepare('SELECT COUNT(*) AS count FROM manufacturers').get().count,
  references: db.prepare('SELECT COUNT(*) AS count FROM references_data').get().count,
  types: db.prepare('SELECT COUNT(*) AS count FROM component_types').get().count,
  filiales: db.prepare('SELECT COUNT(*) AS count FROM filiales').get().count,
  chargeAffaires: db.prepare('SELECT COUNT(*) AS count FROM charge_affaires').get().count,
};
db.close();

console.log('Base de test créée : ' + outputPath);
console.log(JSON.stringify({fabricants:counts.manufacturers,references:counts.references,types:counts.types,filiales:counts.filiales,chargeAffaires:counts.chargeAffaires}));
