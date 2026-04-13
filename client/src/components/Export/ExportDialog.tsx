import { useState } from 'react';
import { api } from '../../api/client';
import { useTimelineStore } from '../../stores/timelineStore';
import { useProjectStore } from '../../stores/projectStore';
import { Download, X, Loader2 } from 'lucide-react';
import type { ExportSettings } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportDialog({ isOpen, onClose }: Props) {
  const { timeline } = useTimelineStore();
  const { mediaFiles } = useProjectStore();

  const [settings, setSettings] = useState<ExportSettings>({
    resolution: '1080p',
    fps: 30,
    quality: 'medium',
    format: 'mp4',
  });
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    setExporting(true);
    setProgress(0);
    setDownloadUrl(null);

    try {
      const res = await api.startExport(timeline, mediaFiles, settings);
      const jobId = res.jobId;

      // Poll for progress
      const poll = setInterval(async () => {
        try {
          const status = await api.getExportStatus(jobId);
          setProgress(typeof status.progress === 'number' ? status.progress : 0);

          if (status.state === 'completed') {
            clearInterval(poll);
            setDownloadUrl(api.getExportDownloadUrl(jobId));
            setExporting(false);
          } else if (status.state === 'failed') {
            clearInterval(poll);
            setExporting(false);
          }
        } catch {
          clearInterval(poll);
          setExporting(false);
        }
      }, 1000);
    } catch {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-editor-panel border border-editor-border rounded-xl w-96 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Export Video</h3>
          <button onClick={onClose} className="text-editor-text-dim hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
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
              <option value={24}>24 fps</option>
              <option value={30}>30 fps</option>
              <option value={60}>60 fps</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-editor-text-dim block mb-1">Quality</label>
            <select
              value={settings.quality}
              onChange={(e) => setSettings({ ...settings, quality: e.target.value as ExportSettings['quality'] })}
              className="w-full bg-editor-surface border border-editor-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-editor-accent"
            >
              <option value="low">Low (faster)</option>
              <option value="medium">Medium</option>
              <option value="high">High (slower)</option>
            </select>
          </div>
        </div>

        {exporting && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-editor-accent" />
              <span className="text-xs text-editor-text-dim">Exporting... {progress}%</span>
            </div>
            <div className="w-full bg-editor-surface rounded-full h-1.5">
              <div className="bg-editor-accent h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {downloadUrl && (
          <a
            href={downloadUrl}
            className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Download MP4
          </a>
        )}

        {!exporting && !downloadUrl && (
          <button
            onClick={handleExport}
            className="mt-4 w-full px-4 py-2 bg-editor-accent hover:bg-editor-accent-hover rounded-lg text-white text-sm font-medium transition-colors"
          >
            Start Export
          </button>
        )}
      </div>
    </div>
  );
}
