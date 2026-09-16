import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronApi } from '../src/types';

const electronAPI: ElectronApi = {
  getManufacturers: () => ipcRenderer.invoke('get-manufacturers'),
  searchReferences: (query: string, fabCode?: string) => ipcRenderer.invoke('search-references', query, fabCode),
  getReference: (ref: string) => ipcRenderer.invoke('get-reference', ref),
  selectDbFile: () => ipcRenderer.invoke('select-db-file'),
  openProjectFile: () => ipcRenderer.invoke('open-project-file'),
  openProjectByPath: (filePath: string) => ipcRenderer.invoke('open-project-by-path', filePath),
  saveNewProjectFile: (data, defaultFilename) => ipcRenderer.invoke('save-new-project-file', data, defaultFilename),
  saveProjectByPath: (filePath, data) => ipcRenderer.invoke('save-project-by-path', filePath, data),
  exportExcelAuto: (listFilePath: string, filename: string, base64Data: string) => ipcRenderer.invoke('export-excel-auto', listFilePath, filename, base64Data),
  exportPdfAuto: (listFilePath: string, filename: string, base64Data: string) => ipcRenderer.invoke('export-pdf-auto', listFilePath, filename, base64Data),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  verifyAdminPassword: (password: string) => ipcRenderer.invoke('verify-admin-password', password),
  updateAdminPassword: (newPassword: string) => ipcRenderer.invoke('update-admin-password', newPassword),
  
  // Catalog Administration
  previewExcelCatalog: () => ipcRenderer.invoke('preview-excel-catalog'),
  importExcelCatalog: (filePath, mapping) => ipcRenderer.invoke('import-excel-catalog', filePath, mapping),
  getPaginatedReferences: (page: number, pageSize: number, search: string) => ipcRenderer.invoke('get-paginated-references', page, pageSize, search),
  addReference: (data) => ipcRenderer.invoke('add-reference', data),
  updateReference: (oldRef, data) => ipcRenderer.invoke('update-reference', oldRef, data),
  deleteReference: (ref: string) => ipcRenderer.invoke('delete-reference', ref),
  addManufacturer: (data) => ipcRenderer.invoke('add-manufacturer', data),
  updateManufacturer: (oldCode, data) => ipcRenderer.invoke('update-manufacturer', oldCode, data),
  deleteManufacturer: (code: string) => ipcRenderer.invoke('delete-manufacturer', code),
  
  getFiliales: () => ipcRenderer.invoke('get-filiales'),
  addFiliale: (data) => ipcRenderer.invoke('add-filiale', data),
  updateFiliale: (id, data) => ipcRenderer.invoke('update-filiale', id, data),
  deleteFiliale: (id: number) => ipcRenderer.invoke('delete-filiale', id),

  getChargeAffaires: () => ipcRenderer.invoke('get-charge-affaires'),
  addChargeAffaire: (data) => ipcRenderer.invoke('add-charge-affaire', data),
  deleteChargeAffaire: (id: number) => ipcRenderer.invoke('delete-charge-affaire', id),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  
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
