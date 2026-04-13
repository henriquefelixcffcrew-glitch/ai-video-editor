import { WebSocketServer, WebSocket } from 'ws';
import { QueueEvents } from 'bullmq';
import type { Server } from 'http';
import type { JobProgress } from './types/index.js';
import { connection } from './queue/queue.js';

let wss: WebSocketServer;

export function setupWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    ws.on('close', () => console.log('WebSocket client disconnected'));
  });

  // Listen to BullMQ export queue events and broadcast progress
  const exportEvents = new QueueEvents('video-export', { connection });

  exportEvents.on('progress', ({ jobId, data }) => {
    broadcast({
      jobId,
      type: 'export',
      progress: typeof data === 'number' ? data : 0,
      status: 'processing',
    });
  });

  exportEvents.on('completed', ({ jobId, returnvalue }) => {
    broadcast({
      jobId,
      type: 'export',
      progress: 100,
      status: 'completed',
      result: returnvalue,
    });
  });

  exportEvents.on('failed', ({ jobId, failedReason }) => {
    broadcast({
      jobId,
      type: 'export',
      progress: 0,
      status: 'failed',
      error: failedReason,
    });
  });

  console.log('WebSocket server + export queue listener active');
}

function broadcast(progress: JobProgress) {
  if (!wss) return;
  const message = JSON.stringify(progress);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export { broadcast as broadcastProgress };
