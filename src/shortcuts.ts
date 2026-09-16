import { ShortcutAction, ShortcutBinding, ShortcutBindings } from './types';

export const DEFAULT_SHORTCUT_BINDINGS: ShortcutBindings = {
  addReference: { key: 'a', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
  addQuantity: { key: 'e', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
  cycleSort: { key: 't', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
  selectPrevious: { key: 'ArrowUp', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
  selectNext: { key: 'ArrowDown', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
  incrementQuantity: { key: '+', ctrlKey: false, altKey: false, shiftKey: true, metaKey: false },
  decrementQuantity: { key: '-', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
  deleteLine: { key: 'Delete', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
  focusSearch: { key: '/', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
  toggleHelp: { key: '?', ctrlKey: false, altKey: false, shiftKey: true, metaKey: false },
  dismiss: { key: 'Escape', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
};

export const SHORTCUT_LABELS: Record<ShortcutAction, string> = {
  addReference: 'Ajouter une nouvelle référence',
  addQuantity: 'Ajouter une quantité à la référence sélectionnée',
  cycleSort: 'Changer le mode de tri',
  selectPrevious: 'Sélectionner la référence précédente',
  selectNext: 'Sélectionner la référence suivante',
  incrementQuantity: 'Incrémenter la quantité',
  decrementQuantity: 'Décrémenter la quantité',
  deleteLine: 'Supprimer la référence sélectionnée',
  focusSearch: 'Rechercher une référence',
  toggleHelp: 'Afficher cette aide des raccourcis',
  dismiss: 'Fermer / désélectionner',
};

export const SHORTCUT_ACTIONS = Object.keys(DEFAULT_SHORTCUT_BINDINGS) as ShortcutAction[];

const normalizeKey = (key: string) => key.length === 1 ? key.toLowerCase() : key;

export function isShortcut(event: KeyboardEvent, binding: ShortcutBinding) {
  return normalizeKey(event.key) === normalizeKey(binding.key)
    && event.ctrlKey === binding.ctrlKey
    && event.altKey === binding.altKey
    && event.shiftKey === binding.shiftKey
    && event.metaKey === binding.metaKey;
}

export function bindingFromEvent(event: KeyboardEvent): ShortcutBinding | null {
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) return null;
  return {
    key: event.key,
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    metaKey: event.metaKey,
  };
}

export function formatShortcut(binding: ShortcutBinding) {
  const modifiers = [
    binding.ctrlKey && 'Ctrl',
    binding.altKey && 'Alt',
    binding.shiftKey && 'Maj',
    binding.metaKey && 'Meta',
  ].filter(Boolean);
  const keyLabels: Record<string, string> = {
    ' ': 'Espace',
    Escape: 'Échap',
    ArrowUp: '↑',
    ArrowDown: '↓',
    Delete: 'Suppr',
    Backspace: 'Retour arrière',
  };
  const key = keyLabels[binding.key] || binding.key;
  return [...modifiers, key].join(' + ');
}

export function sameShortcut(first: ShortcutBinding, second: ShortcutBinding) {
  return normalizeKey(first.key) === normalizeKey(second.key)
    && first.ctrlKey === second.ctrlKey
    && first.altKey === second.altKey
    && first.shiftKey === second.shiftKey
    && first.metaKey === second.metaKey;
}

export function mergeShortcutBindings(value: unknown): ShortcutBindings {
  const saved = value as Partial<ShortcutBindings> | undefined;
  return SHORTCUT_ACTIONS.reduce((bindings, action) => {
    const candidate = saved?.[action];
    bindings[action] = candidate && typeof candidate.key === 'string'
      ? { ...DEFAULT_SHORTCUT_BINDINGS[action], ...candidate }
      : { ...DEFAULT_SHORTCUT_BINDINGS[action] };
    return bindings;
  }, {} as ShortcutBindings);
}
