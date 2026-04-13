import { useCallback, useRef, useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { useTimelineStore } from '../../stores/timelineStore';
import { Upload, Film, GripVertical } from 'lucide-react';
import type { MediaFile, Clip } from '../../types';

function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaLibrary() {
  const { mediaFiles, uploadMedia } = useProjectStore();
  const { addClipToTrack, timeline } = useTimelineStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      await uploadMedia(file);
    }
    setUploading(false);
  }, [uploadMedia]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    handleUpload(e.dataTransfer.files);
  }, [handleUpload]);

  const handleAddToTimeline = useCallback((media: MediaFile) => {
    const videoTrack = timeline.tracks.find((t) => t.type === 'video');
    if (!videoTrack) return;

    const lastClipEnd = Math.max(0, ...videoTrack.clips.map((c) => c.endTime));
    const duration = media.metadata?.duration ?? 10;

    const clip: Clip = {
      id: generateId(),
      mediaId: media.id,
      trackId: videoTrack.id,
      startTime: lastClipEnd,
      endTime: lastClipEnd + duration,
      inPoint: 0,
      outPoint: duration,
      duration,
    };

    addClipToTrack(videoTrack.id, clip);
  }, [timeline, addClipToTrack]);

  const handleDragStart = useCallback((e: React.DragEvent, media: MediaFile) => {
    e.dataTransfer.setData('application/media-id', media.id);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-editor-border">
        <h3 className="text-xs font-semibold text-editor-text-dim uppercase tracking-wider">Media</h3>
      </div>

      {/* Upload area */}
      <div
        className={`m-2 border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
          isDraggingOver ? 'border-editor-accent bg-editor-accent/10' : 'border-editor-border hover:border-editor-accent/50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-6 h-6 mx-auto mb-1 text-editor-text-dim" />
        <p className="text-xs text-editor-text-dim">
          {uploading ? 'Uploading...' : 'Drop video or click'}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>

      {/* Media list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {mediaFiles.length === 0 ? (
          <p className="text-xs text-editor-text-dim text-center py-4">No media files</p>
        ) : (
          mediaFiles.map((media) => (
            <div
              key={media.id}
              draggable
              onDragStart={(e) => handleDragStart(e, media)}
              onDoubleClick={() => handleAddToTimeline(media)}
              className="flex items-center gap-2 p-2 rounded-lg bg-editor-surface hover:bg-editor-border cursor-grab active:cursor-grabbing transition-colors group"
            >
              <GripVertical className="w-3 h-3 text-editor-text-dim opacity-0 group-hover:opacity-100" />
              <div className="w-10 h-7 bg-editor-bg rounded flex items-center justify-center shrink-0">
                <Film className="w-4 h-4 text-editor-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white truncate">{media.originalName}</p>
                <p className="text-[10px] text-editor-text-dim">
                  {media.metadata ? formatDuration(media.metadata.duration) : formatSize(media.size)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
