import { create } from 'zustand';
import { Project, BOMLine, Manufacturer, Sublist, Category, Filiale, ChargeAffaire, ShortcutBindings, ProjectFileData, ListViewPreferences, DEFAULT_LIST_VIEW_PREFERENCES, Plan, SublistPlan, Marker } from '../types';
import { mockManufacturers } from '../mockData';
import { DEFAULT_SHORTCUT_BINDINGS, mergeShortcutBindings } from '../shortcuts';
import { emptyPlanCollections, normalizePlanCollections } from '../planModel';

export type RecentFile = { id: string, path: string, tech: string, nomAffaire?: string, nomTableau?: string, lastOpened: number };

type PlanHistoryEntry = {
  type: 'place' | 'remove';
  marker: Marker;
  previousQuantity: number;
};

interface AppState {
  bomLines: BOMLine[];
  manufacturers: Manufacturer[];
  filiales: Filiale[];
  chargeAffaires: ChargeAffaire[];
  currentProjectId: string | null;
  currentProject: Project | null;
  currentProjectPath: string | null;
  sublists: Sublist[];
  plans: Plan[];
  sublistPlans: SublistPlan[];
  markers: Marker[];
  planUndo: PlanHistoryEntry[];
  planRedo: PlanHistoryEntry[];
  dbFilePath: string | null;
  recentFiles: RecentFile[];
  defaultTechName: string;
  shortcutBindings: ShortcutBindings;
  listViewPreferences: ListViewPreferences;
  
  isLoaded: boolean;
  loadState: () => Promise<void>;
  refreshCatalogs: () => Promise<void>;
  saveState: () => Promise<void>;
  setDbFilePath: (path: string) => Promise<void>;
  setDefaultTechName: (name: string) => Promise<void>;
  setShortcutBindings: (bindings: ShortcutBindings) => Promise<void>;
  setListViewPreferences: (preferences: ListViewPreferences) => Promise<void>;
  
  addSublist: (sublist: Omit<Sublist, 'id'>) => Promise<void>;
  removeSublist: (id: string) => Promise<void>;
  
  updateProjectSettings: (data: Partial<Project>) => Promise<void>;
  closeProject: () => void;
  openProjectFromFile: () => Promise<void>;
  openProjectByPath: (filePath: string) => Promise<void>;
  createProjectInteractive: (projectData: Omit<Project, 'createdAt'>) => Promise<boolean>;
  
  addOrUpdateBOMLine: (line: Omit<BOMLine, 'id'>) => Promise<string | null>;
  removeBOMLine: (id: string) => Promise<void>;
  removeZeroQuantityLines: (projectId: string, sublistId: string) => Promise<number>;
  updateBOMLineQte: (id: string, quantity: number) => Promise<void>;
  updateBOMLineRef: (id: string, ref: string) => Promise<{ needsConfirm?: { fromId: string; toId: string; movingCount: number; survivorQty: number } } | undefined>;
  confirmMergeBOMLine: (fromId: string, toId: string) => Promise<void>;
  importBOMData: (projectId: string, data: Array<Record<string, unknown>>) => Promise<{ ignored: number }>;
  attachPlanFromFile: (sublistId: string, sourcePath: string) => Promise<{ success: boolean; error?: string }>;
  reuseExistingPlan: (sublistId: string, planId: string) => Promise<{ success: boolean; error?: string }>;
  detachPlanFromList: (sublistId: string) => Promise<{ success: boolean; error?: string }>;
  replacePlanForList: (sublistId: string, sourcePath: string) => Promise<{ success: boolean; error?: string }>;
  deletePlanFromProject: (planId: string) => Promise<{ success: boolean; error?: string }>;
  recollerPlan: (planId: string, sourcePath: string) => Promise<{ success: boolean; error?: string }>;
  placePlanMarker: (input: { planId: string; bomLineId: string; page: number; x: number; y: number; confirmReplace?: boolean }) => Promise<{ success: boolean; needsConfirm?: boolean; error?: string }>;
  removePlanMarker: (markerId: string, allowedSublistId: string) => Promise<{ success: boolean; error?: string }>;
  undoPlanAction: () => Promise<void>;
  redoPlanAction: () => Promise<void>;
  canUndoPlan: () => boolean;
  canRedoPlan: () => boolean;
}

const LOCAL_STORAGE_KEY = 'bom-app-data';

export const useStore = create<AppState>((set, get) => ({
  sublists: [],
  bomLines: [],
  manufacturers: [],
  filiales: [],
  chargeAffaires: [],
  currentProjectId: null,
  currentProject: null,
  currentProjectPath: null,
  plans: [],
  sublistPlans: [],
  markers: [],
  planUndo: [],
  planRedo: [],
  dbFilePath: null,
  recentFiles: [],
  defaultTechName: 'Technicien BE',
  shortcutBindings: DEFAULT_SHORTCUT_BINDINGS,
  listViewPreferences: DEFAULT_LIST_VIEW_PREFERENCES,
  isLoaded: false,

  setDbFilePath: async (path) => {
    set({ dbFilePath: path });
    if (window.electronAPI) {
      await window.electronAPI.saveConfig({ dbFilePath: path });
      await get().refreshCatalogs();
    }
  },

  setDefaultTechName: async (name: string) => {
    set({ defaultTechName: name });
    if (window.electronAPI) {
      await window.electronAPI.saveConfig({ defaultTechName: name });
    }
  },

  setShortcutBindings: async (shortcutBindings) => {
    set({ shortcutBindings });
    if (window.electronAPI) {
      await window.electronAPI.saveConfig({ shortcutBindings });
    }
  },

  setListViewPreferences: async (listViewPreferences) => {
    set({ listViewPreferences });
    if (window.electronAPI) {
      await window.electronAPI.saveConfig({ listViewPreferences });
    }
  },

  saveState: async () => {
    const state = get();
    const { currentProjectId, currentProjectPath } = state;

    if (!currentProjectId || !state.currentProject) return;

    const projectData: ProjectFileData = {
      project: state.currentProject,
      sublists: state.sublists.filter(s => s.projectId === currentProjectId),
      bomLines: state.bomLines.filter(l => l.projectId === currentProjectId),
      plans: state.plans,
      sublistPlans: state.sublistPlans,
      markers: state.markers,
    };

    if (window.electronAPI && currentProjectPath) {
      await window.electronAPI.saveProjectByPath(currentProjectPath, projectData);
    } else if (!window.electronAPI) {
      const dataToSave = {
        manufacturers: state.manufacturers,
        sublists: state.sublists,
        bomLines: state.bomLines
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
    }
  },

  loadState: async () => {
    try {
      if (window.electronAPI) {
        const manufPromise = window.electronAPI.getManufacturers();
        const filialesPromise = window.electronAPI.getFiliales();
        const caPromise = window.electronAPI.getChargeAffaires();
        const config = await window.electronAPI.loadConfig();
        
        const [manufData, filialesData, caData] = await Promise.all([manufPromise, filialesPromise, caPromise]);
        
        set({
          manufacturers: manufData || [],
          filiales: filialesData || [],
          chargeAffaires: caData || [],
          recentFiles: config?.recentFiles || [],
          dbFilePath: config?.dbFilePath || null,
          defaultTechName: config?.defaultTechName || 'Technicien BE',
          shortcutBindings: mergeShortcutBindings(config?.shortcutBindings),
          listViewPreferences: { ...DEFAULT_LIST_VIEW_PREFERENCES, ...config?.listViewPreferences },
          isLoaded: true
        });
      } else {
        set({
          manufacturers: mockManufacturers,
          filiales: [],
          chargeAffaires: [],
          isLoaded: true
        });
      }
      
      if (!window.electronAPI) {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          const data = JSON.parse(saved);
          set({
            sublists: data.sublists || [],
            bomLines: data.bomLines || []
          });
        }
      }
    } catch(e) {
      console.error("Failed to load state", e);
    }
  },

  refreshCatalogs: async () => {
    if (window.electronAPI) {
      try {
        const manufPromise = window.electronAPI.getManufacturers();
        const filialesPromise = window.electronAPI.getFiliales();
        const caPromise = window.electronAPI.getChargeAffaires();
        const [manufData, filialesData, caData] = await Promise.all([manufPromise, filialesPromise, caPromise]);
        set({
          manufacturers: manufData || [],
          filiales: filialesData || [],
          chargeAffaires: caData || []
        });
      } catch (e) {
        console.error("Failed to refresh catalogs", e);
      }
    }
  },

  updateProjectSettings: async (data: Partial<Project>) => {
    const current = get().currentProject;
    if (!current) return;
    
    // Si affaireOrigine ou ligneOrigine change, on met à jour l'ID global de l'affaire
    let newId = current.id;
    if (data.affaireOrigine !== undefined || data.ligneOrigine !== undefined) {
      const ao = data.affaireOrigine ?? current.affaireOrigine ?? '';
      const lo = data.ligneOrigine ?? current.ligneOrigine ?? '';
      if (ao && lo) {
        newId = `${ao.trim()}-${lo.trim()}`;
      }
    }
    
    if (data.isUF) {
      const existingSublists = get().sublists;
      const hasUfList = existingSublists.some(s => s.name === 'APPRO ANTICIPE UF' && s.type === 'appro_anticipe');
      if (!hasUfList) {
        const newSublist = { 
          id: Math.random().toString(36).substr(2,9), 
          projectId: newId, 
          name: 'APPRO ANTICIPE UF', 
          type: 'appro_anticipe' as const 
        };
        set({ sublists: [...existingSublists, newSublist] });
      }
    }
    
    const updated = { ...current, ...data, id: newId };
    set({ currentProject: updated, currentProjectId: newId });
    await get().saveState();
  },

  closeProject: () => {
    void window.electronAPI?.closePlanWindow();
    set({
      currentProjectId: null,
      currentProject: null,
      currentProjectPath: null,
      sublists: [],
      bomLines: [],
      ...emptyPlanCollections(),
      planUndo: [],
      planRedo: [],
    });
  },

  openProjectFromFile: async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.openProjectFile();
    if (!result) return; // Canceled
    if ('error' in result) {
      alert("Erreur: " + result.error);
      return;
    }
    
    const { filePath, data } = result;
    if (data && data.project) {
      const recent: RecentFile = { id: data.project.id, tech: data.project.techName, nomAffaire: data.project.nomAffaire, nomTableau: data.project.nomTableau, path: filePath, lastOpened: Date.now() };
      const currentRecents = get().recentFiles.filter(r => r.path !== filePath);
      const newRecents = [recent, ...currentRecents].slice(0, 5);
      
      void window.electronAPI.closePlanWindow();
      set({
        currentProjectId: data.project.id,
        currentProject: data.project,
        currentProjectPath: filePath,
        sublists: data.sublists || [],
        bomLines: data.bomLines || [],
        ...normalizePlanCollections(data),
        planUndo: [],
        planRedo: [],
        recentFiles: newRecents
      });
      await window.electronAPI.saveConfig({ recentFiles: newRecents });
    } else {
      alert("Fichier non valide.");
    }
  },

  openProjectByPath: async (filePath: string) => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.openProjectByPath(filePath);
    if ('error' in result) {
      alert("Erreur: " + result.error);
      // Remove from recent if it fails
      const newRecents = get().recentFiles.filter(r => r.path !== filePath);
      set({ recentFiles: newRecents });
      await window.electronAPI.saveConfig({ recentFiles: newRecents });
      return;
    }
    
    const { data } = result;
    if (data && data.project) {
      const recent: RecentFile = { id: data.project.id, tech: data.project.techName, nomAffaire: data.project.nomAffaire, nomTableau: data.project.nomTableau, path: filePath, lastOpened: Date.now() };
      const currentRecents = get().recentFiles.filter(r => r.path !== filePath);
      const newRecents = [recent, ...currentRecents].slice(0, 5);
      
      void window.electronAPI.closePlanWindow();
      set({
        currentProjectId: data.project.id,
        currentProject: data.project,
        currentProjectPath: filePath,
        sublists: data.sublists || [],
        bomLines: data.bomLines || [],
        ...normalizePlanCollections(data),
        planUndo: [],
        planRedo: [],
        recentFiles: newRecents
      });
      await window.electronAPI.saveConfig({ recentFiles: newRecents });
    } else {
      alert("Fichier non valide.");
    }
  },

  createProjectInteractive: async (data) => {
    const newProject = { ...data, createdAt: new Date().toISOString() };
    const initialSublists: Sublist[] = [];
    if (data.isUF) {
      initialSublists.push({ id: Math.random().toString(36).substr(2,9), projectId: data.id, name: 'APPRO ANTICIPE UF', type: 'appro_anticipe' });
    }
    const projectData: ProjectFileData = {
      project: newProject,
      sublists: initialSublists,
      bomLines: [],
      ...emptyPlanCollections(),
    };
    
    if (window.electronAPI) {
      const parts = [
        data.affaireOrigine,
        data.ligneOrigine,
        data.nomTableau,
        data.nomAffaire,
        data.client ? `(${data.client})` : ''
      ].filter(Boolean).map(s => String(s).trim().toUpperCase());
      const defaultFilename = parts.join(' ') + '.list';

      const result = await window.electronAPI.saveNewProjectFile(projectData, defaultFilename);
      if (!result) return false; // Canceled
      if (typeof result === 'object' && 'error' in result) {
        alert("Erreur: " + result.error);
        return false;
      }
      
      const filePath = result as string;
      const recent: RecentFile = { id: data.id, tech: data.techName, nomAffaire: data.nomAffaire, nomTableau: data.nomTableau, path: filePath, lastOpened: Date.now() };
      const currentRecents = get().recentFiles.filter(r => r.path !== filePath);
      const newRecents = [recent, ...currentRecents].slice(0, 5);
      
      set({
        currentProjectId: data.id,
        currentProject: newProject,
        currentProjectPath: filePath,
        sublists: initialSublists,
        bomLines: [],
        ...emptyPlanCollections(),
        planUndo: [],
        planRedo: [],
        recentFiles: newRecents
      });
      await window.electronAPI.saveConfig({ recentFiles: newRecents });
      return true;
    } else {
      set({
        currentProjectId: data.id,
        currentProject: newProject,
        currentProjectPath: null,
        sublists: initialSublists,
        bomLines: [],
        ...emptyPlanCollections(),
        planUndo: [],
        planRedo: [],
      });
      get().saveState();
      return true;
    }
  },

  addSublist: async (sublist) => {
    const id = Math.random().toString(36).substr(2,9);
    set(state => ({ sublists: [...state.sublists, { ...sublist, id }] }));
    await get().saveState();
  },

  removeSublist: async (id) => {
    set(state => {
      const removedIds = new Set(state.bomLines.filter(l => l.sublistId === id).map(l => l.id));
      return {
        sublists: state.sublists.filter(s => s.id !== id),
        bomLines: state.bomLines.filter(l => l.sublistId !== id),
        sublistPlans: state.sublistPlans.filter(sp => sp.sublistId !== id),
        markers: state.markers.filter(m => !removedIds.has(m.bomLineId)),
      };
    });
    await get().saveState();
  },

  addOrUpdateBOMLine: async (newLine) => {
    const state = get();
    const existingLineIndex = state.bomLines.findIndex(
      (l) => l.projectId === newLine.projectId && 
             l.ref === newLine.ref && 
             l.sublistId === newLine.sublistId && 
             l.location === newLine.location
    );

    if (existingLineIndex >= 0) {
      const line = state.bomLines[existingLineIndex];
      const newQty = line.quantity + newLine.quantity;
      const updatedLines = [...state.bomLines];
      updatedLines[existingLineIndex].quantity = newQty;
      set({ bomLines: updatedLines });
      await get().saveState();
      return line.id;
    }
    const id = Math.random().toString(36).substr(2, 9);
    set({ bomLines: [...state.bomLines, { ...newLine, id }] });
    await get().saveState();
    return id;
  },

  removeBOMLine: async (id) => {
    set((state) => ({
      bomLines: state.bomLines.filter(l => l.id !== id),
      markers: state.markers.filter(m => m.bomLineId !== id),
    }));
    await get().saveState();
  },

  removeZeroQuantityLines: async (projectId: string, sublistId: string) => {
    let count = 0;
    set((state) => {
      const remaining: BOMLine[] = [];
      for (const line of state.bomLines) {
        if (line.projectId === projectId && line.sublistId === sublistId && line.quantity <= 0) {
          count++;
        } else {
          remaining.push(line);
        }
      }
      return { bomLines: remaining, markers: state.markers.filter((marker) => remaining.some((line) => line.id === marker.bomLineId)) };
    });
    if (count > 0) {
      await get().saveState();
    }
    return count;
  },

  updateBOMLineQte: async (id, quantity) => {
    const locked = get().markers.some((marker) => marker.bomLineId === id);
    if (locked) return;
    set((state) => ({
      bomLines: state.bomLines.map(l => l.id === id ? { ...l, quantity } : l)
    }));
    await get().saveState();
  },

  updateBOMLineRef: async (id, ref) => {
    const trimmedRef = ref.trim();
    if (!trimmedRef) return;

    const state = get();
    const lineToEdit = state.bomLines.find(l => l.id === id);
    if (!lineToEdit) return;

    const existing = state.bomLines.find(
      (l) => l.id !== id &&
             l.projectId === lineToEdit.projectId &&
             l.sublistId === lineToEdit.sublistId &&
             l.ref === trimmedRef
    );

    if (!existing) {
      set({
        bomLines: state.bomLines.map(l => l.id === id ? { ...l, ref: trimmedRef } : l),
      });
      await get().saveState();
      return;
    }

    const movingCount = state.markers.filter((marker) => marker.bomLineId === id).length;
    const survivorMarked = state.markers.some((marker) => marker.bomLineId === existing.id);
    if (movingCount > 0 && !survivorMarked && existing.quantity > 0) {
      return { needsConfirm: { fromId: id, toId: existing.id, movingCount, survivorQty: existing.quantity } };
    }

    await get().confirmMergeBOMLine(id, existing.id);
  },

  confirmMergeBOMLine: async (fromId, toId) => {
    const state = get();
    const from = state.bomLines.find((line) => line.id === fromId);
    const to = state.bomLines.find((line) => line.id === toId);
    if (!from || !to) return;

    const movedMarkers = state.markers.map((marker) => marker.bomLineId === fromId ? { ...marker, bomLineId: toId } : marker);
    const markerCount = movedMarkers.filter((marker) => marker.bomLineId === toId).length;
    const nextQty = markerCount > 0 ? markerCount : to.quantity + from.quantity;
    set({
      bomLines: state.bomLines
        .filter((line) => line.id !== fromId)
        .map((line) => line.id === toId ? { ...line, quantity: nextQty } : line),
      markers: movedMarkers,
    });
    await get().saveState();
  },

  importBOMData: async (projectId, data) => {
      const state = get();
      const updatedLines = [...state.bomLines];
      const lockedIds = new Set(
        state.markers.map((marker) => marker.bomLineId)
      );
      let ignored = 0;

      data.forEach(item => {
          const ref = String(item['Référence'] ?? item['Reference'] ?? item['Ref'] ?? '').trim();
          if(!ref || ref === '-') return;
          
          const rawQty = item['Quantité'] !== undefined ? item['Quantité'] : (item['Qte'] !== undefined ? item['Qte'] : (item['Qty'] !== undefined ? item['Qty'] : 1));
          let qty = parseFloat(String(rawQty).replace(',', '.'));
          if (isNaN(qty)) qty = 1;

          const category = item['Catégorie'] || item['Phase'] || 'Autre';
          const sublistId = String(item['_sublistId'] ?? '');
          const location = String(item['Localisation'] ?? item['Tableau'] ?? '');

          const existingLineIndex = updatedLines.findIndex(
            (l) => l.projectId === projectId && 
                   l.ref === ref && 
                   l.sublistId === sublistId && 
                   l.location === location
          );

          if (existingLineIndex >= 0) {
              if (lockedIds.has(updatedLines[existingLineIndex].id)) {
                ignored++;
                return;
              }
              updatedLines[existingLineIndex] = {
                  ...updatedLines[existingLineIndex],
                  quantity: updatedLines[existingLineIndex].quantity + qty
              };
          } else {
              const id = Math.random().toString(36).substr(2, 9);
              updatedLines.push({ id, projectId, ref, quantity: qty, category: category as Category, sublistId, location });
          }
      });

      set({ bomLines: updatedLines });
      await get().saveState();
      return { ignored };
  },

  attachPlanFromFile: async (sublistId, sourcePath) => {
    const { currentProjectPath } = get();
    if (!window.electronAPI) return { success: false, error: 'Disponible uniquement dans l\'application desktop.' };
    if (!currentProjectPath) return { success: false, error: 'Enregistrez l\'affaire avant d\'attacher un plan.' };
    if (!sublistId) return { success: false, error: 'Ouvrez une liste éditable pour attacher un plan.' };

    const id = crypto.randomUUID();
    const storedName = `${id}.pdf`;
    const result = await window.electronAPI.copyPlanPdf(currentProjectPath, sourcePath, storedName);
    if (!result.success) return { success: false, error: result.error || 'Impossible de copier le PDF.' };

    const originalName = sourcePath.split(/[/\\]/).pop() || 'plan.pdf';
    const plan: Plan = {
      id,
      storedName,
      originalName,
      pageCount: result.pageCount || 1,
    };

    set((state) => ({
      plans: [...state.plans, plan],
      sublistPlans: [
        ...state.sublistPlans.filter((link) => link.sublistId !== sublistId),
        { sublistId, planId: id },
      ],
    }));
    await get().saveState();
    return { success: true };
  },

  reuseExistingPlan: async (sublistId, planId) => {
    const plan = get().plans.find((item) => item.id === planId);
    if (!plan) return { success: false, error: 'Ce plan n\'est plus dans l\'affaire.' };
    if (!sublistId) return { success: false, error: 'Ouvrez une liste éditable pour réutiliser un plan.' };

    set((state) => ({
      sublistPlans: [
        ...state.sublistPlans.filter((link) => link.sublistId !== sublistId),
        { sublistId, planId },
      ],
    }));
    await get().saveState();
    return { success: true };
  },

  detachPlanFromList: async (sublistId) => {
    const state = get();
    const link = state.sublistPlans.find((item) => item.sublistId === sublistId);
    if (!link) return { success: false, error: 'Cette liste n\'a pas de plan.' };
    const lineIds = new Set(state.bomLines.filter((line) => line.sublistId === sublistId).map((line) => line.id));
    const nextLinks = state.sublistPlans.filter((item) => item.sublistId !== sublistId);
    let nextPlans = state.plans;
    let nextMarkers = state.markers.filter((marker) => !lineIds.has(marker.bomLineId));
    if (!nextLinks.some((item) => item.planId === link.planId)) {
      const plan = state.plans.find((item) => item.id === link.planId);
      if (plan && state.currentProjectPath && window.electronAPI) {
        await window.electronAPI.deletePlanPdf(state.currentProjectPath, plan.storedName);
      }
      nextPlans = state.plans.filter((item) => item.id !== link.planId);
      nextMarkers = nextMarkers.filter((marker) => marker.planId !== link.planId);
    }
    set({ plans: nextPlans, sublistPlans: nextLinks, markers: nextMarkers, planUndo: [], planRedo: [] });
    await get().saveState();
    return { success: true };
  },

  replacePlanForList: async (sublistId, sourcePath) => {
    const detached = await get().detachPlanFromList(sublistId);
    if (!detached.success) return detached;
    return get().attachPlanFromFile(sublistId, sourcePath);
  },

  deletePlanFromProject: async (planId) => {
    const state = get();
    const plan = state.plans.find((item) => item.id === planId);
    if (!plan) return { success: false, error: 'Plan introuvable.' };
    if (state.currentProjectPath && window.electronAPI) {
      await window.electronAPI.deletePlanPdf(state.currentProjectPath, plan.storedName);
    }
    set({
      plans: state.plans.filter((item) => item.id !== planId),
      sublistPlans: state.sublistPlans.filter((item) => item.planId !== planId),
      markers: state.markers.filter((marker) => marker.planId !== planId),
      planUndo: [],
      planRedo: [],
    });
    await get().saveState();
    return { success: true };
  },

  recollerPlan: async (planId, sourcePath) => {
    const state = get();
    const plan = state.plans.find((item) => item.id === planId);
    if (!plan) return { success: false, error: 'Plan introuvable.' };
    if (!state.currentProjectPath || !window.electronAPI) {
      return { success: false, error: 'Enregistrez l\'affaire avant de recoller un plan.' };
    }
    const result = await window.electronAPI.copyPlanPdf(state.currentProjectPath, sourcePath, plan.storedName);
    if (!result.success) return { success: false, error: result.error || 'Impossible de recoller le PDF.' };
    const pageCount = result.pageCount || 1;
    const originalName = sourcePath.split(/[/\\]/).pop() || plan.originalName;
    const samePages = pageCount === plan.pageCount;
    set({
      plans: state.plans.map((item) => item.id === planId ? { ...item, pageCount, originalName, fileStamp: Date.now() } : item),
      markers: samePages ? state.markers : state.markers.filter((marker) => marker.planId !== planId),
      planUndo: samePages ? state.planUndo : [],
      planRedo: samePages ? state.planRedo : [],
    });
    await get().saveState();
    return { success: true };
  },

  placePlanMarker: async ({ planId, bomLineId, page, x, y, confirmReplace }) => {
    const state = get();
    const line = state.bomLines.find((item) => item.id === bomLineId);
    if (!line) return { success: false, error: 'Aucune référence sélectionnée.' };
    const existingCount = state.markers.filter((marker) => marker.bomLineId === bomLineId).length;
    if (existingCount === 0 && line.quantity > 0 && !confirmReplace) {
      return { success: false, needsConfirm: true };
    }

    const marker: Marker = {
      id: crypto.randomUUID(),
      planId,
      page,
      x,
      y,
      bomLineId,
    };
    const previousQuantity = line.quantity;
    const nextQuantity = existingCount + 1;
    set({
      markers: [...state.markers, marker],
      bomLines: state.bomLines.map((item) => item.id === bomLineId ? { ...item, quantity: nextQuantity } : item),
      planUndo: [...state.planUndo, { type: 'place' as const, marker, previousQuantity }].slice(-100),
      planRedo: [],
    });
    await get().saveState();
    return { success: true };
  },

  removePlanMarker: async (markerId, allowedSublistId) => {
    const state = get();
    const marker = state.markers.find((item) => item.id === markerId);
    if (!marker) return { success: false, error: 'Pastille introuvable.' };
    const line = state.bomLines.find((item) => item.id === marker.bomLineId);
    if (!line || line.sublistId !== allowedSublistId) {
      return { success: false };
    }
    const remaining = state.markers.filter((item) => item.id !== markerId);
    const remainingCount = remaining.filter((item) => item.bomLineId === marker.bomLineId).length;
    const previousQuantity = line.quantity;
    set({
      markers: remaining,
      bomLines: remainingCount > 0
        ? state.bomLines.map((item) => item.id === marker.bomLineId ? { ...item, quantity: remainingCount } : item)
        : state.bomLines,
      planUndo: [...state.planUndo, { type: 'remove' as const, marker, previousQuantity }].slice(-100),
      planRedo: [],
    });
    await get().saveState();
    return { success: true };
  },

  undoPlanAction: async () => {
    const state = get();
    const entry = state.planUndo[state.planUndo.length - 1];
    if (!entry) return;
    if (entry.type === 'place') {
      set({
        markers: state.markers.filter((item) => item.id !== entry.marker.id),
        bomLines: state.bomLines.map((item) => item.id === entry.marker.bomLineId ? { ...item, quantity: entry.previousQuantity } : item),
        planUndo: state.planUndo.slice(0, -1),
        planRedo: [...state.planRedo, entry],
      });
    } else {
      set({
        markers: [...state.markers, entry.marker],
        bomLines: state.bomLines.map((item) => item.id === entry.marker.bomLineId ? { ...item, quantity: entry.previousQuantity } : item),
        planUndo: state.planUndo.slice(0, -1),
        planRedo: [...state.planRedo, entry],
      });
    }
    await get().saveState();
  },

  redoPlanAction: async () => {
    const state = get();
    const entry = state.planRedo[state.planRedo.length - 1];
    if (!entry) return;
    if (entry.type === 'place') {
      const nextQuantity = state.markers.filter((item) => item.bomLineId === entry.marker.bomLineId).length + 1;
      set({
        markers: [...state.markers, entry.marker],
        bomLines: state.bomLines.map((item) => item.id === entry.marker.bomLineId ? { ...item, quantity: nextQuantity } : item),
        planUndo: [...state.planUndo, entry],
        planRedo: state.planRedo.slice(0, -1),
      });
    } else {
      const remaining = state.markers.filter((item) => item.id !== entry.marker.id);
      const remainingCount = remaining.filter((item) => item.bomLineId === entry.marker.bomLineId).length;
      set({
        markers: remaining,
        bomLines: remainingCount > 0
          ? state.bomLines.map((item) => item.id === entry.marker.bomLineId ? { ...item, quantity: remainingCount } : item)
          : state.bomLines.map((item) => item.id === entry.marker.bomLineId ? { ...item, quantity: entry.previousQuantity } : item),
        planUndo: [...state.planUndo, entry],
        planRedo: state.planRedo.slice(0, -1),
      });
    }
    await get().saveState();
  },

  canUndoPlan: () => get().planUndo.length > 0,
  canRedoPlan: () => get().planRedo.length > 0,
}));
