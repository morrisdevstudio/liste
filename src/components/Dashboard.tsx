import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Plus, FolderOpen, Database, Clock, Edit2, Check, X, User } from 'lucide-react';
import { ProjectSettingsModal } from './ProjectSettingsModal';
import { AppSettingsMenu } from './ThemeToggle';
import { Project } from '../types';

interface DashboardProps {
  onOpenAdmin?: () => void;
}

export function Dashboard({ onOpenAdmin }: DashboardProps) {
  const { openProjectFromFile, createProjectInteractive, recentFiles, openProjectByPath, defaultTechName, setDefaultTechName } = useStore();
  const isElectron = !!window.electronAPI;
  
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [isEditingTech, setIsEditingTech] = useState(false);
  const [tempTechName, setTempTechName] = useState('');

  const handleOpenProject = async (e: React.MouseEvent) => {
    e.preventDefault();
    await openProjectFromFile();
  };

  const handleCreateProject = async (data: Partial<Project>) => {
    const projectToCreate = { 
      ...data,
      id: `${data.affaireOrigine?.trim()}-${data.ligneOrigine?.trim()}`
    } as Omit<Project, 'createdAt'>;
    const trimmedProject = Object.fromEntries(Object.entries(projectToCreate).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])) as Omit<Project, 'createdAt'>;
    await createProjectInteractive(trimmedProject);
    setShowNewProjectModal(false);
  };

  return (
    <div className="w-full h-full overflow-auto">
      <div className="p-4 sm:p-8 pt-12 sm:pt-20 max-w-4xl mx-auto flex flex-col gap-8">
      
      <div className="text-center mb-8 relative">
         <div className="absolute top-0 right-0 hidden sm:flex items-center gap-3">
           <AppSettingsMenu panelAlign="right" panelSide="below" />
           {onOpenAdmin && isElectron && (
             <button 
               onClick={onOpenAdmin}
               className="btn-charte btn-charte-secondaire"
             >
               <Database className="w-4 h-4" />
               Catalogue
             </button>
           )}
         </div>

         <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Gestion d'Affaires</h1>
         <p className="text-slate-500 dark:text-slate-400 mt-2">Ouvrez ou créez une affaire pour gérer sa nomenclature.</p>
         
         <div className="mt-6 flex flex-col items-center justify-center">
            {isEditingTech ? (
              <div className="flex items-center gap-2 bg-white dark:bg-charte-tuile-sombre px-3 py-2 rounded-sm border border-slate-200 dark:border-slate-700/50 shadow-sm">
                <User className="w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  className="w-48 outline-none text-sm font-medium text-slate-700 dark:text-slate-100 bg-transparent"
                  value={tempTechName}
                  onChange={e => setTempTechName(e.target.value)}
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      setDefaultTechName(tempTechName.trim() || 'Technicien BE');
                      setIsEditingTech(false);
                    } else if (e.key === 'Escape') {
                      setIsEditingTech(false);
                    }
                  }}
                />
                <button onClick={() => { setDefaultTechName(tempTechName.trim() || 'Technicien BE'); setIsEditingTech(false); }} className="text-emerald-600 hover:text-emerald-700 p-1"><Check className="w-4 h-4" /></button>
                <button onClick={() => setIsEditingTech(false)} className="text-red-500 hover:text-red-600 p-1"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 font-medium group">
                <User className="w-4 h-4 text-slate-400" />
                <span>{defaultTechName}</span>
                <button 
                  onClick={() => { setTempTechName(defaultTechName); setIsEditingTech(true); }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-sm transition-all"
                  title="Modifier votre nom"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
         </div>
      </div>

      <div className="sm:hidden flex items-center justify-center gap-3 mb-2">
        <AppSettingsMenu panelAlign="right" panelSide="below" />
        {onOpenAdmin && isElectron && (
          <button 
            onClick={onOpenAdmin}
            className="flex-1 bg-white dark:bg-charte-tuile-sombre border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-4 py-3 rounded-sm font-medium flex items-center justify-center gap-2 shadow-sm"
          >
            <Database className="w-5 h-5" />
            Administration du Catalogue
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <button 
          onClick={handleOpenProject}
          className="bg-white dark:bg-charte-tuile-sombre p-8 rounded-sm shadow-sm border border-slate-200 dark:border-slate-700/50 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-[#252627] transition-colors group"
        >
           <div className="bg-charte-jaune p-4 rounded-sm text-slate-900 mb-4 group-hover:scale-110 transition-transform">
             <FolderOpen className="w-8 h-8" />
           </div>
           <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Ouvrir une affaire</h2>
           <p className="text-sm text-slate-500 dark:text-slate-400">Parcourir les fichiers existants</p>
        </button>

        <button 
          onClick={() => setShowNewProjectModal(true)}
          className="bg-white dark:bg-charte-tuile-sombre p-8 rounded-sm border border-slate-200 dark:border-slate-700/50 flex flex-col items-center justify-center text-center transition-colors group shadow-sm hover:bg-slate-50 dark:hover:bg-[#252627]"
        >
           <div className="icon-chip p-4 rounded-sm mb-4 group-hover:scale-110 transition-transform">
             <Plus className="w-8 h-8" />
           </div>
           <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Nouvelle affaire</h2>
           <p className="text-sm text-slate-500 dark:text-slate-400">Créer une nouvelle nomenclature</p>
        </button>
      </div>
      
      {showNewProjectModal && (
        <ProjectSettingsModal 
          onClose={() => setShowNewProjectModal(false)}
          onSave={handleCreateProject}
        />
      )}

      {recentFiles.length > 0 && (
        <div className="mt-2 bg-white dark:bg-charte-tuile-sombre p-6 rounded-sm border border-slate-200 dark:border-slate-700/50 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            Affaires récentes
          </h3>
          <div className="space-y-2">
            {recentFiles.map((file, idx) => (
              <div
                key={`${file.path}-${idx}`}
                onClick={() => openProjectByPath(file.path)}
                onKeyDown={e => {
                  if ((e.key === 'Enter' || e.key === ' ') && e.currentTarget === e.target) {
                    e.preventDefault();
                    void openProjectByPath(file.path);
                  }
                }}
                role="button"
                tabIndex={0}
                className="w-full text-left flex items-center justify-between p-3 rounded-sm hover:bg-slate-50 dark:hover:bg-[#252627] border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="icon-chip icon-chip-accent p-2 rounded-sm">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-slate-900 dark:group-hover:text-charte-jaune transition-colors">
                      {file.nomAffaire ? `${file.nomAffaire} — ${file.nomTableau}` : file.id}
                    </h4>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <span>{file.nomAffaire ? `N° ${file.id} • ` : ''}{file.tech} •</span>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          void window.electronAPI?.showProjectInFolder(file.path);
                        }}
                        className="inline-flex min-h-8 items-center gap-1 rounded-sm px-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-charte-bg-sombre hover:text-slate-900 dark:hover:text-white transition-colors"
                        title="Ouvrir l'emplacement du fichier"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        Ouvrir l'emplacement
                      </button>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-400 font-medium whitespace-nowrap ml-4">
                  {new Date(file.lastOpened).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
  );
}
