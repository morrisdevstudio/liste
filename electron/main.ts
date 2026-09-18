import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import * as xlsx from 'xlsx';
import { autoUpdater } from 'electron-updater';
import { PDFDocument } from 'pdf-lib';
import type { AppConfig, CatalogImportMapping, ComponentRef, Manufacturer, PlanWindowState, ProjectFileData } from '../src/types';
import { DEFAULT_COMPONENT_TYPES, isNeutralColor, normalizeHexColor } from '../src/componentTypes';

const errorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);

const _filename = fileURLToPath(import.meta.url);
const _dirname = path.dirname(_filename);

function parseTypeId(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const id = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validateTypeColor(color: string, excludeId?: number): string {
  const normalized = normalizeHexColor(color);
  if (!normalized) throw new Error('Couleur invalide.');
  if (isNeutralColor(normalized)) throw new Error('La teinte neutre est réservée et ne peut pas être attribuée à un type.');
  const existing = excludeId
    ? getDb().prepare('SELECT id FROM component_types WHERE color = ? AND id != ?').get(normalized, excludeId)
    : getDb().prepare('SELECT id FROM component_types WHERE color = ?').get(normalized);
  if (existing) throw new Error('Cette couleur est déjà attribuée à un autre type.');
  return normalized;
}

function assertTypeExists(typeId: number | null): number | null {
  if (typeId === null) return null;
  const row = getDb().prepare('SELECT id FROM component_types WHERE id = ?').get(typeId);
  if (!row) throw new Error('Type introuvable.');
  return typeId;
}

function mapTypeError(error: unknown): string {
  const msg = errorMessage(error);
  if (msg.includes('UNIQUE constraint failed: component_types.name')) return 'Ce nom de type existe déjà.';
  if (msg.includes('UNIQUE constraint failed: component_types.color')) return 'Cette couleur est déjà attribuée à un autre type.';
  return msg;
}

// Dynamic Database instance
let db: Database.Database | null = null;
let currentDbPath: string | null = null;

function getDb(forceDbPath?: string): Database.Database {
  let dbPath = forceDbPath;
  
  if (!dbPath) {
    try {
      const configPath = path.join(app.getPath('userData'), 'config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (config.dbFilePath) dbPath = config.dbFilePath;
      }
    } catch {}
  }

  if (!dbPath) {
    dbPath = path.join(app.getPath('userData'), 'catalog.db');
  }

  if (db && currentDbPath === dbPath) {
    return db;
  }

  if (db) {
    try { db.close(); } catch {}
  }

  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  currentDbPath = dbPath;

  db.exec(`
    CREATE TABLE IF NOT EXISTS manufacturers (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS references_data (
      ref TEXT PRIMARY KEY,
      designation TEXT,
      fabCode TEXT,
      weight REAL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS filiales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS charge_affaires (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filiale_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY (filiale_id) REFERENCES filiales(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS component_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL UNIQUE
    );
  `);

  const refCols = db.prepare('PRAGMA table_info(references_data)').all() as Array<{ name: string }>;
  if (!refCols.some((col) => col.name === 'typeId')) {
    db.exec('ALTER TABLE references_data ADD COLUMN typeId INTEGER');
  }

  const typeCount = db.prepare('SELECT COUNT(*) AS n FROM component_types').get() as { n: number };
  if (typeCount.n === 0) {
    const insertType = db.prepare('INSERT INTO component_types (name, color) VALUES (?, ?)');
    for (const type of DEFAULT_COMPONENT_TYPES) {
      insertType.run(type.name, type.color.toUpperCase());
    }
  }

  // Initialize default password if not exists
  try {
    const stmt = db.prepare("SELECT value FROM settings WHERE key = 'adminPassword'");
    const row = stmt.get() as { value: string } | undefined;
    if (!row) {
      db.prepare("INSERT INTO settings (key, value) VALUES ('adminPassword', 'admin')").run();
    }
  } catch (err) {
    console.error('Error initializing settings table:', err);
  }

  return db;
}

let mainWindow: BrowserWindow | null = null;
let planWindow: BrowserWindow | null = null;
let allowPlanWindowClose = false;
let lastPlanState: PlanWindowState | null = null;
let pendingProjectFile = findProjectFile(process.argv);
let projectOpenReceiverReady = false;

const STORED_PLAN_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/i;

function rendererUrl(hash?: string): { type: 'url' | 'file'; value: string; hash?: string } {
  if (process.env.VITE_DEV_SERVER_URL) {
    return { type: 'url', value: hash ? `${process.env.VITE_DEV_SERVER_URL}${hash}` : process.env.VITE_DEV_SERVER_URL };
  }
  return { type: 'file', value: path.join(_dirname, '../dist/index.html'), hash };
}

function loadRenderer(win: BrowserWindow, hash?: string) {
  const target = rendererUrl(hash);
  if (target.type === 'url') {
    void win.loadURL(target.value);
  } else {
    void win.loadFile(target.value, target.hash ? { hash: target.hash.replace(/^#/, '') } : undefined);
  }
}

function getPlansDir(projectPath: string): string {
  if (!path.isAbsolute(projectPath) || path.extname(projectPath).toLowerCase() !== '.list') {
    throw new Error('Fichier affaire invalide.');
  }
  const dir = path.dirname(projectPath);
  const base = path.basename(projectPath, path.extname(projectPath));
  return path.join(dir, `${base}.plans`);
}

function assertStoredPlanName(storedName: string) {
  if (!STORED_PLAN_NAME.test(storedName)) {
    throw new Error('Nom de fichier plan invalide.');
  }
}

async function countPdfPages(filePath: string): Promise<number> {
  try {
    const pdf = await PDFDocument.load(fs.readFileSync(filePath), { ignoreEncryption: true });
    return pdf.getPageCount();
  } catch {
    return 1;
  }
}

function destroyPlanWindow() {
  lastPlanState = null;
  if (!planWindow || planWindow.isDestroyed()) {
    planWindow = null;
    allowPlanWindowClose = false;
    return;
  }
  allowPlanWindowClose = true;
  const win = planWindow;
  planWindow = null;
  win.once('closed', () => {
    allowPlanWindowClose = false;
  });
  win.close();
}

function createPlanWindow() {
  allowPlanWindowClose = false;
  planWindow = new BrowserWindow({
    title: 'Plan',
    width: 1100,
    height: 800,
    webPreferences: {
      preload: path.join(_dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    icon: path.join(_dirname, '../public/icon.ico'),
  });

  planWindow.setMenu(null);

  planWindow.on('close', (event) => {
    if (allowPlanWindowClose) return;
    event.preventDefault();
    planWindow?.hide();
  });

  planWindow.on('closed', () => {
    planWindow = null;
  });

  planWindow.webContents.on('did-finish-load', () => {
    if (lastPlanState && planWindow && !planWindow.isDestroyed()) {
      planWindow.webContents.send('plan-state', lastPlanState);
    }
  });

  loadRenderer(planWindow, '#/plan');
}

function openOrFocusPlanWindow() {
  if (planWindow && !planWindow.isDestroyed()) {
    if (planWindow.isMinimized()) planWindow.restore();
    planWindow.show();
    planWindow.focus();
    return;
  }
  createPlanWindow();
}

function findProjectFile(commandLine: string[]): string | null {
  const filePath = commandLine.find(argument => path.extname(argument).toLowerCase() === '.list');
  return filePath ? path.resolve(filePath) : null;
}

function sendProjectFileToRenderer(filePath: string) {
  if (!mainWindow || !projectOpenReceiverReady) {
    pendingProjectFile = filePath;
    return;
  }

  pendingProjectFile = null;
  mainWindow.webContents.send('open-project-file', filePath);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    const filePath = findProjectFile(commandLine);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    if (filePath) sendProjectFileToRenderer(filePath);
  });
}

function createWindow() {
  projectOpenReceiverReady = false;
  mainWindow = new BrowserWindow({
    title: 'Liste BOM',
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(_dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    icon: path.join(_dirname, '../public/icon.ico'),
  });

  mainWindow.setMenu(null);

  loadRenderer(mainWindow);

  mainWindow.on('closed', () => {
    mainWindow = null;
    destroyPlanWindow();
  });
}

ipcMain.handle('take-startup-project-file', () => {
  projectOpenReceiverReady = true;
  const filePath = pendingProjectFile;
  pendingProjectFile = null;
  return filePath;
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Auto Updater Configuration
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('update-available', (info) => {
  if (mainWindow) mainWindow.webContents.send('update-available', info);
});

autoUpdater.on('download-progress', (progressObj) => {
  if (mainWindow) mainWindow.webContents.send('download-progress', progressObj);
});

autoUpdater.on('update-downloaded', (info) => {
  if (mainWindow) mainWindow.webContents.send('update-downloaded', info);
});

autoUpdater.on('error', (err) => {
  if (mainWindow) mainWindow.webContents.send('update-error', err.message);
});

ipcMain.handle('check-for-updates', () => {
  autoUpdater.checkForUpdates();
});

ipcMain.handle('quit-and-install', () => {
  autoUpdater.quitAndInstall();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- IPC Handlers ---

ipcMain.handle('get-manufacturers', async () => {
  try {
    return getDb().prepare('SELECT * FROM manufacturers ORDER BY name ASC').all();
  } catch (error) {
    console.error('Error fetching manufacturers:', error);
    return [];
  }
});

ipcMain.handle('search-references', async (_event, query: string, fabCode?: string) => {
  try {
    let sql = 'SELECT * FROM references_data WHERE (ref LIKE ? OR designation LIKE ?)';
    const params: string[] = [`%${query}%`, `%${query}%`];
    
    if (fabCode) {
      sql += ' AND fabCode = ?';
      params.push(fabCode);
    }
    
    sql += ' LIMIT 50'; // Limit results for performance
    return getDb().prepare(sql).all(...params);
  } catch (error) {
    console.error('Error searching references:', error);
    return [];
  }
});

ipcMain.handle('get-reference', async (_event, ref: string) => {
  try {
    return getDb().prepare('SELECT * FROM references_data WHERE ref = ?').get(ref);
  } catch {
    return null;
  }
});

ipcMain.handle('get-filiales', async () => {
  try {
    return getDb().prepare('SELECT * FROM filiales ORDER BY name ASC').all();
  } catch (error) {
    console.error('Error fetching filiales:', error);
    return [];
  }
});

ipcMain.handle('add-filiale', async (_event, data: { name: string }) => {
  try {
    const stmt = getDb().prepare('INSERT INTO filiales (name) VALUES (?)');
    const info = stmt.run(data.name);
    return { success: true, id: info.lastInsertRowid };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
});

ipcMain.handle('update-filiale', async (_event, id: number, data: { name: string }) => {
  try {
    getDb().prepare('UPDATE filiales SET name = ? WHERE id = ?').run(data.name, id);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
});

ipcMain.handle('delete-filiale', async (_event, id: number) => {
  try {
    getDb().prepare('DELETE FROM filiales WHERE id = ?').run(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
});

ipcMain.handle('get-charge-affaires', async () => {
  try {
    return getDb().prepare('SELECT * FROM charge_affaires ORDER BY name ASC').all();
  } catch (error) {
    console.error('Error fetching charge_affaires:', error);
    return [];
  }
});

ipcMain.handle('add-charge-affaire', async (_event, data: { filiale_id: number; name: string }) => {
  try {
    const stmt = getDb().prepare('INSERT INTO charge_affaires (filiale_id, name) VALUES (?, ?)');
    const info = stmt.run(data.filiale_id, data.name);
    return { success: true, id: info.lastInsertRowid };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
});

ipcMain.handle('delete-charge-affaire', async (_event, id: number) => {
  try {
    getDb().prepare('DELETE FROM charge_affaires WHERE id = ?').run(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
});

ipcMain.handle('select-db-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite', 'sqlite3'] }]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  
  const dbPath = result.filePaths[0];
  getDb(dbPath); // Re-initialize DB if path changes
  return dbPath;
});

ipcMain.handle('open-project-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [{ name: 'Fichiers Liste', extensions: ['list'] }]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return { filePath, data };
  } catch (error) {
    console.error(error);
    return { error: 'Impossible de lire le fichier' };
  }
});

ipcMain.handle('open-project-by-path', async (_event, filePath: string) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { error: 'Le fichier n\'existe plus' };
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return { filePath, data };
  } catch (error) {
    console.error(error);
    return { error: 'Impossible de lire le fichier' };
  }
});

ipcMain.handle('save-new-project-file', async (_event, data: ProjectFileData, defaultFilename?: string) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: defaultFilename,
    filters: [{ name: 'Fichiers Liste', extensions: ['list'] }]
  });
  if (result.canceled || !result.filePath) return null;
  try {
    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2));
    return result.filePath;
  } catch (error) {
    return { error: errorMessage(error) };
  }
});

ipcMain.handle('save-project-by-path', async (_event, filePath: string, data: ProjectFileData) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
});

ipcMain.handle('export-excel-auto', async (_event, listFilePath: string, filename: string, base64Data: string) => {
  try {
    const dir = path.dirname(listFilePath);
    const destPath = path.join(dir, filename);

    if (fs.existsSync(destPath)) {
      const choice = await dialog.showMessageBox(mainWindow!, {
        type: 'question',
        buttons: ['Remplacer', 'Annuler'],
        defaultId: 0,
        cancelId: 1,
        title: 'Fichier déjà existant',
        message: `Le fichier "${filename}" existe déjà dans le dossier de l'affaire. Voulez-vous le remplacer ?`
      });
      if (choice.response === 1) {
        return { success: false, cancelled: true };
      }
    }

    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(destPath, buffer);

    const openChoice = await dialog.showMessageBox(mainWindow!, {
      type: 'info',
      buttons: ['Ouvrir le fichier', 'Fermer'],
      defaultId: 0,
      cancelId: 1,
      title: 'Export réussi',
      message: `Fichier Excel exporté avec succès dans le dossier de l'affaire :\n${destPath}\n\nVoulez-vous ouvrir le fichier ?`
    });

    if (openChoice.response === 0) {
      shell.openPath(destPath);
    }

    return { success: true, filePath: destPath };
  } catch (error) {
    console.error('Error auto-exporting excel:', error);
    return { success: false, error: errorMessage(error) };
  }
});

ipcMain.handle('export-pdf-auto', async (_event, listFilePath: string, filename: string, base64Data: string) => {
  try {
    const dir = path.dirname(listFilePath);
    const destPath = path.join(dir, filename);

    if (fs.existsSync(destPath)) {
      const choice = await dialog.showMessageBox(mainWindow!, {
        type: 'question',
        buttons: ['Remplacer', 'Annuler'],
        defaultId: 0,
        cancelId: 1,
        title: 'Fichier déjà existant',
        message: `Le fichier "${filename}" existe déjà dans le dossier de l'affaire. Voulez-vous le remplacer ?`
      });
      if (choice.response === 1) {
        return { success: false, cancelled: true };
      }
    }

    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(destPath, buffer);

    const openChoice = await dialog.showMessageBox(mainWindow!, {
      type: 'info',
      buttons: ['Ouvrir le fichier', 'Fermer'],
      defaultId: 0,
      cancelId: 1,
      title: 'Export réussi',
      message: `Fichier PDF exporté avec succès dans le dossier de l'affaire :\n${destPath}\n\nVoulez-vous ouvrir le fichier ?`
    });

    if (openChoice.response === 0) {
      shell.openPath(destPath);
    }

    return { success: true, filePath: destPath };
  } catch (error) {
    console.error('Error auto-exporting pdf:', error);
    return { success: false, error: errorMessage(error) };
  }
});

ipcMain.handle('save-config', async (_event, config: Partial<AppConfig>) => {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  let existing: AppConfig = {};
  if (fs.existsSync(configPath)) {
    existing = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as AppConfig;
  }
  const updated = { ...existing, ...config };
  fs.writeFileSync(configPath, JSON.stringify(updated, null, 2));
  if (config.dbFilePath) getDb(config.dbFilePath);
});

ipcMain.handle('load-config', async () => {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
  return null;
});

ipcMain.handle('verify-admin-password', async (_event, password: string) => {
  try {
    const db = getDb();
    const row = db.prepare("SELECT value FROM settings WHERE key = 'adminPassword'").get() as { value: string } | undefined;
    const adminPassword = row ? row.value : 'admin';
    return password === adminPassword;
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
});

ipcMain.handle('update-admin-password', async (_event, newPassword: string) => {
  try {
    const db = getDb();
    db.prepare("UPDATE settings SET value = ? WHERE key = 'adminPassword'").run(newPassword);
    return { success: true };
  } catch (error) {
    console.error('Error updating password:', error);
    return { success: false, error: errorMessage(error) };
  }
});

// --- Catalog Administration IPCs ---

ipcMain.handle('preview-excel-catalog', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xlsm', 'xls'] }]
    });

    if (result.canceled || result.filePaths.length === 0) return { success: false, error: 'Annulé' };

    const filePath = result.filePaths[0];
    let fileBuffer;
    try {
      fileBuffer = fs.readFileSync(filePath);
    } catch (fsError) {
      if (fsError instanceof Error && 'code' in fsError && (fsError.code === 'EBUSY' || fsError.code === 'EPERM')) {
        return { success: false, error: "Le fichier est ouvert dans un autre programme (ex: Excel). Veuillez le fermer avant de l'importer." };
      }
      return { success: false, error: "Impossible de lire le fichier: " + errorMessage(fsError) };
    }

    const wb = xlsx.read(fileBuffer, { type: 'buffer' });
    const schema: Record<string, { id: string, label: string }[]> = {};

    const getColumnLetter = (index: number) => {
        let letter = '';
        let temp = index;
        while (temp >= 0) {
            letter = String.fromCharCode(65 + (temp % 26)) + letter;
            temp = Math.floor(temp / 26) - 1;
        }
        return letter;
    };

    wb.SheetNames.forEach(sheetName => {
      const sheet = wb.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
      if (data && data.length > 0) {
        const headerRow = data[0] || [];
        let maxCols = 0;
        data.forEach(row => { if (row && row.length > maxCols) maxCols = row.length; });
        
        const cols: Array<{ id: string; label: string }> = [];
        for (let i = 0; i < maxCols; i++) {
            const colLetter = getColumnLetter(i);
            const h = headerRow[i];
            
            const preview: string[] = [];
            for (let r = 1; r <= 2; r++) {
                if (data[r] && data[r][i] !== undefined && data[r][i] !== null && String(data[r][i]).trim() !== '') {
                    preview.push(String(data[r][i]).trim());
                }
            }
            const previewText = preview.length > 0 ? ` (Ex: ${preview.join(', ')})` : '';
            const label = `[${colLetter}] ${h ? String(h).trim() : 'Colonne ' + colLetter}${previewText}`;
            
            cols.push({ id: String(i), label });
        }
        schema[sheetName] = cols;
      } else {
        schema[sheetName] = [];
      }
    });

    return { success: true, filePath, schema };
  } catch (error) {
    console.error('Error previewing catalog:', error);
    return { success: false, error: errorMessage(error) };
  }
});

ipcMain.handle('import-excel-catalog', async (_event, filePath: string, mapping: CatalogImportMapping) => {
  try {
    let fileBuffer;
    try {
      fileBuffer = fs.readFileSync(filePath);
    } catch (fsError) {
      if (fsError instanceof Error && 'code' in fsError && (fsError.code === 'EBUSY' || fsError.code === 'EPERM')) {
        return { success: false, error: "Le fichier est ouvert dans un autre programme (ex: Excel). Veuillez le fermer avant de l'importer." };
      }
      return { success: false, error: "Impossible de lire le fichier: " + errorMessage(fsError) };
    }

    const wb = xlsx.read(fileBuffer, { type: 'buffer' });

    const transaction = getDb().transaction(() => {
      
      // 1. Import Manufacturers
      if (mapping.manufacturers && mapping.manufacturers.sheet) {
        const sheetName = mapping.manufacturers.sheet;
        if (wb.SheetNames.includes(sheetName)) {
           const sheet = wb.Sheets[sheetName];
           const data = xlsx.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
           
           const validRows = [];
           for (let r = 1; r < data.length; r++) {
             const row = data[r];
             if (!row) continue;
             const code = row[parseInt(mapping.manufacturers.codeFab)];
             const name = row[parseInt(mapping.manufacturers.name)];
             if (code && name && String(code).trim() !== '' && String(code).trim() !== '-') {
               validRows.push({ code: String(code).trim(), name: String(name).trim() });
             }
           }
           
           if (validRows.length > 0) {
             const insertFab = getDb().prepare('INSERT OR REPLACE INTO manufacturers (code, name) VALUES (?, ?)');
             for (const item of validRows) {
               insertFab.run(item.code, item.name);
             }
           }
        }
      }

      // 2. Import References
      if (mapping.references && mapping.references.sheet) {
        const sheetName = mapping.references.sheet;
        if (wb.SheetNames.includes(sheetName)) {
           const sheet = wb.Sheets[sheetName];
           const data = xlsx.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
           
           const validRows = [];
           for (let r = 1; r < data.length; r++) {
             const row = data[r];
             if (!row) continue;
             const ref = row[parseInt(mapping.references.ref)];
             const des = row[parseInt(mapping.references.designation)];
             const fab = row[parseInt(mapping.references.fabCode)];
             
             let weight = null;
             if (mapping.references.weight !== undefined && mapping.references.weight !== '') {
               const weightVal = row[parseInt(mapping.references.weight)];
               weight = weightVal ? parseFloat(String(weightVal).replace(',', '.')) : null;
             }

             if (ref && des && String(ref).trim() !== '-' && String(ref).trim() !== '') {
               validRows.push({
                 ref: String(ref).trim(),
                 des: String(des).trim(),
                 fab: String(fab).trim(),
                 weight: isNaN(weight as number) ? null : weight
               });
             }
           }
           
          if (validRows.length > 0) {
            const insertRef = getDb().prepare(`
              INSERT INTO references_data (ref, designation, fabCode, weight, typeId)
              VALUES (?, ?, ?, ?, (SELECT typeId FROM references_data WHERE ref = ?))
              ON CONFLICT(ref) DO UPDATE SET
                designation = excluded.designation,
                fabCode = excluded.fabCode,
                weight = excluded.weight
            `);
            
            for (const item of validRows) {
              try {
                 insertRef.run(item.ref, item.des, item.fab, item.weight, item.ref);
              } catch (err) {
                 console.warn('Duplicate or error inserting ref:', item.ref, err);
              }
            }
          }
        }
      }
    });

    transaction();
    return { success: true };
  } catch (error) {
    console.error('Error importing catalog:', error);
    return { success: false, error: errorMessage(error) };
  }
});

ipcMain.handle('get-paginated-references', async (_event, page: number, pageSize: number, search: string) => {
  try {
    const offset = (page - 1) * pageSize;
    let sql = 'SELECT * FROM references_data';
    let countSql = 'SELECT COUNT(*) as total FROM references_data';
    const params: Array<string | number> = [];
    
    if (search && search.trim() !== '') {
      const query = `%${search.trim()}%`;
      const where = ' WHERE ref LIKE ? OR designation LIKE ? OR fabCode LIKE ?';
      sql += where;
      countSql += where;
      params.push(query, query, query);
    }
    
    sql += ' ORDER BY ref ASC LIMIT ? OFFSET ?';
    
    const countResult = getDb().prepare(countSql).get(...params) as { total: number };
    const items = getDb().prepare(sql).all(...params, pageSize, offset);
    
    return { items, total: countResult.total };
  } catch (error) {
    console.error('Error fetching paginated references:', error);
    return { items: [], total: 0 };
  }
});

// Basic CRUD for References
ipcMain.handle('add-reference', async (_event, data: ComponentRef) => {
  try {
    const typeId = assertTypeExists(parseTypeId(data.typeId));
    const stmt = getDb().prepare('INSERT INTO references_data (ref, designation, fabCode, weight, typeId) VALUES (?, ?, ?, ?, ?)');
    stmt.run(data.ref, data.designation, data.fabCode, data.weight || null, typeId);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
});

ipcMain.handle('update-reference', async (_event, oldRef: string, data: ComponentRef) => {
  try {
    const typeId = assertTypeExists(parseTypeId(data.typeId));
    const stmt = getDb().prepare('UPDATE references_data SET ref = ?, designation = ?, fabCode = ?, weight = ?, typeId = ? WHERE ref = ?');
    stmt.run(data.ref, data.designation, data.fabCode, data.weight || null, typeId, oldRef);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
});

ipcMain.handle('delete-reference', async (_event, ref: string) => {
  try {
    getDb().prepare('DELETE FROM references_data WHERE ref = ?').run(ref);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
});

// Basic CRUD for Manufacturers
ipcMain.handle('add-manufacturer', async (_event, data: Manufacturer) => {
  try {
    const stmt = getDb().prepare('INSERT INTO manufacturers (code, name) VALUES (?, ?)');
    stmt.run(data.code, data.name);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
});

ipcMain.handle('update-manufacturer', async (_event, oldCode: string, data: Manufacturer) => {
  try {
    const stmt = getDb().prepare('UPDATE manufacturers SET code = ?, name = ? WHERE code = ?');
    stmt.run(data.code, data.name, oldCode);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
});

ipcMain.handle('delete-manufacturer', async (_event, code: string) => {
  try {
    getDb().prepare('DELETE FROM manufacturers WHERE code = ?').run(code);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
});


ipcMain.handle('get-component-types', async () => {
  try {
    return getDb().prepare('SELECT id, name, color FROM component_types ORDER BY name ASC').all();
  } catch (error) {
    console.error('Error fetching component types:', error);
    return [];
  }
});

ipcMain.handle('add-component-type', async (_event, data: { name: string; color: string }) => {
  try {
    const name = String(data.name || '').trim();
    if (!name) throw new Error('Le nom du type est obligatoire.');
    const color = validateTypeColor(data.color);
    const result = getDb().prepare('INSERT INTO component_types (name, color) VALUES (?, ?)').run(name, color);
    return { success: true, id: Number(result.lastInsertRowid) };
  } catch (error) {
    return { success: false, error: mapTypeError(error) };
  }
});

ipcMain.handle('update-component-type', async (_event, id: number, data: { name: string; color: string }) => {
  try {
    const name = String(data.name || '').trim();
    if (!name) throw new Error('Le nom du type est obligatoire.');
    const color = validateTypeColor(data.color, id);
    const result = getDb().prepare('UPDATE component_types SET name = ?, color = ? WHERE id = ?').run(name, color, id);
    if (result.changes === 0) throw new Error('Type introuvable.');
    return { success: true };
  } catch (error) {
    return { success: false, error: mapTypeError(error) };
  }
});

ipcMain.handle('delete-component-type', async (_event, id: number) => {
  try {
    const database = getDb();
    const tx = database.transaction(() => {
      database.prepare('UPDATE references_data SET typeId = NULL WHERE typeId = ?').run(id);
      const result = database.prepare('DELETE FROM component_types WHERE id = ?').run(id);
      if (result.changes === 0) throw new Error('Type introuvable.');
    });
    tx();
    return { success: true };
  } catch (error) {
    return { success: false, error: mapTypeError(error) };
  }
});

ipcMain.handle('open-external', async (_event, url: string) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
});

ipcMain.handle('show-project-in-folder', async (_event, filePath: string) => {
  try {
    if (!path.isAbsolute(filePath) || path.extname(filePath).toLowerCase() !== '.list' || !fs.existsSync(filePath)) {
      return { success: false, error: 'Fichier liste introuvable.' };
    }
    shell.showItemInFolder(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
});

ipcMain.handle('open-plan-window', async () => {
  openOrFocusPlanWindow();
});

ipcMain.handle('close-plan-window', async () => {
  destroyPlanWindow();
});

ipcMain.on('plan-state', (_event, state: PlanWindowState) => {
  lastPlanState = state;
  if (planWindow && !planWindow.isDestroyed()) {
    planWindow.webContents.send('plan-state', state);
  }
});

ipcMain.on('plan-action', (_event, action: { type?: string }) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (action?.type === 'focusAddReference') {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
    mainWindow.webContents.send('plan-action', action);
  }
});

ipcMain.on('plan-window-ready', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('plan-window-ready');
  }
  if (lastPlanState && planWindow && !planWindow.isDestroyed()) {
    planWindow.webContents.send('plan-state', lastPlanState);
  }
});

ipcMain.handle('select-plan-pdf', async (event) => {
  const senderWindow = BrowserWindow.fromWebContents(event.sender) ?? planWindow ?? mainWindow;
  if (!senderWindow) return null;
  const result = await dialog.showOpenDialog(senderWindow, {
    properties: ['openFile'],
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('copy-plan-pdf', async (_event, projectPath: string, sourcePath: string, storedName: string) => {
  try {
    assertStoredPlanName(storedName);
    if (!path.isAbsolute(sourcePath) || !fs.existsSync(sourcePath)) {
      return { success: false, error: 'Fichier PDF introuvable.' };
    }
    const plansDir = getPlansDir(projectPath);
    fs.mkdirSync(plansDir, { recursive: true });
    const destPath = path.join(plansDir, storedName);
    fs.copyFileSync(sourcePath, destPath);
    const pageCount = await countPdfPages(destPath);
    return { success: true, pageCount };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
});

ipcMain.handle('read-plan-pdf', async (_event, projectPath: string, storedName: string) => {
  try {
    assertStoredPlanName(storedName);
    const destPath = path.join(getPlansDir(projectPath), storedName);
    if (!fs.existsSync(destPath)) {
      return { error: 'Le fichier du plan est introuvable.' };
    }
    const data = new Uint8Array(fs.readFileSync(destPath));
    return { data };
  } catch (error) {
    return { error: errorMessage(error) };
  }
});

ipcMain.handle('delete-plan-pdf', async (_event, projectPath: string, storedName: string) => {
  try {
    assertStoredPlanName(storedName);
    const destPath = path.join(getPlansDir(projectPath), storedName);
    if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
    const dir = getPlansDir(projectPath);
    if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
      fs.rmdirSync(dir);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
});
