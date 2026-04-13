import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { JobProgress } from './types/index.js';

let wss: WebSocketServer;

export function setupWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    ws.on('close', () => console.log('WebSocket client disconnected'));
  });
}

export function broadcastProgress(progress: JobProgress) {
  if (!wss) return;
  const message = JSON.stringify(progress);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
