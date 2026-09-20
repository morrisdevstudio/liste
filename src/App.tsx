import React, { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { Dashboard } from './components/Dashboard';
import { ProjectView } from './components/ProjectView';
import { CatalogAdmin } from './components/CatalogAdmin';
import { UpdateNotifier } from './components/UpdateNotifier';
import { PlanWindow } from './components/PlanWindow';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ThemeProvider } from './useTheme';

function isPlanWindow() {
  return window.location.hash === '#/plan';
}

export default function App() {
  if (isPlanWindow()) {
    return (
      <ThemeProvider persist={false}>
        <PlanWindow />
      </ThemeProvider>
    );
  }
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}

function MainApp() {
  const { currentProjectId, isLoaded, loadState, openProjectByPath } = useStore();
  const [showAdmin, setShowAdmin] = useState(false);
  const [pendingProjectPath, setPendingProjectPath] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) {
      loadState();
    }
  }, [isLoaded, loadState]);

  useEffect(() => {
    if (!isLoaded || !window.electronAPI) return;

    const openRequestedProject = async (filePath: string) => {
      if (currentProjectId) {
        setPendingProjectPath(filePath);
        return;
      }
      await openProjectByPath(filePath);
    };

    const unsubscribe = window.electronAPI.onOpenProjectFile(filePath => {
      void openRequestedProject(filePath);
    });

    void window.electronAPI.takeStartupProjectFile().then(filePath => {
      if (filePath) void openRequestedProject(filePath);
    });

    return unsubscribe;
  }, [currentProjectId, isLoaded, openProjectByPath]);

  if (!isLoaded) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-charte-bg-sombre">
        <div className="animate-pulse text-slate-400">Chargement de la base de données...</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-slate-50 dark:bg-charte-bg-sombre overflow-hidden font-sans flex flex-col text-slate-900 dark:text-slate-100">
      <UpdateNotifier />
      {showAdmin ? (
        <CatalogAdmin onBack={() => setShowAdmin(false)} />
      ) : currentProjectId ? (
        <ProjectView />
      ) : (
        <Dashboard onOpenAdmin={() => setShowAdmin(true)} />
      )}
      <ConfirmDialog
        open={!!pendingProjectPath}
        title="Remplacer l'affaire ouverte ?"
        message="Une affaire est déjà ouverte. Voulez-vous la remplacer par ce fichier ?"
        confirmLabel="Remplacer"
        onCancel={() => setPendingProjectPath(null)}
        onConfirm={() => {
          const filePath = pendingProjectPath;
          setPendingProjectPath(null);
          if (filePath) void openProjectByPath(filePath);
        }}
      />
    </div>
  );
}
