import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FilePlus, FolderOpen, MapPinned, RefreshCw, Unplug, Replace, Trash2 } from 'lucide-react';
import type { Plan, PlanWindowState } from '../types';
import { emptyPlanWindowState } from '../planModel';
import { PlanPdfViewer } from './PlanPdfViewer';
import { isShortcut } from '../shortcuts';

export function PlanWindow() {
  const [state, setState] = useState<PlanWindowState>(emptyPlanWindowState);
  const [loadedPdf, setLoadedPdf] = useState<{ key: string; data?: ArrayBuffer; error?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [showReuse, setShowReuse] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'detach' | 'replace' | 'delete' | null>(null);
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null);
  const [toastOpen, setToastOpen] = useState(false);

  useEffect(() => {
    if (!window.electronAPI) return undefined;
    const off = window.electronAPI.onPlanState((next) => {
      setState(next);
      if (next.currentPlan) setShowReuse(false);
      if (next.error) {
        setToast({ text: next.error, id: Date.now() });
      } else if (next.brush) {
        setToastOpen(false);
      }
    });
    window.electronAPI.notifyPlanWindowReady();
    return off;
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const frame = window.requestAnimationFrame(() => setToastOpen(true));
    const hide = window.setTimeout(() => setToastOpen(false), 10000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(hide);
    };
  }, [toast]);

  const toastWasOpen = useRef(false);
  useEffect(() => {
    if (toastWasOpen.current && !toastOpen) {
      const token = toast?.id;
      const clear = window.setTimeout(() => {
        setToast((item) => (item?.id === token ? null : item));
      }, 350);
      toastWasOpen.current = false;
      return () => window.clearTimeout(clear);
    }
    if (toastOpen) toastWasOpen.current = true;
    return undefined;
  }, [toast, toastOpen]);

  const currentPlan = state.currentPlan;
  const projectPath = state.projectPath;
  const storedName = currentPlan?.storedName ?? null;
  const pdfKey = projectPath && storedName
    ? `${projectPath}::${storedName}::${currentPlan?.fileStamp ?? 0}::${currentPlan?.pageCount ?? 0}`
    : null;

  useEffect(() => {
    if (!pdfKey || !projectPath || !storedName || !window.electronAPI) return undefined;

    let cancelled = false;

    void window.electronAPI.readPlanPdf(projectPath, storedName).then((result) => {
      if (cancelled) return;
      if ('error' in result) {
        setLoadedPdf({ key: pdfKey, error: result.error });
        return;
      }
      setLoadedPdf({ key: pdfKey, data: result.data.slice(0) });
    });

    return () => {
      cancelled = true;
    };
  }, [pdfKey, projectPath, storedName]);

  const pdfMatch = loadedPdf?.key === pdfKey ? loadedPdf : null;
  const pdfData = pdfMatch?.data ?? null;
  const pdfError = pdfMatch?.error ?? null;
  const pdfLoading = !!pdfKey && !pdfMatch;

  const title = useMemo(() => {
    if (state.currentSublistName && state.currentPlan) {
      return `${state.currentSublistName} · ${state.currentPlan.originalName}`;
    }
    if (state.currentSublistName) return state.currentSublistName;
    return 'Plan';
  }, [state.currentPlan, state.currentSublistName]);

  const handleAdd = async () => {
    if (!window.electronAPI || !state.canAttach || !state.currentSublistId || busy) return;
    setBusy(true);
    try {
      const sourcePath = await window.electronAPI.selectPlanPdf();
      if (!sourcePath) return;
      window.electronAPI.sendPlanAction({
        type: 'add',
        sublistId: state.currentSublistId,
        sourcePath,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleReuse = (plan: Plan) => {
    if (!window.electronAPI || !state.canAttach || !state.currentSublistId || busy) return;
    window.electronAPI.sendPlanAction({
      type: 'reuse',
      sublistId: state.currentSublistId,
      planId: plan.id,
    });
    setShowReuse(false);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditing = !!target && (
        target.tagName === 'INPUT'
        || target.tagName === 'TEXTAREA'
        || target.tagName === 'SELECT'
        || target.isContentEditable
      );

      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey) {
        if (event.key.toLowerCase() === 'z') {
          event.preventDefault();
          window.electronAPI?.sendPlanAction({ type: 'undo' });
          return;
        }
        if (event.key.toLowerCase() === 'y') {
          event.preventDefault();
          window.electronAPI?.sendPlanAction({ type: 'redo' });
          return;
        }
      }

      if (isEditing) return;

      if (state.addReferenceShortcut && isShortcut(event, state.addReferenceShortcut)) {
        if (!state.canAttach) return;
        event.preventDefault();
        window.electronAPI?.sendPlanAction({ type: 'focusAddReference' });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.addReferenceShortcut, state.canAttach]);

  return (
    <div className="h-screen w-full bg-slate-100 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <MapPinned className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-800 truncate">{title}</h1>
            <p className="text-xs text-slate-500 truncate">
              {state.currentPlan
                ? `${state.currentPlan.pageCount} page${state.currentPlan.pageCount > 1 ? 's' : ''}`
                : 'Aucun plan attaché à cette liste'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {pdfError && state.currentPlan && (
            <button
              type="button"
              onClick={() => void (async () => {
                const sourcePath = await window.electronAPI?.selectPlanPdf();
                if (sourcePath) window.electronAPI?.sendPlanAction({ type: 'recoller', sourcePath });
              })()}
              className="px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100"
            >
              Recoller
            </button>
          )}
          {state.currentPlan && state.canAttach && (
            <>
              <button
                type="button"
                onClick={() => setConfirmAction('detach')}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 flex items-center gap-1.5"
              >
                <Unplug className="w-3.5 h-3.5" />
                Détacher
              </button>
              <button
                type="button"
                onClick={() => setConfirmAction('replace')}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 flex items-center gap-1.5"
              >
                <Replace className="w-3.5 h-3.5" />
                Remplacer
              </button>
              <button
                type="button"
                onClick={() => setConfirmAction('delete')}
                className="px-3 py-1.5 text-xs font-semibold text-red-700 border border-red-200 rounded-md hover:bg-red-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Supprimer
              </button>
            </>
          )}
        </div>
      </header>

      <div className="shrink-0 bg-white border-b border-slate-200 px-5 py-2 flex items-center gap-3 min-h-[52px]">
        {!state.canAttach && state.currentPlan ? (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-3 py-1.5">
            Lecture seule — ouvrez une liste éditable pour poser ou retirer des pastilles.
          </div>
        ) : state.brush ? (
          <>
            <span className="w-4 h-4 rounded-full border border-white shadow shrink-0" style={{ backgroundColor: state.brush.color }} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-800 truncate">
                {state.brush.sublistName} · {state.brush.ref}
              </div>
              <div className="text-xs text-slate-500 truncate">
                {state.brush.designation || 'Sans désignation'} · {state.brush.typeName || 'Sans type'} · qté {state.brush.quantity}
              </div>
            </div>
          </>
        ) : (
          <div className="text-sm text-slate-500">Aucune référence sélectionnée — un clic ne pose rien.</div>
        )}
      </div>

      <main className="flex-1 min-h-0 min-w-0 bg-white flex flex-col overflow-hidden">
        {state.currentPlan ? (
          pdfLoading ? (
            <EmptyPanel message="Chargement du plan…" />
          ) : pdfData ? (
            <div className="flex-1 min-h-0 min-w-0">
              <PlanPdfViewer
                data={pdfData}
                markers={state.markers}
                currentBomLineId={state.brush?.bomLineId}
                notice={toast?.text ?? null}
                noticeOpen={toastOpen}
                onPlace={state.canAttach ? (page, x, y) => window.electronAPI?.sendPlanAction({ type: 'place', page, x, y }) : undefined}
                onRemove={state.canAttach ? (markerId) => window.electronAPI?.sendPlanAction({ type: 'remove', markerId }) : undefined}
                onSelect={(markerId) => window.electronAPI?.sendPlanAction({ type: 'selectMarker', markerId })}
              />
            </div>
          ) : (
            <EmptyPanel message={pdfError || 'Impossible d’afficher ce PDF. Recollez un fichier ou détachez le plan.'} />
          )
        ) : (
          <div className="h-full flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 w-full max-w-lg p-8">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mb-4">
                <MapPinned className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 mb-1">Aucun plan sur cette liste</h2>
              <p className="text-sm text-slate-500 mb-6">
                {state.canAttach
                  ? 'Ajoutez un PDF ou réutilisez un plan déjà présent dans l’affaire.'
                  : 'Ouvrez une liste éditable (achat, fiche ou appro) pour attacher un plan.'}
              </p>

              {state.canAttach ? (
                showReuse ? (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Plans de l’affaire</div>
                    <div className="max-h-64 overflow-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
                      {state.reusablePlans.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-slate-500">Aucun plan à réutiliser.</div>
                      ) : (
                        state.reusablePlans.map((plan) => (
                          <button
                            key={plan.id}
                            type="button"
                            onClick={() => handleReuse(plan)}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                          >
                            <div className="text-sm font-medium text-slate-800 truncate">{plan.originalName}</div>
                            <div className="text-xs text-slate-500">{plan.pageCount} page{plan.pageCount > 1 ? 's' : ''}</div>
                          </button>
                        ))
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowReuse(false)}
                      className="text-sm text-slate-500 hover:text-slate-700"
                    >
                      Retour
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => void handleAdd()}
                      disabled={busy || !state.projectPath}
                      className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <FilePlus className="w-4 h-4" />
                      Ajouter
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowReuse(true)}
                      disabled={busy || state.reusablePlans.length === 0}
                      className="flex-1 px-4 py-2.5 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                      title={state.reusablePlans.length === 0 ? 'Aucun plan déjà présent dans l’affaire' : 'Réutiliser un plan déjà copié'}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Réutiliser
                    </button>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <FolderOpen className="w-4 h-4" />
                  Passez sur une liste éditable dans l’affaire.
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {state.pendingConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Remplacer la quantité ?</h3>
            <p className="text-sm text-slate-600 mb-6">
              Cette référence a déjà une quantité de {state.pendingConfirm.quantity}. Le premier marqueur la passera à 1.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => window.electronAPI?.sendPlanAction({ type: 'cancelPlace' })}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => window.electronAPI?.sendPlanAction({
                  type: 'confirmPlace',
                  page: state.pendingConfirm!.page,
                  x: state.pendingConfirm!.x,
                  y: state.pendingConfirm!.y,
                })}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmAction && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              {confirmAction === 'detach' && 'Détacher ce plan ?'}
              {confirmAction === 'replace' && 'Remplacer ce plan ?'}
              {confirmAction === 'delete' && 'Supprimer ce plan de l’affaire ?'}
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              {confirmAction === 'detach' && 'Les pastilles de cette liste disparaîtront. Les quantités sont conservées et redeviennent saisissables. Les autres listes qui partagent le PDF ne bougent pas.'}
              {confirmAction === 'replace' && 'Cette liste seulement sera détachée puis attachée au nouveau PDF. Les autres listes gardent l’ancien.'}
              {confirmAction === 'delete' && 'Toutes les listes liées seront libérées. Les pastilles de ce plan disparaîtront, les quantités seront conservées, et le fichier copié sera retiré.'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void (async () => {
                  const action = confirmAction;
                  setConfirmAction(null);
                  if (action === 'detach') {
                    window.electronAPI?.sendPlanAction({ type: 'detach' });
                    return;
                  }
                  if (action === 'delete') {
                    window.electronAPI?.sendPlanAction({ type: 'deletePlan' });
                    return;
                  }
                  const sourcePath = await window.electronAPI?.selectPlanPdf();
                  if (sourcePath) window.electronAPI?.sendPlanAction({ type: 'replace', sourcePath });
                })()}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${confirmAction === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="h-full flex items-center justify-center text-sm text-slate-500">
      {message}
    </div>
  );
}
