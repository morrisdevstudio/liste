import { useCallback, useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { emptyPlanWindowState, isEditablePlanList, planForSublist } from './planModel';
import { NEUTRAL_TYPE_COLOR } from './componentTypes';
import type { ComponentRef, ComponentType, PlanMarkerView, PlanPendingConfirm, PlanWindowAction, PlanWindowState, Sublist } from './types';

type PlanBridgeOptions = {
  activeView: string;
  lastEditableListId: string | null;
  projectSublists: Sublist[];
  selectedLineId: string | null;
  onSelectLine: (id: string) => void;
  onSelectView: (view: string) => void;
  onFocusAddReference: () => void;
  refDetails: Record<string, ComponentRef>;
};

function typeMetaOf(componentTypes: ComponentType[], typeId?: number | null) {
  if (!typeId) return { typeName: null as string | null, color: NEUTRAL_TYPE_COLOR };
  const type = componentTypes.find((item) => item.id === typeId);
  return {
    typeName: type?.name ?? null,
    color: type?.color ?? NEUTRAL_TYPE_COLOR,
  };
}

function snapshotPlanWindowState(input: {
  activeView: string;
  lastEditableListId: string | null;
  projectSublists: Sublist[];
  selectedLineId: string | null;
  refDetails: Record<string, ComponentRef>;
  componentTypes: ComponentType[];
  error: string | null;
  pendingConfirm: PlanPendingConfirm | null;
}): PlanWindowState {
  const store = useStore.getState();
  const canAttach = isEditablePlanList(input.activeView);
  const currentSublistId = canAttach ? input.activeView : input.lastEditableListId;
  const currentSublistName = currentSublistId
    ? (input.projectSublists.find((list) => list.id === currentSublistId)?.name || currentSublistId)
    : null;
  const currentPlan = planForSublist(store.plans, store.sublistPlans, currentSublistId);
  const selectedLine = store.bomLines.find((line) => line.id === input.selectedLineId) ?? null;
  const brush = selectedLine && currentSublistId && selectedLine.sublistId === currentSublistId
    ? {
        bomLineId: selectedLine.id,
        sublistId: selectedLine.sublistId,
        sublistName: currentSublistName || selectedLine.sublistId,
        ref: selectedLine.ref,
        designation: input.refDetails[selectedLine.ref]?.designation || '',
        ...typeMetaOf(input.componentTypes, input.refDetails[selectedLine.ref]?.typeId),
        quantity: selectedLine.quantity,
      }
    : null;

  const markers: PlanMarkerView[] = currentPlan
    ? store.markers.filter((marker) => marker.planId === currentPlan.id).map((marker) => {
      const line = store.bomLines.find((item) => item.id === marker.bomLineId);
      const detail = line ? input.refDetails[line.ref] : undefined;
      const meta = typeMetaOf(input.componentTypes, detail?.typeId);
      const sublistId = line?.sublistId || '';
      return {
        ...marker,
        sublistId,
        sublistName: input.projectSublists.find((list) => list.id === sublistId)?.name || sublistId,
        ref: line?.ref || '?',
        designation: detail?.designation || '',
        typeName: meta.typeName,
        color: meta.color,
        quantity: line?.quantity ?? 0,
        isCurrentList: sublistId === currentSublistId,
        isCurrentRef: marker.bomLineId === input.selectedLineId,
      };
    })
    : [];

  return {
    projectPath: store.currentProjectPath,
    currentSublistId,
    currentSublistName,
    canAttach,
    currentPlan,
    reusablePlans: store.plans,
    error: input.error,
    brush,
    markers,
    pendingConfirm: input.pendingConfirm,
    canUndo: store.planUndo.length > 0,
    canRedo: store.planRedo.length > 0,
    addReferenceShortcut: store.shortcutBindings.addReference,
  };
}

export function usePlanBridge({
  activeView,
  lastEditableListId,
  projectSublists,
  selectedLineId,
  onSelectLine,
  onSelectView,
  onFocusAddReference,
  refDetails,
}: PlanBridgeOptions) {
  const plans = useStore((state) => state.plans);
  const sublistPlans = useStore((state) => state.sublistPlans);
  const markers = useStore((state) => state.markers);
  const bomLines = useStore((state) => state.bomLines);
  const currentProjectPath = useStore((state) => state.currentProjectPath);
  const planUndo = useStore((state) => state.planUndo);
  const planRedo = useStore((state) => state.planRedo);
  const shortcutBindings = useStore((state) => state.shortcutBindings);
  const attachPlanFromFile = useStore((state) => state.attachPlanFromFile);
  const reuseExistingPlan = useStore((state) => state.reuseExistingPlan);
  const detachPlanFromList = useStore((state) => state.detachPlanFromList);
  const replacePlanForList = useStore((state) => state.replacePlanForList);
  const deletePlanFromProject = useStore((state) => state.deletePlanFromProject);
  const recollerPlan = useStore((state) => state.recollerPlan);
  const placePlanMarker = useStore((state) => state.placePlanMarker);
  const removePlanMarker = useStore((state) => state.removePlanMarker);
  const undoPlanAction = useStore((state) => state.undoPlanAction);
  const redoPlanAction = useStore((state) => state.redoPlanAction);

  const [componentTypes, setComponentTypes] = useState<ComponentType[]>([]);
  const [pendingConfirm, setPendingConfirm] = useState<PlanPendingConfirm | null>(null);

  useEffect(() => {
    if (!window.electronAPI) return undefined;
    let cancelled = false;
    void window.electronAPI.getComponentTypes().then((types) => {
      if (!cancelled) setComponentTypes(types);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const pushState = useCallback((error: string | null = null, pending: PlanPendingConfirm | null = pendingConfirm) => {
    if (!window.electronAPI) return;
    window.electronAPI.pushPlanState(snapshotPlanWindowState({
      activeView,
      lastEditableListId,
      projectSublists,
      selectedLineId,
      refDetails,
      componentTypes,
      error,
      pendingConfirm: pending,
    }));
  }, [activeView, componentTypes, lastEditableListId, pendingConfirm, projectSublists, refDetails, selectedLineId]);

  useEffect(() => {
    pushState();
  }, [
    pushState,
    plans,
    sublistPlans,
    markers,
    bomLines,
    currentProjectPath,
    planUndo,
    planRedo,
    shortcutBindings,
  ]);

  useEffect(() => {
    if (!window.electronAPI) return undefined;

    const offReady = window.electronAPI.onPlanWindowReady(() => pushState());
    const offAction = window.electronAPI.onPlanAction((action: PlanWindowAction) => {
      void (async () => {
        const snap = snapshotPlanWindowState({
          activeView,
          lastEditableListId,
          projectSublists,
          selectedLineId,
          refDetails,
          componentTypes,
          error: null,
          pendingConfirm,
        });
        const currentPlan = snap.currentPlan;
        const currentSublistId = snap.currentSublistId;
        const brush = snap.brush;

        if (action.type === 'add') {
          const result = await attachPlanFromFile(action.sublistId, action.sourcePath);
          pushState(result.success ? null : (result.error || 'Impossible d\'ajouter le plan.'));
          return;
        }
        if (action.type === 'reuse') {
          const result = await reuseExistingPlan(action.sublistId, action.planId);
          pushState(result.success ? null : (result.error || 'Impossible de réutiliser ce plan.'));
          return;
        }
        if (action.type === 'detach') {
          if (!currentSublistId) return;
          const result = await detachPlanFromList(currentSublistId);
          pushState(result.success ? null : (result.error || 'Impossible de détacher le plan.'));
          return;
        }
        if (action.type === 'replace') {
          if (!currentSublistId) return;
          const result = await replacePlanForList(currentSublistId, action.sourcePath);
          pushState(result.success ? null : (result.error || 'Impossible de remplacer le plan.'));
          return;
        }
        if (action.type === 'deletePlan') {
          if (!currentPlan) return;
          const result = await deletePlanFromProject(currentPlan.id);
          pushState(result.success ? null : (result.error || 'Impossible de supprimer le plan.'));
          return;
        }
        if (action.type === 'recoller') {
          if (!currentPlan) return;
          const result = await recollerPlan(currentPlan.id, action.sourcePath);
          pushState(result.success ? null : (result.error || 'Impossible de recoller le plan.'));
          return;
        }
        if (action.type === 'place') {
          if (!snap.canAttach || !currentPlan || !brush) {
            pushState('Sélectionnez une référence dans la liste avant de poser une pastille.');
            return;
          }
          const result = await placePlanMarker({
            planId: currentPlan.id,
            bomLineId: brush.bomLineId,
            page: action.page,
            x: action.x,
            y: action.y,
          });
          if (result.needsConfirm) {
            const pending = { page: action.page, x: action.x, y: action.y, quantity: brush.quantity };
            setPendingConfirm(pending);
            pushState(null, pending);
            return;
          }
          setPendingConfirm(null);
          pushState(result.success ? null : (result.error || 'Impossible de poser la pastille.'), null);
          return;
        }
        if (action.type === 'confirmPlace') {
          if (!currentPlan || !brush) {
            setPendingConfirm(null);
            pushState(null, null);
            return;
          }
          const result = await placePlanMarker({
            planId: currentPlan.id,
            bomLineId: brush.bomLineId,
            page: action.page,
            x: action.x,
            y: action.y,
            confirmReplace: true,
          });
          setPendingConfirm(null);
          pushState(result.success ? null : (result.error || 'Impossible de poser la pastille.'), null);
          return;
        }
        if (action.type === 'cancelPlace') {
          setPendingConfirm(null);
          pushState(null, null);
          return;
        }
        if (action.type === 'remove') {
          if (!snap.canAttach || !currentSublistId) return;
          await removePlanMarker(action.markerId, currentSublistId);
          pushState();
          return;
        }
        if (action.type === 'selectMarker') {
          const store = useStore.getState();
          const marker = store.markers.find((item) => item.id === action.markerId);
          if (!marker) return;
          const line = store.bomLines.find((item) => item.id === marker.bomLineId);
          if (!line) return;
          if (line.sublistId !== currentSublistId) onSelectView(line.sublistId);
          onSelectLine(line.id);
          return;
        }
        if (action.type === 'focusAddReference') {
          onFocusAddReference();
          return;
        }
        if (action.type === 'undo') {
          await undoPlanAction();
          pushState();
          return;
        }
        if (action.type === 'redo') {
          await redoPlanAction();
          pushState();
        }
      })();
    });

    return () => {
      offReady();
      offAction();
    };
  }, [
    activeView,
    attachPlanFromFile,
    componentTypes,
    detachPlanFromList,
    deletePlanFromProject,
    lastEditableListId,
    onSelectLine,
    onSelectView,
    onFocusAddReference,
    pendingConfirm,
    placePlanMarker,
    projectSublists,
    pushState,
    recollerPlan,
    redoPlanAction,
    refDetails,
    removePlanMarker,
    replacePlanForList,
    reuseExistingPlan,
    selectedLineId,
    undoPlanAction,
  ]);

  useEffect(() => {
    return () => {
      window.electronAPI?.pushPlanState(emptyPlanWindowState());
    };
  }, []);
}
