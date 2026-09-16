import React, { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { Dashboard } from './components/Dashboard';
import { ProjectView } from './components/ProjectView';
import { CatalogAdmin } from './components/CatalogAdmin';
import { UpdateNotifier } from './components/UpdateNotifier';

export default function App() {
  const { currentProjectId, isLoaded, loadState, openProjectByPath } = useStore();
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    if (!isLoaded) {
      loadState();
    }
  }, [isLoaded, loadState]);

  useEffect(() => {
    if (!isLoaded || !window.electronAPI) return;

    const openRequestedProject = async (filePath: string) => {
      if (currentProjectId && !window.confirm('Une affaire est déjà ouverte. Voulez-vous la remplacer par ce fichier ?')) {
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
    return <div className="h-screen w-full flex items-center justify-center bg-slate-50"><div className="animate-pulse text-slate-400">Chargement de la base de données...</div></div>;
  }

  return (
    <div className="h-screen w-full bg-slate-100 overflow-hidden font-sans flex flex-col">
      <UpdateNotifier />
      {showAdmin ? (
        <CatalogAdmin onBack={() => setShowAdmin(false)} />
      ) : currentProjectId ? (
        <ProjectView />
      ) : (
        <Dashboard onOpenAdmin={() => setShowAdmin(true)} />
      )}
    </div>
  );
}
