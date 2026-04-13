import { useRef, useEffect, useCallback } from 'react';
import { useTimelineStore } from '../../stores/timelineStore';
import { useProjectStore } from '../../stores/projectStore';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

export function PreviewPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { playheadPosition, setPlayheadPosition, isPlaying, setIsPlaying, timeline } = useTimelineStore();
  const { mediaFiles } = useProjectStore();

  // Find clip at current playhead position
  const videoTrack = timeline.tracks.find((t) => t.type === 'video');
  const currentClip = videoTrack?.clips.find(
    (c) => playheadPosition >= c.startTime && playheadPosition < c.endTime
  );
  const currentMedia = currentClip ? mediaFiles.find((m) => m.id === currentClip.mediaId) : null;

  const videoSrc = currentMedia ? `/api/upload/${currentMedia.id}/stream` : '';

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentClip) return;

    const mediaTime = currentClip.inPoint + (playheadPosition - currentClip.startTime);
    if (Math.abs(video.currentTime - mediaTime) > 0.5) {
      video.currentTime = mediaTime;
    }
  }, [playheadPosition, currentClip]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !currentClip || !isPlaying) return;

    const newPos = currentClip.startTime + (video.currentTime - currentClip.inPoint);
    setPlayheadPosition(newPos);

    if (video.currentTime >= currentClip.outPoint) {
      // Move to next clip
      const videoTrack = useTimelineStore.getState().timeline.tracks.find((t) => t.type === 'video');
      const clips = videoTrack?.clips.filter((c) => c.startTime > currentClip.startTime).sort((a, b) => a.startTime - b.startTime);
      if (clips && clips.length > 0) {
        setPlayheadPosition(clips[0].startTime);
      } else {
        setIsPlaying(false);
      }
    }
  }, [currentClip, isPlaying, setPlayheadPosition, setIsPlaying]);

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 100);
    return `${min}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col bg-editor-bg">
      {/* Video area */}
      <div className="flex-1 flex items-center justify-center bg-black min-h-0">
        {videoSrc ? (
          <video
            ref={videoRef}
            src={videoSrc}
            className="max-w-full max-h-full"
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
          />
        ) : (
          <div className="text-editor-text-dim text-sm">
            Add a clip to the timeline to preview
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="h-10 bg-editor-panel border-t border-editor-border flex items-center justify-center gap-4 px-4 shrink-0">
        <button
          onClick={() => setPlayheadPosition(0)}
          className="p-1 text-editor-text-dim hover:text-white transition-colors"
        >
          <SkipBack className="w-4 h-4" />
        </button>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-2 bg-editor-accent hover:bg-editor-accent-hover rounded-full text-white transition-colors"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button
          onClick={() => setPlayheadPosition(timeline.duration)}
          className="p-1 text-editor-text-dim hover:text-white transition-colors"
        >
          <SkipForward className="w-4 h-4" />
        </button>
        <span className="text-xs text-editor-text-dim font-mono ml-4">
          {formatTime(playheadPosition)} / {formatTime(timeline.duration)}
        </span>
      </div>
    </div>
  );
}
