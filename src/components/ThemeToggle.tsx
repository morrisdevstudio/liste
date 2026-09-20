import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Monitor, Moon, Settings, Sun } from 'lucide-react';
import { useTheme } from '../useTheme';
import type { ThemePreference } from '../theme';

const OPTIONS: { id: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { id: 'light', label: 'Clair', Icon: Sun },
  { id: 'dark', label: 'Sombre', Icon: Moon },
  { id: 'auto', label: 'Syst\u00e8me', Icon: Monitor },
];

export function ThemeToggle({ onSelect }: { onSelect?: () => void }) {
  const { preference, setPreference } = useTheme();

  return (
    <div className="space-y-1">
      {OPTIONS.map(({ id, label, Icon }) => {
        const active = preference === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => {
              void setPreference(id);
              onSelect?.();
            }}
            className={`w-full rounded-sm px-2 py-1.5 text-left text-sm flex items-center gap-2 ${
              active
                ? 'bg-slate-100 dark:bg-charte-bg-sombre font-medium text-slate-900 dark:text-charte-jaune'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#252627]'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function AppSettingsMenu({
  children,
  showLabel = true,
  panelAlign = 'left',
  panelSide = 'above',
  buttonClassName,
}: {
  children?: ReactNode;
  showLabel?: boolean;
  panelAlign?: 'left' | 'right';
  panelSide?: 'above' | 'below';
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      {open && (
        <div className={`absolute w-56 bg-white dark:bg-charte-tuile-sombre border border-slate-200 dark:border-slate-700/50 rounded-sm shadow-xl z-30 p-3 space-y-3 ${
          panelSide === 'below' ? 'top-full mt-2' : 'bottom-full mb-2'
        } ${panelAlign === 'right' ? 'right-0' : 'left-0'}`}>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Apparence</p>
            <ThemeToggle onSelect={() => setOpen(false)} />
          </div>
          {children}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={buttonClassName ?? 'btn-charte btn-charte-secondaire'}
        title={'Param\u00e8tres de l\'application'}
      >
        <Settings className="w-4 h-4 shrink-0" />
        {showLabel && <span>{'Param\u00e8tres'}</span>}
      </button>
    </div>
  );
}
