import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { videoQueue } from '../queue/queue.js';
import type { MediaFile } from '../types/index.js';

const router = Router();
const UPLOAD_DIR = path.resolve('uploads');
const META_DIR = path.resolve('uploads', 'meta');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(META_DIR)) fs.mkdirSync(META_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowed = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB
});

router.post('/', upload.single('video'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No video file uploaded' });
    return;
  }

  const id = path.basename(req.file.filename, path.extname(req.file.filename));
  const mediaFile: MediaFile = {
    id,
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    path: req.file.path,
    createdAt: new Date().toISOString(),
  };

  fs.writeFileSync(path.join(META_DIR, `${id}.json`), JSON.stringify(mediaFile, null, 2));

  try {
    await videoQueue.add('probe', { filePath: req.file.path, mediaId: id });
  } catch {
    // Queue might not be available — metadata will be missing but file is uploaded
  }

  res.json(mediaFile);
});

router.get('/', (_req, res) => {
  if (!fs.existsSync(META_DIR)) {
    res.json([]);
    return;
  }

  const files = fs
    .readdirSync(META_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(META_DIR, f), 'utf-8')));

  res.json(files);
});

router.get('/:id/stream', (req, res) => {
  const metaPath = path.join(META_DIR, `${req.params.id}.json`);
  if (!fs.existsSync(metaPath)) {
    res.status(404).json({ error: 'Media not found' });
    return;
  }

  const media: MediaFile = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  const filePath = media.path;

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'File not found on disk' });
    return;
  }

  const stat = fs.statSync(filePath);
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': 'video/mp4',
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

export { router as uploadRouter };
