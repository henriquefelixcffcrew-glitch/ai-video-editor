import { useEffect, useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { Film, Plus, Trash2, FolderOpen } from 'lucide-react';

interface Props {
  onOpenEditor: () => void;
}

export function Dashboard({ onOpenEditor }: Props) {
  const { projects, loadProjects, createProject, openProject, deleteProject, isLoading } = useProjectStore();
  const [newName, setNewName] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createProject(newName.trim());
    setNewName('');
    setShowCreate(false);
    onOpenEditor();
  };

  const handleOpen = async (id: string) => {
    await openProject(id);
    onOpenEditor();
  };

  return (
    <div className="min-h-screen bg-editor-bg flex flex-col items-center pt-16 px-4">
      <div className="w-full max-w-3xl">
        <div className="flex items-center gap-3 mb-8">
          <Film className="w-8 h-8 text-editor-accent" />
          <h1 className="text-3xl font-bold text-white">AI Video Editor</h1>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg text-editor-text-dim">Your Projects</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-editor-accent hover:bg-editor-accent-hover rounded-lg text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>

        {showCreate && (
          <div className="bg-editor-panel border border-editor-border rounded-lg p-4 mb-4 flex gap-3">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Project name..."
              className="flex-1 bg-editor-surface border border-editor-border rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-editor-accent"
            />
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-editor-accent hover:bg-editor-accent-hover rounded-lg text-white text-sm font-medium transition-colors"
            >
              Create
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 bg-editor-surface hover:bg-editor-border rounded-lg text-editor-text-dim text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="text-center text-editor-text-dim py-12">Loading...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16">
            <Film className="w-16 h-16 text-editor-border mx-auto mb-4" />
            <p className="text-editor-text-dim text-lg">No projects yet</p>
            <p className="text-editor-text-dim text-sm mt-1">Create a new project to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-editor-panel border border-editor-border rounded-lg p-4 flex items-center justify-between hover:border-editor-accent/50 transition-colors group"
              >
                <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => handleOpen(project.id)}>
                  <FolderOpen className="w-5 h-5 text-editor-accent" />
                  <div>
                    <p className="text-white font-medium">{project.name}</p>
                    <p className="text-editor-text-dim text-xs">
                      {new Date(project.updatedAt).toLocaleDateString()} &middot;{' '}
                      {project.timeline.tracks[0]?.clips.length ?? 0} clips
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }}
                  className="p-2 text-editor-text-dim hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
