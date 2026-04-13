import { useEffect } from 'react';
import { MediaLibrary } from '../MediaLibrary/MediaLibrary';
import { PreviewPlayer } from '../Preview/PreviewPlayer';
import { Timeline } from '../Timeline/Timeline';
import { PromptPanel } from '../PromptPanel/PromptPanel';
import { useProjectStore } from '../../stores/projectStore';
import { useTimelineStore } from '../../stores/timelineStore';
import { ArrowLeft, Save } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export function AppLayout({ onBack }: Props) {
  const { currentProject, saveProject, loadMedia } = useProjectStore();
  const { timeline, setTimeline } = useTimelineStore();

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  useEffect(() => {
    if (currentProject?.timeline) {
      setTimeline(currentProject.timeline);
    }
  }, [currentProject, setTimeline]);

  // Auto-save every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentProject) {
        saveProject();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [currentProject, timeline, saveProject]);

  return (
    <div className="h-screen flex flex-col bg-editor-bg overflow-hidden">
      {/* Top bar */}
      <div className="h-11 bg-editor-panel border-b border-editor-border flex items-center px-3 gap-3 shrink-0">
        <button onClick={onBack} className="p-1.5 hover:bg-editor-surface rounded text-editor-text-dim hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium text-white">{currentProject?.name ?? 'Untitled'}</span>
        <div className="flex-1" />
        <button
          onClick={saveProject}
          className="flex items-center gap-1.5 px-3 py-1 bg-editor-surface hover:bg-editor-border rounded text-xs text-editor-text-dim hover:text-white transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          Save
        </button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel - Media Library */}
        <div className="w-64 border-r border-editor-border bg-editor-panel flex flex-col shrink-0">
          <MediaLibrary />
        </div>

        {/* Center panel - Preview + Prompt */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0">
            <PreviewPlayer />
          </div>
          <div className="h-32 border-t border-editor-border shrink-0">
            <PromptPanel />
          </div>
        </div>
      </div>

      {/* Bottom - Timeline */}
      <div className="h-64 border-t border-editor-border shrink-0">
        <Timeline />
      </div>
    </div>
  );
}
