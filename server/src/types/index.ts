export interface MediaFile {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  metadata?: VideoMetadata;
  createdAt: string;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  audioCodec?: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  timeline: Timeline;
  mediaIds: string[];
}

export interface Timeline {
  tracks: Track[];
  duration: number;
}

export interface Track {
  id: string;
  type: 'video' | 'audio';
  clips: Clip[];
}

export interface Clip {
  id: string;
  mediaId: string;
  trackId: string;
  startTime: number;
  endTime: number;
  inPoint: number;
  outPoint: number;
  duration: number;
}

export interface TimelineAction {
  type: 'cut' | 'delete' | 'split' | 'move' | 'insert';
  clipId?: string;
  timestamp?: number;
  data?: Record<string, unknown>;
}

export interface AIStrategy {
  name: string;
  match(prompt: string): boolean;
  execute(prompt: string, timeline: Timeline, mediaFiles: MediaFile[]): Promise<TimelineAction[]>;
}

export interface ExportSettings {
  resolution: '720p' | '1080p' | '4k';
  fps: number;
  quality: 'low' | 'medium' | 'high';
  format: 'mp4';
}

export interface JobProgress {
  jobId: string;
  type: string;
  progress: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
}
