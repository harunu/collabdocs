import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { hocuspocusServer } from './services/hocuspocus';
import documentsRouter from './routes/documents';
import versionsRouter from './routes/versions';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

app.use(express.json());
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Health check — no auth required
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/documents', documentsRouter);
app.use('/api/versions', versionsRouter);

// Global error handler
app.use(errorHandler);

// Single HTTP server for both REST and WebSocket
const httpServer = createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Route WebSocket upgrades at /ws to Hocuspocus
httpServer.on('upgrade', (request, socket, head) => {
  if (request.url?.startsWith('/ws')) {
    wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
      hocuspocusServer.handleConnection(ws, request);
    });
  } else {
    socket.destroy();
  }
});

httpServer.listen(PORT, () => {
  console.log(`[Backend] Server running on port ${PORT} (REST + WebSocket at /ws)`);
});
