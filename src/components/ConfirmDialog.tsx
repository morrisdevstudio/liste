import React from 'react';

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  danger = false,
  hideCancel = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  hideCancel?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-charte-tuile-sombre rounded-sm shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700/50">
        <div className="p-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{title}</h3>
          <div className="text-sm text-slate-600 dark:text-slate-300">{message}</div>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-[#18191a] flex justify-end gap-3">
          {!hideCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="btn-charte btn-charte-secondaire"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className={
              danger
                ? 'btn-charte btn-charte-rouge'
                : 'btn-charte btn-charte-jaune'
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
