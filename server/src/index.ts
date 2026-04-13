import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer } from 'http';
import { setupWebSocket } from './websocket.js';
import { uploadRouter } from './routes/upload.js';
import { projectRouter } from './routes/project.js';
import { exportRouter } from './routes/export.js';
import { aiRouter } from './routes/ai.js';

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(path.resolve('uploads')));

app.use('/api/upload', uploadRouter);
app.use('/api/projects', projectRouter);
app.use('/api/export', exportRouter);
app.use('/api/ai', aiRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
