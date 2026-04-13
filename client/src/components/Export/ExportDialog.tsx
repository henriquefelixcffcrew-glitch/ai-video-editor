import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../api/client';
import { useTimelineStore } from '../../stores/timelineStore';
import { Download, X, Loader2, CheckCircle, AlertCircle, FileVideo } from 'lucide-react';
import type { ExportSettings } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type ExportStatus = 'idle' | 'queued' | 'processing' | 'completed' | 'failed';

export function ExportDialog({ isOpen, onClose }: Props) {
  const { timeline } = useTimelineStore();

  const [settings, setSettings] = useState<ExportSettings>({
    resolution: '1080p',
    fps: 30,
    quality: 'medium',
    format: 'mp4',
  });
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasClips = timeline.tracks.some((t) => t.type === 'video' && t.clips.length > 0);

  // Connect WebSocket when export starts
  const connectWs = useCallback((targetJobId: string) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.jobId !== targetJobId) return;

        if (data.status === 'processing') {
          setStatus('processing');
          setProgress(data.progress ?? 0);
        } else if (data.status === 'completed') {
          setStatus('completed');
          setProgress(100);
        } else if (data.status === 'failed') {
          setStatus('failed');
          setError(data.error ?? 'Export failed');
        }
      } catch {}
    };

    ws.onerror = () => {
      // Fallback: if WS fails, polling will handle it
    };

    wsRef.current = ws;
  }, []);

  // Polling fallback — runs alongside WS in case WS misses events
  const startPolling = useCallback((targetJobId: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.getExportStatus(targetJobId);
        setProgress(res.progress ?? 0);

        if (res.state === 'completed') {
          setStatus('completed');
          setProgress(100);
          cleanup();
        } else if (res.state === 'failed') {
          setStatus('failed');
          setError(res.failedReason ?? 'Export failed');
          cleanup();
        } else if (res.state === 'active') {
          setStatus('processing');
        }
      } catch {}
    }, 2000);
  }, []);

  const cleanup = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Cleanup on unmount or close
  useEffect(() => {
    if (!isOpen) {
      cleanup();
    }
    return cleanup;
  }, [isOpen, cleanup]);

  const handleExport = async () => {
    setStatus('queued');
    setProgress(0);
    setError(null);
    setJobId(null);

    try {
      const res = await api.startExport(timeline, [], settings);

      if (!res.jobId) {
        setStatus('failed');
        setError('Server did not return a job ID');
        return;
      }

      setJobId(res.jobId);
      setStatus('processing');
      connectWs(res.jobId);
      startPolling(res.jobId);
    } catch (err) {
      setStatus('failed');
      setError(err instanceof Error ? err.message : 'Failed to start export');
    }
  };

  const handleReset = () => {
    cleanup();
    setStatus('idle');
    setProgress(0);
    setJobId(null);
    setError(null);
  };

  const handleClose = () => {
    if (status === 'processing' || status === 'queued') return; // Don't close during export
    handleReset();
    onClose();
  };

  const downloadUrl = jobId ? api.getExportDownloadUrl(jobId) : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-editor-panel border border-editor-border rounded-xl w-[420px] p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <FileVideo className="w-5 h-5 text-editor-accent" />
            <h3 className="text-white font-semibold">Export Video</h3>
          </div>
          <button
            onClick={handleClose}
            disabled={status === 'processing' || status === 'queued'}
            className="text-editor-text-dim hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings (only show when idle) */}
        {status === 'idle' && (
          <div className="space-y-3 mb-5">
            <div>
              <label className="text-xs text-editor-text-dim block mb-1">Resolution</label>
              <select
                value={settings.resolution}
                onChange={(e) => setSettings({ ...settings, resolution: e.target.value as ExportSettings['resolution'] })}
                className="w-full bg-editor-surface border border-editor-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-editor-accent"
              >
                <option value="720p">720p (HD)</option>
                <option value="1080p">1080p (Full HD)</option>
                <option value="4k">4K (Ultra HD)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-editor-text-dim block mb-1">Frame Rate</label>
              <select
                value={settings.fps}
                onChange={(e) => setSettings({ ...settings, fps: Number(e.target.value) })}
                className="w-full bg-editor-surface border border-editor-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-editor-accent"
              >
                <option value={24}>24 fps (Cinema)</option>
                <option value={30}>30 fps (Standard)</option>
                <option value={60}>60 fps (Smooth)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-editor-text-dim block mb-1">Quality</label>
              <select
                value={settings.quality}
                onChange={(e) => setSettings({ ...settings, quality: e.target.value as ExportSettings['quality'] })}
                className="w-full bg-editor-surface border border-editor-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-editor-accent"
              >
                <option value="low">Low (faster export)</option>
                <option value="medium">Medium (balanced)</option>
                <option value="high">High (slower export)</option>
              </select>
            </div>
          </div>
        )}

        {/* Processing state */}
        {(status === 'queued' || status === 'processing') && (
          <div className="py-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-editor-accent/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-editor-accent" />
              </div>
            </div>
            <p className="text-center text-sm text-white mb-1">
              {status === 'queued' ? 'Queued...' : 'Rendering video...'}
            </p>
            <p className="text-center text-xs text-editor-text-dim mb-4">
              {settings.resolution} &middot; {settings.fps}fps &middot; {settings.quality} quality
            </p>
            <div className="w-full bg-editor-surface rounded-full h-2 mb-1">
              <div
                className="bg-editor-accent h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-center text-xs text-editor-text-dim">{progress}%</p>
          </div>
        )}

        {/* Completed state */}
        {status === 'completed' && downloadUrl && (
          <div className="py-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <p className="text-center text-sm text-white mb-1">Export complete!</p>
            <p className="text-center text-xs text-editor-text-dim mb-4">
              {settings.resolution} &middot; {settings.fps}fps &middot; MP4
            </p>
            <a
              href={downloadUrl}
              download
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-green-600 hover:bg-green-500 rounded-lg text-white text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Download MP4
            </a>
            <button
              onClick={handleReset}
              className="w-full mt-2 px-4 py-2 text-editor-text-dim hover:text-white text-xs transition-colors"
            >
              Export again with different settings
            </button>
          </div>
        )}

        {/* Error state */}
        {status === 'failed' && (
          <div className="py-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
            </div>
            <p className="text-center text-sm text-white mb-1">Export failed</p>
            <p className="text-center text-xs text-red-300/80 mb-4 px-4">
              {error || 'An unexpected error occurred'}
            </p>
            <button
              onClick={handleReset}
              className="w-full px-4 py-2.5 bg-editor-surface hover:bg-editor-border rounded-lg text-white text-sm transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {/* Start export button (idle state) */}
        {status === 'idle' && (
          <button
            onClick={handleExport}
            disabled={!hasClips}
            className="w-full px-4 py-2.5 bg-editor-accent hover:bg-editor-accent-hover disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium transition-colors"
          >
            {hasClips ? 'Start Export' : 'Add clips to timeline first'}
          </button>
        )}
      </div>
    </div>
  );
}
