import { useCallback, useRef } from 'react';
import { useTimelineStore } from '../../stores/timelineStore';
import { useProjectStore } from '../../stores/projectStore';
import { Track } from './Track';
import { ZoomIn, ZoomOut, Scissors, Trash2, Undo2, Redo2 } from 'lucide-react';
import type { Clip as ClipType, MediaFile } from '../../types';

function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

export function Timeline() {
  const {
    timeline, playheadPosition, setPlayheadPosition, zoom, setZoom,
    selectedClipId, splitClipAtPlayhead, removeClip, undo, redo,
    setSelectedClip, addClipToTrack,
  } = useTimelineStore();
  const { mediaFiles } = useProjectStore();
  const trackAreaRef = useRef<HTMLDivElement>(null);

  const pixelsPerSecond = 50 * zoom;
  const totalWidth = Math.max(timeline.duration * pixelsPerSecond + 200, 800);

  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    if (!trackAreaRef.current) return;
    const rect = trackAreaRef.current.getBoundingClientRect();
    const scrollLeft = trackAreaRef.current.scrollLeft;
    const x = e.clientX - rect.left + scrollLeft - 96; // 96 = track label width (w-24 = 6rem = 96px)
    const time = Math.max(0, x / pixelsPerSecond);
    setPlayheadPosition(time);
    setSelectedClip(null);
  }, [pixelsPerSecond, setPlayheadPosition, setSelectedClip]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const mediaId = e.dataTransfer.getData('application/media-id');
    if (!mediaId) return;

    const media = mediaFiles.find((m) => m.id === mediaId);
    if (!media) return;

    const videoTrack = timeline.tracks.find((t) => t.type === 'video');
    if (!videoTrack) return;

    const lastClipEnd = Math.max(0, ...videoTrack.clips.map((c) => c.endTime));
    const duration = media.metadata?.duration ?? 10;

    const clip: ClipType = {
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
  }, [mediaFiles, timeline, addClipToTrack]);

  // Time ruler ticks
  const ticks = [];
  const tickInterval = zoom >= 2 ? 1 : zoom >= 0.5 ? 5 : 10;
  for (let t = 0; t <= timeline.duration + 10; t += tickInterval) {
    ticks.push(t);
  }

  return (
    <div className="h-full flex flex-col bg-editor-panel">
      {/* Toolbar */}
      <div className="h-8 flex items-center gap-1 px-2 border-b border-editor-border shrink-0">
        <button onClick={() => setZoom(zoom * 1.2)} className="p-1 text-editor-text-dim hover:text-white" title="Zoom In">
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setZoom(zoom / 1.2)} className="p-1 text-editor-text-dim hover:text-white" title="Zoom Out">
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-editor-border mx-1" />
        <button
          onClick={splitClipAtPlayhead}
          disabled={!selectedClipId}
          className="p-1 text-editor-text-dim hover:text-white disabled:opacity-30"
          title="Split (S)"
        >
          <Scissors className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => selectedClipId && removeClip(selectedClipId)}
          disabled={!selectedClipId}
          className="p-1 text-editor-text-dim hover:text-red-400 disabled:opacity-30"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-editor-border mx-1" />
        <button onClick={undo} className="p-1 text-editor-text-dim hover:text-white" title="Undo (Ctrl+Z)">
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={redo} className="p-1 text-editor-text-dim hover:text-white" title="Redo (Ctrl+Shift+Z)">
          <Redo2 className="w-3.5 h-3.5" />
        </button>
        <div className="flex-1" />
        <span className="text-[10px] text-editor-text-dim font-mono">
          {zoom.toFixed(1)}x
        </span>
      </div>

      {/* Timeline area */}
      <div
        ref={trackAreaRef}
        className="flex-1 overflow-x-auto overflow-y-hidden relative"
        onClick={handleTrackClick}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {/* Time ruler */}
        <div className="h-5 bg-editor-bg border-b border-editor-border relative" style={{ width: totalWidth }}>
          <div className="ml-24">
            {ticks.map((t) => (
              <div
                key={t}
                className="absolute top-0 bottom-0 flex flex-col items-center"
                style={{ left: `${t * pixelsPerSecond + 96}px` }}
              >
                <div className="w-px h-2 bg-editor-border" />
                <span className="text-[9px] text-editor-text-dim">{t}s</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tracks */}
        <div style={{ width: totalWidth }}>
          {timeline.tracks.map((track) => (
            <Track key={track.id} track={track} pixelsPerSecond={pixelsPerSecond} />
          ))}
        </div>

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-10"
          style={{ left: `${playheadPosition * pixelsPerSecond + 96}px` }}
        >
          <div className="w-3 h-3 bg-red-500 -ml-[5px] -mt-0.5 rotate-45 rounded-sm" />
        </div>
      </div>
    </div>
  );
}
