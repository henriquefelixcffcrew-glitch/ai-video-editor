import { Router } from 'express';
import { executePrompt } from '../services/aiEngine.js';
import type { MediaFile } from '../types/index.js';
import fs from 'fs';
import path from 'path';

const router = Router();
const META_DIR = path.resolve('uploads', 'meta');

function loadMediaFiles(ids: string[]): MediaFile[] {
  return ids
    .map((id) => {
      const metaPath = path.join(META_DIR, `${id}.json`);
      if (!fs.existsSync(metaPath)) return null;
      return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    })
    .filter(Boolean) as MediaFile[];
}

router.post('/execute', async (req, res) => {
  const { prompt, timeline, mediaIds } = req.body;

  if (!prompt || !timeline) {
    res.status(400).json({ error: 'Prompt and timeline are required' });
    return;
  }

  try {
    const mediaFiles = loadMediaFiles(mediaIds ?? []);
    const result = await executePrompt(prompt, timeline, mediaFiles);

    if (!result) {
      res.json({
        success: false,
        message: 'No matching strategy found for this prompt. Try: "cut silence", "remove silence"',
      });
      return;
    }

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: 'AI execution failed', details: String(err) });
  }
});

export { router as aiRouter };
