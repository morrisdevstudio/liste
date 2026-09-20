import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronApi, ThemePreference } from '../src/types';

const electronAPI: ElectronApi = {
  getManufacturers: () => ipcRenderer.invoke('get-manufacturers'),
  searchReferences: (query: string, fabCode?: string) => ipcRenderer.invoke('search-references', query, fabCode),
  getReference: (ref: string) => ipcRenderer.invoke('get-reference', ref),
  selectDbFile: () => ipcRenderer.invoke('select-db-file'),
  openProjectFile: () => ipcRenderer.invoke('open-project-file'),
  openProjectByPath: (filePath: string) => ipcRenderer.invoke('open-project-by-path', filePath),
  takeStartupProjectFile: () => ipcRenderer.invoke('take-startup-project-file'),
  onOpenProjectFile: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, filePath: string) => callback(filePath);
    ipcRenderer.on('open-project-file', listener);
    return () => ipcRenderer.removeListener('open-project-file', listener);
  },
  saveNewProjectFile: (data, defaultFilename) => ipcRenderer.invoke('save-new-project-file', data, defaultFilename),
  saveProjectByPath: (filePath, data) => ipcRenderer.invoke('save-project-by-path', filePath, data),
  exportExcelAuto: (listFilePath: string, filename: string, base64Data: string) => ipcRenderer.invoke('export-excel-auto', listFilePath, filename, base64Data),
  exportPdfAuto: (listFilePath: string, filename: string, base64Data: string) => ipcRenderer.invoke('export-pdf-auto', listFilePath, filename, base64Data),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  onThemeChanged: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, theme: ThemePreference) => callback(theme);
    ipcRenderer.on('theme-changed', listener);
    return () => ipcRenderer.removeListener('theme-changed', listener);
  },
  verifyAdminPassword: (password: string) => ipcRenderer.invoke('verify-admin-password', password),
  updateAdminPassword: (newPassword: string) => ipcRenderer.invoke('update-admin-password', newPassword),
  
  // Catalog Administration
  previewExcelCatalog: () => ipcRenderer.invoke('preview-excel-catalog'),
  importExcelCatalog: (filePath, mapping) => ipcRenderer.invoke('import-excel-catalog', filePath, mapping),
  getPaginatedReferences: (page: number, pageSize: number, search: string) => ipcRenderer.invoke('get-paginated-references', page, pageSize, search),
  addReference: (data) => ipcRenderer.invoke('add-reference', data),
  updateReference: (oldRef, data) => ipcRenderer.invoke('update-reference', oldRef, data),
  assignReferenceType: (refs: string[], typeId: number) => ipcRenderer.invoke('assign-reference-type', refs, typeId),
  deleteReference: (ref: string) => ipcRenderer.invoke('delete-reference', ref),
  addManufacturer: (data) => ipcRenderer.invoke('add-manufacturer', data),
  updateManufacturer: (oldCode, data) => ipcRenderer.invoke('update-manufacturer', oldCode, data),
  deleteManufacturer: (code: string) => ipcRenderer.invoke('delete-manufacturer', code),
  getComponentTypes: () => ipcRenderer.invoke('get-component-types'),
  addComponentType: (data) => ipcRenderer.invoke('add-component-type', data),
  updateComponentType: (id, data) => ipcRenderer.invoke('update-component-type', id, data),
  deleteComponentType: (id: number) => ipcRenderer.invoke('delete-component-type', id),
  
  getFiliales: () => ipcRenderer.invoke('get-filiales'),
  addFiliale: (data) => ipcRenderer.invoke('add-filiale', data),
  updateFiliale: (id, data) => ipcRenderer.invoke('update-filiale', id, data),
  deleteFiliale: (id: number) => ipcRenderer.invoke('delete-filiale', id),

  getChargeAffaires: () => ipcRenderer.invoke('get-charge-affaires'),
  addChargeAffaire: (data) => ipcRenderer.invoke('add-charge-affaire', data),
  deleteChargeAffaire: (id: number) => ipcRenderer.invoke('delete-charge-affaire', id),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  showProjectInFolder: (filePath: string) => ipcRenderer.invoke('show-project-in-folder', filePath),

  openPlanWindow: () => ipcRenderer.invoke('open-plan-window'),
  closePlanWindow: () => ipcRenderer.invoke('close-plan-window'),
  pushPlanState: (state) => ipcRenderer.send('plan-state', state),
  onPlanWindowReady: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('plan-window-ready', listener);
    return () => ipcRenderer.removeListener('plan-window-ready', listener);
  },
  onPlanAction: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, action: Parameters<typeof callback>[0]) => callback(action);
    ipcRenderer.on('plan-action', listener);
    return () => ipcRenderer.removeListener('plan-action', listener);
  },
  onPlanState: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, state: Parameters<typeof callback>[0]) => callback(state);
    ipcRenderer.on('plan-state', listener);
    return () => ipcRenderer.removeListener('plan-state', listener);
  },
  sendPlanAction: (action) => ipcRenderer.send('plan-action', action),
  notifyPlanWindowReady: () => ipcRenderer.send('plan-window-ready'),
  selectPlanPdf: () => ipcRenderer.invoke('select-plan-pdf'),
  copyPlanPdf: (projectPath, sourcePath, storedName) => ipcRenderer.invoke('copy-plan-pdf', projectPath, sourcePath, storedName),
  deletePlanPdf: (projectPath, storedName) => ipcRenderer.invoke('delete-plan-pdf', projectPath, storedName),
  readPlanPdf: async (projectPath, storedName) => {
    const result = await ipcRenderer.invoke('read-plan-pdf', projectPath, storedName);
    if (result?.data) {
      const raw = result.data as ArrayBuffer | Uint8Array | { type?: string; data?: number[] };
      let bytes: Uint8Array;
      if (raw instanceof ArrayBuffer) {
        bytes = new Uint8Array(raw);
      } else if (ArrayBuffer.isView(raw)) {
        bytes = new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
      } else if (Array.isArray((raw as { data?: number[] }).data)) {
        bytes = Uint8Array.from((raw as { data: number[] }).data);
      } else {
        return { error: 'Le fichier du plan est illisible.' };
      }
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      return { data: copy.buffer };
    }
    return result;
  },

  // Auto-Update
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
  onUpdateError: (callback) => ipcRenderer.on('update-error', callback),
  removeAllUpdateListeners: () => {
    ipcRenderer.removeAllListeners('update-available');
    ipcRenderer.removeAllListeners('download-progress');
    ipcRenderer.removeAllListeners('update-downloaded');
    ipcRenderer.removeAllListeners('update-error');
  }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
