export type Manufacturer = {
  code: string;
  name: string;
};

export type Filiale = {
  id?: number;
  name: string;
};

export type ChargeAffaire = {
  id?: number;
  filiale_id: number;
  name: string;
};

export type ComponentRef = {
  ref: string;
  designation: string;
  fabCode: string;
  weight?: number;
};

export type Project = {
  id: string; // N° Affaire (ou Affaire origine si c'est la même chose)
  techName: string; // Technicien BE
  createdAt: string;
  filialeOrigine?: string;
  affaireOrigine?: string;
  ligneOrigine?: string;
  filialeExecutant?: string;
  affaireExecutant?: string;
  ligneExecutant?: string;
  affaireUF?: string;
  ligneUF?: string;
  client?: string;
  nomAffaire?: string;
  nomTableau?: string;
  chargeAffaire?: string;
  isSousTraitance?: boolean;
  isUF?: boolean;
};

export type SublistType = 'fiche_achat' | 'appro_anticipe';

export type Sublist = {
  id: string;
  projectId: string;
  name: string;
  type: SublistType;
};

export type Category = 'Canevas' | 'U.F.' | 'Autre' | 'Tôlerie' | 'Électronique';

export type BOMLine = {
  id: string;
  projectId: string;
  sublistId: string;
  ref: string;
  quantity: number;
  location?: string;
  // deprecated/kept for backwards compat if needed, but not primarily used for view logic anymore
  category?: Category;
};

export type ShortcutAction =
  | 'addReference'
  | 'addQuantity'
  | 'cycleSort'
  | 'selectPrevious'
  | 'selectNext'
  | 'incrementQuantity'
  | 'decrementQuantity'
  | 'deleteLine'
  | 'focusSearch'
  | 'toggleHelp'
  | 'dismiss';

export type ShortcutBinding = {
  key: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
};

export type ShortcutBindings = Record<ShortcutAction, ShortcutBinding>;

export type ListDensity = 'comfortable' | 'compact' | 'dense';

export type ListViewPreferences = {
  density: ListDensity;
  topPanelCollapsed: boolean;
  bottomPanelCollapsed: boolean;
};

export const DEFAULT_LIST_VIEW_PREFERENCES: ListViewPreferences = {
  density: 'comfortable',
  topPanelCollapsed: false,
  bottomPanelCollapsed: false,
};

export type ProjectFileData = {
  project: Project;
  sublists: Sublist[];
  bomLines: BOMLine[];
};

export type AppConfig = {
  dbFilePath?: string;
  recentFiles?: Array<{ id: string; path: string; tech: string; nomAffaire?: string; nomTableau?: string; lastOpened: number }>;
  defaultTechName?: string;
  shortcutBindings?: Partial<ShortcutBindings>;
  listViewPreferences?: Partial<ListViewPreferences>;
};

export type CatalogImportMapping = {
  manufacturers: { sheet: string; codeFab: string; name: string };
  references: { sheet: string; ref: string; designation: string; fabCode: string; weight: string };
};

export type UpdateInfo = { version: string; releaseNotes?: string };
export type UpdateProgress = { percent: number };

export type ElectronApi = {
  getManufacturers: () => Promise<Manufacturer[]>;
  searchReferences: (query: string, fabCode?: string) => Promise<ComponentRef[]>;
  getReference: (ref: string) => Promise<ComponentRef | null>;
  selectDbFile: () => Promise<string | null>;
  openProjectFile: () => Promise<{ filePath: string; data: ProjectFileData } | { error: string } | null>;
  openProjectByPath: (filePath: string) => Promise<{ filePath: string; data: ProjectFileData } | { error: string }>;
  takeStartupProjectFile: () => Promise<string | null>;
  onOpenProjectFile: (callback: (filePath: string) => void) => () => void;
  saveNewProjectFile: (data: ProjectFileData, defaultFilename?: string) => Promise<string | { error: string } | null>;
  saveProjectByPath: (filePath: string, data: ProjectFileData) => Promise<{ success: boolean; error?: string }>;
  exportExcelAuto: (listFilePath: string, filename: string, base64Data: string) => Promise<{ success: boolean; filePath?: string; error?: string; cancelled?: boolean }>;
  exportPdfAuto: (listFilePath: string, filename: string, base64Data: string) => Promise<{ success: boolean; filePath?: string; error?: string; cancelled?: boolean }>;
  saveConfig: (config: Partial<AppConfig>) => Promise<void>;
  loadConfig: () => Promise<AppConfig | null>;
  verifyAdminPassword: (password: string) => Promise<boolean>;
  updateAdminPassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  previewExcelCatalog: () => Promise<{ success: boolean; filePath?: string; schema?: Record<string, { id: string; label: string }[]>; error?: string }>;
  importExcelCatalog: (filePath: string, mapping: CatalogImportMapping) => Promise<{ success: boolean; error?: string }>;
  getPaginatedReferences: (page: number, pageSize: number, search: string) => Promise<{ items: ComponentRef[]; total: number }>;
  addReference: (data: Omit<ComponentRef, 'weight'> & { weight?: number }) => Promise<{ success: boolean; error?: string }>;
  updateReference: (oldRef: string, data: Omit<ComponentRef, 'weight'> & { weight?: number }) => Promise<{ success: boolean; error?: string }>;
  deleteReference: (ref: string) => Promise<{ success: boolean; error?: string }>;
  addManufacturer: (data: Manufacturer) => Promise<{ success: boolean; error?: string }>;
  updateManufacturer: (oldCode: string, data: Manufacturer) => Promise<{ success: boolean; error?: string }>;
  deleteManufacturer: (code: string) => Promise<{ success: boolean; error?: string }>;
  getFiliales: () => Promise<Filiale[]>;
  addFiliale: (data: { name: string }) => Promise<{ success: boolean; id?: number; error?: string }>;
  updateFiliale: (id: number, data: { name: string }) => Promise<{ success: boolean; error?: string }>;
  deleteFiliale: (id: number) => Promise<{ success: boolean; error?: string }>;
  getChargeAffaires: () => Promise<ChargeAffaire[]>;
  addChargeAffaire: (data: { filiale_id: number; name: string }) => Promise<{ success: boolean; id?: number; error?: string }>;
  deleteChargeAffaire: (id: number) => Promise<{ success: boolean; error?: string }>;
  openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
  showProjectInFolder: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  checkForUpdates: () => Promise<void>;
  quitAndInstall: () => Promise<void>;
  onUpdateAvailable: (callback: (event: unknown, info: UpdateInfo) => void) => void;
  onDownloadProgress: (callback: (event: unknown, progress: UpdateProgress) => void) => void;
  onUpdateDownloaded: (callback: (event: unknown, info: UpdateInfo) => void) => void;
  onUpdateError: (callback: (event: unknown, error: string) => void) => void;
  removeAllUpdateListeners: () => void;
};

declare global {
  interface Window {
    electronAPI?: ElectronApi;
  }
}
