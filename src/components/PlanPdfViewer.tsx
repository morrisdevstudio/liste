import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PlanMarkerView } from '../types';

GlobalWorkerOptions.workerSrc = workerSrc;

const MIN_SCALE = 0.08;
const MAX_SCALE = 8;
const FIT_PADDING = 16;
const ZOOM_FACTOR = 1.12;
const MARKER_SIZE = 10;
const MARKER_HIT_RADIUS = 8;

type Size = { width: number; height: number };
type Pan = { x: number; y: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function fitScale(container: Size, page: Size) {
  const availW = Math.max(1, container.width - FIT_PADDING * 2);
  const availH = Math.max(1, container.height - FIT_PADDING * 2);
  if (page.width < 1 || page.height < 1) return 1;
  return Math.min(availW / page.width, availH / page.height, MAX_SCALE);
}

function centerPan(container: Size, page: Size, scale: number): Pan {
  return {
    x: (container.width - page.width * scale) / 2,
    y: (container.height - page.height * scale) / 2,
  };
}

function measureBox(el: HTMLElement): Size | null {
  const rect = el.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return null;
  return { width: rect.width, height: rect.height };
}

function pickMarker(
  markers: PlanMarkerView[],
  mx: number,
  my: number,
  pan: Pan,
  cssW: number,
  cssH: number,
  currentBomLineId?: string | null,
) {
  const hits = markers.filter((marker) => {
    const dx = mx - (pan.x + marker.x * cssW);
    const dy = my - (pan.y + marker.y * cssH);
    return Math.hypot(dx, dy) <= MARKER_HIT_RADIUS;
  });
  if (hits.length === 0) return null;
  const current = currentBomLineId ? hits.find((marker) => marker.bomLineId === currentBomLineId) : undefined;
  return current ?? hits[hits.length - 1];
}

export function PlanPdfViewer({
  data,
  markers = [],
  currentBomLineId,
  notice,
  noticeOpen = false,
  onPlace,
  onRemove,
  onSelect,
}: {
  data: ArrayBuffer;
  markers?: PlanMarkerView[];
  currentBomLineId?: string | null;
  notice?: string | null;
  noticeOpen?: boolean;
  onPlace?: (page: number, x: number, y: number) => void;
  onRemove?: (markerId: string) => void;
  onSelect?: (markerId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const dragRef = useRef<{ x: number; y: number; pan: Pan } | null>(null);
  const skipClickRef = useRef(false);
  const pageSizeRef = useRef<Size>({ width: 0, height: 0 });
  const containerSizeRef = useRef<Size>({ width: 0, height: 0 });
  const scaleRef = useRef<number | null>(null);
  const fitModeRef = useRef(true);

  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(1);
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [pageSize, setPageSize] = useState<Size>({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState<Size>({ width: 0, height: 0 });
  const [scale, setScale] = useState<number | null>(null);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [ctrlDown, setCtrlDown] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [hoveredMarker, setHoveredMarker] = useState<PlanMarkerView | null>(null);
  const [painted, setPainted] = useState(false);

  const applyFit = useCallback((box: Size, pdfSize: Size) => {
    if (box.width < 2 || box.height < 2 || pdfSize.width < 2 || pdfSize.height < 2) return false;
    const nextScale = fitScale(box, pdfSize);
    const nextPan = centerPan(box, pdfSize, nextScale);
    fitModeRef.current = true;
    const scaleChanged = scaleRef.current == null || Math.abs(scaleRef.current - nextScale) > 0.0001;
    scaleRef.current = nextScale;
    if (scaleChanged) setScale(nextScale);
    setPan((prev) => (
      Math.abs(prev.x - nextPan.x) < 0.5 && Math.abs(prev.y - nextPan.y) < 0.5 ? prev : nextPan
    ));
    return true;
  }, []);

  const syncFit = useCallback((box?: Size | null, pdfSize?: Size) => {
    if (!fitModeRef.current) return;
    applyFit(box ?? containerSizeRef.current, pdfSize ?? pageSizeRef.current);
  }, [applyFit]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const applyBox = (box: Size) => {
      const prev = containerSizeRef.current;
      if (Math.abs(prev.width - box.width) < 0.5 && Math.abs(prev.height - box.height) < 0.5) {
        syncFit(box, pageSizeRef.current);
        return;
      }
      containerSizeRef.current = box;
      setContainerSize(box);
      syncFit(box, pageSizeRef.current);
    };
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect || rect.width < 2 || rect.height < 2) return;
      applyBox({ width: rect.width, height: rect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [syncFit]);

  useEffect(() => {
    let cancelled = false;
    let loadedDoc: PDFDocumentProxy | null = null;
    const bytes = new Uint8Array(data.slice(0));
    const task = getDocument({
      data: bytes,
      disableStream: true,
      disableRange: true,
    });
    void task.promise.then((loaded) => {
      if (cancelled) {
        void loaded.cleanup();
        return;
      }
      loadedDoc = loaded;
      fitModeRef.current = true;
      scaleRef.current = null;
      pageSizeRef.current = { width: 0, height: 0 };
      setDoc(loaded);
      setPageCount(loaded.numPages);
      setPage(1);
      setPageInput('1');
      setScale(null);
      setPainted(false);
      setPageSize({ width: 0, height: 0 });
      setLoadError(null);
      setRenderError(null);
    }).catch((error: unknown) => {
      if (cancelled) return;
      setLoadError(error instanceof Error ? error.message : 'Impossible de lire le PDF.');
    });
    return () => {
      cancelled = true;
      void task.destroy();
      void loadedDoc?.cleanup();
    };
  }, [data]);

  useEffect(() => {
    if (!doc) return undefined;
    let cancelled = false;
    void doc.getPage(page).then((pdfPage) => {
      if (cancelled) return;
      const viewport = pdfPage.getViewport({ scale: 1 });
      const size = { width: viewport.width, height: viewport.height };
      if (size.width < 2 || size.height < 2) {
        setRenderError("Cette page du PDF n'a pas de taille exploitable.");
        return;
      }
      pageSizeRef.current = size;
      setPageSize(size);
      setPainted(false);
      const box = containerRef.current ? measureBox(containerRef.current) : null;
      if (box) {
        containerSizeRef.current = box;
        setContainerSize(box);
      }
      syncFit(box, size);
    }).catch((error: unknown) => {
      if (cancelled) return;
      setRenderError(error instanceof Error ? error.message : 'Impossible de lire cette page.');
    });
    return () => {
      cancelled = true;
    };
  }, [doc, page, syncFit]);

  useEffect(() => {
    if (!doc || !canvasRef.current || scale == null || pageSize.width < 2) return undefined;
    const canvas = canvasRef.current;
    const outputScale = window.devicePixelRatio || 1;
    let cancelled = false;

    void doc.getPage(page).then(async (pdfPage) => {
      if (cancelled || !canvasRef.current) return;
      renderTaskRef.current?.cancel();
      const viewport = pdfPage.getViewport({ scale });
      canvas.width = Math.max(1, Math.floor(viewport.width * outputScale));
      canvas.height = Math.max(1, Math.floor(viewport.height * outputScale));
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) {
        setRenderError('Impossible de dessiner le plan.');
        return;
      }
      const task = pdfPage.render({
        canvas,
        canvasContext: context,
        viewport,
        transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
        background: '#ffffff',
      });
      renderTaskRef.current = task;
      try {
        await task.promise;
        if (!cancelled) {
          setRenderError(null);
          setPainted(true);
        }
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        if (!message.toLowerCase().includes('cancel')) {
          setRenderError("Le PDF est chargé mais la page n'a pas pu être dessinée.");
        }
      }
    }).catch((error: unknown) => {
      if (cancelled) return;
      setRenderError(error instanceof Error ? error.message : 'Impossible de dessiner cette page.');
    });

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [doc, page, scale, pageSize.width, pageSize.height]);

  useEffect(() => {
    const onDown = (event: KeyboardEvent) => {
      if (event.key === 'Control') setCtrlDown(true);
    };
    const onUp = (event: KeyboardEvent) => {
      if (event.key === 'Control') {
        setCtrlDown(false);
        setDragging(false);
        dragRef.current = null;
      }
    };
    const onBlur = () => {
      setCtrlDown(false);
      setDragging(false);
      dragRef.current = null;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    const onWindowWheel = (event: WheelEvent) => {
      if (event.ctrlKey) event.preventDefault();
    };
    window.addEventListener('wheel', onWindowWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('wheel', onWindowWheel);
    };
  }, []);

  const goToPage = useCallback((nextPage: number) => {
    const clamped = clamp(Math.round(nextPage), 1, pageCount);
    setPage(clamped);
    setPageInput(String(clamped));
  }, [pageCount]);

  const handleReset = () => {
    const el = containerRef.current;
    const box = el ? measureBox(el) : containerSize;
    if (!box) return;
    applyFit(box, pageSize);
  };

  const commitPageInput = () => {
    const parsed = parseInt(pageInput, 10);
    if (Number.isNaN(parsed)) {
      setPageInput(String(page));
      return;
    }
    goToPage(parsed);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey) {
        if (containerSize.width < 2 || pageSize.width < 2) return;
        const rect = el.getBoundingClientRect();
        const mx = event.clientX - rect.left;
        const my = event.clientY - rect.top;
        const currentScale = scale ?? fitScale(containerSize, pageSize);
        const pageX = (mx - pan.x) / currentScale;
        const pageY = (my - pan.y) / currentScale;
        const factor = event.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
        const nextScale = clamp(currentScale * factor, MIN_SCALE, MAX_SCALE);
        fitModeRef.current = false;
        scaleRef.current = nextScale;
        setScale(nextScale);
        setPan({
          x: mx - pageX * nextScale,
          y: my - pageY * nextScale,
        });
        return;
      }
      if (event.deltaY > 0) goToPage(page + 1);
      else if (event.deltaY < 0) goToPage(page - 1);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [containerSize, goToPage, page, pageSize, pan.x, pan.y, scale]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (ctrlDown && event.button === 0) {
      event.preventDefault();
      dragRef.current = { x: event.clientX, y: event.clientY, pan };
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    setPan({
      x: drag.pan.x + (event.clientX - drag.x),
      y: drag.pan.y + (event.clientY - drag.y),
    });
  };

  const ready = scale != null && pageSize.width >= 2;
  const cssW = ready ? pageSize.width * scale : 0;
  const cssH = ready ? pageSize.height * scale : 0;
  const pageMarkers = ready ? markers.filter((marker) => marker.page === page) : [];

  const localPoint = (event: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { mx: event.clientX - rect.left, my: event.clientY - rect.top };
  };

  const markerAt = (mx: number, my: number) => pickMarker(pageMarkers, mx, my, pan, cssW, cssH, currentBomLineId);

  const onPointerMoveHover = (event: React.PointerEvent<HTMLDivElement>) => {
    onPointerMove(event);
    const point = localPoint(event);
    if (!point || dragging || ctrlDown) {
      if (hoveredMarker) setHoveredMarker(null);
      return;
    }
    const hit = markerAt(point.mx, point.my);
    if (hit?.id !== hoveredMarker?.id) setHoveredMarker(hit);
  };

  const onClickCanvas = (event: React.MouseEvent<HTMLDivElement>) => {
    if (skipClickRef.current) {
      skipClickRef.current = false;
      return;
    }
    if (!ready || ctrlDown || dragging || event.button !== 0) return;
    const point = localPoint(event);
    if (!point) return;
    const hit = markerAt(point.mx, point.my);
    if (hit) {
      onSelect?.(hit.id);
      return;
    }
    if (!onPlace) return;
    const x = (point.mx - pan.x) / cssW;
    const y = (point.my - pan.y) / cssH;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    onPlace(page, x, y);
  };

  const onContextMenuCanvas = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!ready) return;
    const point = localPoint(event);
    if (!point) return;
    const hit = markerAt(point.mx, point.my);
    if (hit?.isCurrentList) onRemove?.(hit.id);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    skipClickRef.current = true;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  if (loadError) {
    return <div className="h-full min-h-0 flex items-center justify-center text-sm text-red-600">{loadError}</div>;
  }

  return (
    <div className="h-full w-full min-h-0 flex flex-col">
      <div className="shrink-0 bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-40"
            title="Page précédente"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5 text-sm text-slate-600">
            <span>Page</span>
            <input
              value={pageInput}
              onChange={(event) => setPageInput(event.target.value)}
              onBlur={commitPageInput}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur();
                }
              }}
              className="w-14 h-7 text-center border border-slate-200 rounded-md text-sm font-medium text-slate-800"
            />
            <span>/ {pageCount}</span>
          </div>
          <button
            type="button"
            onClick={() => goToPage(page + 1)}
            disabled={page >= pageCount}
            className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-40"
            title="Page suivante"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100"
          title="Afficher la page entière"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
      <div
        ref={containerRef}
        className={`flex-1 min-h-0 relative overflow-hidden bg-white ${ctrlDown ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-crosshair'}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMoveHover}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onClickCanvas}
        onContextMenu={onContextMenuCanvas}
      >
        {notice && (
          <div
            className={`absolute top-0 left-0 right-0 z-30 transition-transform duration-300 ease-out ${noticeOpen ? 'translate-y-0' : '-translate-y-full'}`}
            onClick={(event) => event.stopPropagation()}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            <div className="px-5 py-2 bg-red-50 border-b border-red-100 text-sm text-red-700 shadow-sm">
              {notice}
            </div>
          </div>
        )}
        {(!doc || !ready) && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
            Chargement du plan…
          </div>
        )}
        {renderError && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 rounded-md bg-red-50 px-3 py-1.5 text-xs text-red-700 shadow">
            {renderError}
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="absolute shadow-lg bg-white"
          style={{
            left: pan.x,
            top: pan.y,
            width: cssW || undefined,
            height: cssH || undefined,
            visibility: ready ? 'visible' : 'hidden',
            opacity: painted ? 1 : 0.15,
          }}
        />
        {pageMarkers.map((marker) => {
          const left = pan.x + marker.x * cssW;
          const top = pan.y + marker.y * cssH;
          const active = marker.isCurrentRef;
          const foreign = !marker.isCurrentList;
          return (
            <div
              key={marker.id}
              className="absolute rounded-full pointer-events-none"
              style={{
                left,
                top,
                width: MARKER_SIZE,
                height: MARKER_SIZE,
                marginLeft: -MARKER_SIZE / 2,
                marginTop: -MARKER_SIZE / 2,
                backgroundColor: marker.color,
                opacity: foreign ? 0.35 : active ? 1 : 0.75,
                boxShadow: active ? '0 0 0 2px #fff, 0 0 0 4px rgba(37,99,235,0.9)' : '0 0 0 1px rgba(255,255,255,0.8)',
                zIndex: active ? 2 : 1,
              }}
            />
          );
        })}
        {hoveredMarker && (
          <div
            className="absolute z-10 pointer-events-none bg-slate-900 text-white text-xs rounded-md px-2 py-1.5 shadow-lg max-w-xs"
            style={{
              left: pan.x + hoveredMarker.x * cssW + 12,
              top: pan.y + hoveredMarker.y * cssH + 12,
            }}
          >
            <div className="font-semibold">{hoveredMarker.ref}</div>
            {hoveredMarker.designation && <div className="text-slate-300">{hoveredMarker.designation}</div>}
            <div className="text-slate-300">{hoveredMarker.typeName || 'Sans type'} · qté {hoveredMarker.quantity}</div>
            {!hoveredMarker.isCurrentList && hoveredMarker.sublistName && (
              <div className="text-slate-400 mt-0.5">{hoveredMarker.sublistName}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
