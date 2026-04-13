import { QueueEvents } from 'bullmq';
import type { AIStrategy, Timeline, MediaFile, TimelineAction } from '../types/index.js';
import { videoQueue, connection } from '../queue/queue.js';

export const cutSilenceStrategy: AIStrategy = {
  name: 'cut-silence',

  match(prompt: string): boolean {
    const patterns = [
      /cut\s*(all\s*)?silen(ce|t)/i,
      /remove\s*(all\s*)?silen(ce|t)/i,
      /delete\s*(all\s*)?silen(ce|t)/i,
      /trim\s*silen(ce|t)/i,
      /cortar?\s*sil[eê]ncio/i,
      /remover?\s*sil[eê]ncio/i,
    ];
    return patterns.some((p) => p.test(prompt));
  },

  async execute(_prompt: string, timeline: Timeline, mediaFiles: MediaFile[]): Promise<TimelineAction[]> {
    const videoTrack = timeline.tracks.find((t) => t.type === 'video');
    if (!videoTrack || videoTrack.clips.length === 0) return [];

    const actions: TimelineAction[] = [];
    const queueEvents = new QueueEvents('video-processing', { connection });

    for (const clip of videoTrack.clips) {
      const media = mediaFiles.find((m) => m.id === clip.mediaId);
      if (!media) continue;

      const job = await videoQueue.add('detect-silence', {
        filePath: media.path,
        threshold: -30,
        minDuration: 0.5,
      });

      const result = await job.waitUntilFinished(queueEvents);

      if (Array.isArray(result)) {
        for (const silence of result) {
          actions.push({
            type: 'cut',
            clipId: clip.id,
            timestamp: silence.start,
            data: { start: silence.start, end: silence.end, duration: silence.duration },
          });
        }
      }
    }

    await queueEvents.close();
    return actions;
  },
};
