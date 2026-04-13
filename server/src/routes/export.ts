import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { exportQueue } from '../queue/queue.js';

const router = Router();

router.post('/', async (req, res) => {
  const { timeline, mediaFiles, settings } = req.body;

  if (!timeline || !settings) {
    res.status(400).json({ error: 'Timeline and settings are required' });
    return;
  }

  try {
    const job = await exportQueue.add('export', { timeline, mediaFiles, settings });
    res.json({ jobId: job.id, status: 'queued' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to queue export job' });
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

    res.json({ jobId: job.id, state, progress, result: job.returnvalue });
  } catch {
    res.status(500).json({ error: 'Failed to get job status' });
  }
});

router.get('/:jobId/download', async (req, res) => {
  try {
    const job = await exportQueue.getJob(req.params.jobId);
    if (!job || !job.returnvalue?.outputPath) {
      res.status(404).json({ error: 'Export not ready' });
      return;
    }

    const filePath = job.returnvalue.outputPath;
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Export file not found' });
      return;
    }

    res.download(filePath, `export_${Date.now()}.mp4`);
  } catch {
    res.status(500).json({ error: 'Download failed' });
  }
});

export { router as exportRouter };
