import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from './components/Layout/AppLayout';
import { Dashboard } from './components/Layout/Dashboard';
import { useProjectStore } from './stores/projectStore';
import { useTimelineStore } from './stores/timelineStore';

export default function App() {
  const [view, setView] = useState<'dashboard' | 'editor'>('dashboard');
  const { currentProject } = useProjectStore();
  const { undo, redo, splitClipAtPlayhead, removeClip, selectedClipId, setIsPlaying, isPlaying } = useTimelineStore();

  const handleOpenEditor = useCallback(() => setView('editor'), []);
  const handleBackToDashboard = useCallback(() => setView('dashboard'), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying(!isPlaying);
      }
      if (e.key === 's' && !e.ctrlKey && !e.metaKey) {
        splitClipAtPlayhead();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedClipId) removeClip(selectedClipId);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, splitClipAtPlayhead, removeClip, selectedClipId, isPlaying, setIsPlaying]);

  if (view === 'dashboard' || !currentProject) {
    return <Dashboard onOpenEditor={handleOpenEditor} />;
  }

  return <AppLayout onBack={handleBackToDashboard} />;
}
