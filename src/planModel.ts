import type { Marker, Plan, PlanWindowState, ProjectFileData, SublistPlan } from './types';
import { DEFAULT_SHORTCUT_BINDINGS } from './shortcuts';

export const READONLY_PLAN_VIEWS = ['Globale', 'EtatPrepa', 'Chiffrage'] as const;

export function isEditablePlanList(viewId: string | null | undefined): boolean {
  return !!viewId && !(READONLY_PLAN_VIEWS as readonly string[]).includes(viewId);
}

export function emptyPlanCollections(): Pick<ProjectFileData, 'plans' | 'sublistPlans' | 'markers'> {
  return { plans: [], sublistPlans: [], markers: [] };
}

export function normalizePlanCollections(data: Partial<ProjectFileData> | null | undefined): Pick<ProjectFileData, 'plans' | 'sublistPlans' | 'markers'> {
  return {
    plans: Array.isArray(data?.plans) ? data.plans.filter(isPlan) : [],
    sublistPlans: Array.isArray(data?.sublistPlans) ? data.sublistPlans.filter(isSublistPlan) : [],
    markers: Array.isArray(data?.markers) ? data.markers.filter(isMarker) : [],
  };
}

export function planForSublist(plans: Plan[], links: SublistPlan[], sublistId: string | null): Plan | null {
  if (!sublistId) return null;
  const link = links.find((item) => item.sublistId === sublistId);
  if (!link) return null;
  return plans.find((plan) => plan.id === link.planId) ?? null;
}

export function emptyPlanWindowState(): PlanWindowState {
  return {
    projectPath: null,
    currentSublistId: null,
    currentSublistName: null,
    canAttach: false,
    currentPlan: null,
    reusablePlans: [],
    error: null,
    brush: null,
    markers: [],
    pendingConfirm: null,
    canUndo: false,
    canRedo: false,
    addReferenceShortcut: { ...DEFAULT_SHORTCUT_BINDINGS.addReference },
  };
}

function isPlan(value: unknown): value is Plan {
  if (!value || typeof value !== 'object') return false;
  const plan = value as Plan;
  return typeof plan.id === 'string'
    && typeof plan.storedName === 'string'
    && typeof plan.originalName === 'string'
    && typeof plan.pageCount === 'number';
}

function isSublistPlan(value: unknown): value is SublistPlan {
  if (!value || typeof value !== 'object') return false;
  const link = value as SublistPlan;
  return typeof link.sublistId === 'string' && typeof link.planId === 'string';
}

function isMarker(value: unknown): value is Marker {
  if (!value || typeof value !== 'object') return false;
  const marker = value as Marker;
  return typeof marker.id === 'string'
    && typeof marker.planId === 'string'
    && typeof marker.page === 'number'
    && typeof marker.x === 'number'
    && typeof marker.y === 'number'
    && typeof marker.bomLineId === 'string';
}
