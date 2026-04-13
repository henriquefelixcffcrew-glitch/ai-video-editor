import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { exportQueue } from '../queue/queue.js';
import type { MediaFile } from '../types/index.js';

const router = Router();
const META_DIR = path.resolve('uploads', 'meta');

function resolveMediaFiles(mediaIds: string[]): MediaFile[] {
  return mediaIds
    .map((id) => {
      const metaPath = path.join(META_DIR, `${id}.json`);
      if (!fs.existsSync(metaPath)) return null;
      return JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as MediaFile;
    })
    .filter((m): m is MediaFile => m !== null);
}

function extractMediaIds(timeline: any): string[] {
  const ids = new Set<string>();
  for (const track of timeline.tracks ?? []) {
    for (const clip of track.clips ?? []) {
      if (clip.mediaId) ids.add(clip.mediaId);
    }
  }
  return [...ids];
}

router.post('/', async (req, res) => {
  const { timeline, settings } = req.body;

  if (!timeline || !settings) {
    res.status(400).json({ error: 'Timeline and settings are required' });
    return;
  }

  const videoTrack = timeline.tracks?.find((t: any) => t.type === 'video');
  if (!videoTrack || !videoTrack.clips?.length) {
    res.status(400).json({ error: 'Timeline has no video clips to export' });
    return;
  }

  // Resolve media files from server metadata — never trust frontend paths
  const mediaIds = extractMediaIds(timeline);
  const mediaFiles = resolveMediaFiles(mediaIds);

  if (mediaFiles.length === 0) {
    res.status(400).json({ error: 'No valid media files found for export' });
    return;
  }

  // Verify all files exist on disk
  const missing = mediaFiles.filter((m) => !fs.existsSync(m.path));
  if (missing.length > 0) {
    res.status(400).json({
      error: `Missing source files: ${missing.map((m) => m.originalName).join(', ')}`,
    });
    return;
  }

  try {
    const job = await exportQueue.add('export', { timeline, mediaFiles, settings });
    res.json({ jobId: job.id, status: 'queued' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to queue export job. Is Redis running?' });
  }
});

router.get('/:jobId/status', async (req, res) => {
  try {
    const job = await exportQueue.getJob(req.params.jobId);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const state = await job.getState();
    const progress = job.progress;

    res.json({
      jobId: job.id,
      state,
      progress: typeof progress === 'number' ? progress : 0,
      result: job.returnvalue,
      failedReason: job.failedReason,
    });
  } catch {
    res.status(500).json({ error: 'Failed to get job status' });
  }
});

router.get('/:jobId/download', async (req, res) => {
  try {
    const job = await exportQueue.getJob(req.params.jobId);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const state = await job.getState();
    if (state !== 'completed' || !job.returnvalue?.outputPath) {
      res.status(400).json({ error: 'Export not ready yet', state });
      return;
    }

    const filePath = job.returnvalue.outputPath;
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Export file not found on disk' });
      return;
    }

    const stat = fs.statSync(filePath);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="export_${job.id}.mp4"`);
    fs.createReadStream(filePath).pipe(res);
  } catch {
    res.status(500).json({ error: 'Download failed' });
  }
});

export { router as exportRouter };
