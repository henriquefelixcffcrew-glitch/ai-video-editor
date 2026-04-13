import { useProjectStore } from '../../stores/projectStore';
import { useTimelineStore } from '../../stores/timelineStore';
import type { Clip as ClipType } from '../../types';

interface Props {
  clip: ClipType;
  pixelsPerSecond: number;
}

const CLIP_COLORS = [
  'bg-indigo-600/80',
  'bg-purple-600/80',
  'bg-blue-600/80',
  'bg-teal-600/80',
  'bg-emerald-600/80',
  'bg-amber-600/80',
];

export function Clip({ clip, pixelsPerSecond }: Props) {
  const { selectedClipId, setSelectedClip, setPlayheadPosition } = useTimelineStore();
  const { mediaFiles } = useProjectStore();

  const media = mediaFiles.find((m) => m.id === clip.mediaId);
  const isSelected = selectedClipId === clip.id;
  const colorIndex = clip.mediaId.charCodeAt(0) % CLIP_COLORS.length;

  const left = clip.startTime * pixelsPerSecond;
  const width = Math.max(clip.duration * pixelsPerSecond, 4);

  return (
    <div
      className={`absolute top-1 bottom-1 rounded cursor-pointer transition-all ${CLIP_COLORS[colorIndex]} ${
        isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-editor-surface' : 'hover:brightness-110'
      }`}
      style={{ left: `${left}px`, width: `${width}px` }}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedClip(clip.id);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setPlayheadPosition(clip.startTime);
      }}
    >
      <div className="px-2 py-0.5 overflow-hidden h-full flex flex-col justify-center">
        <p className="text-[10px] text-white font-medium truncate">
          {media?.originalName ?? 'Unknown'}
        </p>
        <p className="text-[9px] text-white/60 truncate">
          {clip.duration.toFixed(1)}s
        </p>
      </div>

      {/* Trim handles */}
      {isSelected && (
        <>
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-white/40 hover:bg-white/70 cursor-col-resize rounded-l" />
          <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-white/40 hover:bg-white/70 cursor-col-resize rounded-r" />
        </>
      )}
    </div>
  );
}
