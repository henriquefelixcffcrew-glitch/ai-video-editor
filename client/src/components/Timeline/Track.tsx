import type { Track as TrackType } from '../../types';
import { Clip } from './Clip';
import { Film, Volume2 } from 'lucide-react';

interface Props {
  track: TrackType;
  pixelsPerSecond: number;
}

export function Track({ track, pixelsPerSecond }: Props) {
  const Icon = track.type === 'video' ? Film : Volume2;

  return (
    <div className="flex h-14 border-b border-editor-border">
      {/* Track label */}
      <div className="w-24 shrink-0 bg-editor-panel border-r border-editor-border flex items-center gap-2 px-3">
        <Icon className="w-3.5 h-3.5 text-editor-text-dim" />
        <span className="text-[11px] text-editor-text-dim uppercase font-medium">
          {track.type === 'video' ? 'Video' : 'Audio'}
        </span>
      </div>

      {/* Track content */}
      <div className="flex-1 relative bg-editor-surface">
        {track.clips.map((clip) => (
          <Clip key={clip.id} clip={clip} pixelsPerSecond={pixelsPerSecond} />
        ))}
      </div>
    </div>
  );
}
