import { useState } from 'react';
import { useTimelineStore } from '../../stores/timelineStore';
import { useProjectStore } from '../../stores/projectStore';
import { api } from '../../api/client';
import { Sparkles, Loader2, Check, X } from 'lucide-react';
import type { TimelineAction } from '../../types';

export function PromptPanel() {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ strategy: string; actions: TimelineAction[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { timeline } = useTimelineStore();
  const { mediaFiles } = useProjectStore();

  const handleSubmit = async () => {
    if (!prompt.trim() || isProcessing) return;
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.executePrompt(
        prompt,
        timeline,
        mediaFiles.map((m) => m.id)
      );

      if (res.success) {
        setResult({ strategy: res.strategy, actions: res.actions });
      } else {
        setError(res.message || 'No matching command found');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (!result) return;
    // TODO: Apply actions to timeline
    // For MVP, the actions are informational
    setResult(null);
    setPrompt('');
  };

  const handleDiscard = () => {
    setResult(null);
  };

  return (
    <div className="h-full flex flex-col p-3 bg-editor-panel">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-editor-accent" />
        <span className="text-xs font-semibold text-editor-text-dim uppercase tracking-wider">AI Prompt</span>
      </div>

      <div className="flex gap-2 flex-1">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder='Try: "cut silence", "remove silent parts"...'
          disabled={isProcessing}
          className="flex-1 bg-editor-surface border border-editor-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-editor-text-dim/50 outline-none focus:border-editor-accent disabled:opacity-50"
        />
        <button
          onClick={handleSubmit}
          disabled={isProcessing || !prompt.trim()}
          className="px-4 py-2 bg-editor-accent hover:bg-editor-accent-hover rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Execute
        </button>
      </div>

      {/* Results area */}
      {error && (
        <div className="mt-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-2 px-3 py-2 bg-editor-accent/10 border border-editor-accent/30 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-editor-accent font-medium">
              Strategy: {result.strategy} &middot; {result.actions.length} actions
            </span>
            <div className="flex gap-1">
              <button
                onClick={handleApply}
                className="p-1 bg-green-600 hover:bg-green-500 rounded text-white"
                title="Apply"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={handleDiscard}
                className="p-1 bg-red-600 hover:bg-red-500 rounded text-white"
                title="Discard"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
          <p className="text-[10px] text-editor-text-dim">
            {result.actions.slice(0, 3).map((a, i) => (
              <span key={i}>
                {a.type} at {a.data?.start ? `${Number(a.data.start).toFixed(1)}s` : a.timestamp?.toFixed(1) + 's'}
                {i < Math.min(2, result.actions.length - 1) ? ' | ' : ''}
              </span>
            ))}
            {result.actions.length > 3 && ` ...and ${result.actions.length - 3} more`}
          </p>
        </div>
      )}
    </div>
  );
}
