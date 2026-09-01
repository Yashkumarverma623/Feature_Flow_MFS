import { Request, Response } from 'express';

interface Client {
  id: string;
  res: Response;
}

let clients: Client[] = [];

export const handleSseConnection = (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newClient: Client = { id: clientId, res };

  clients.push(newClient);

  // Send initial ping
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId })}\n\n`);

  req.on('close', () => {
    clients = clients.filter(c => c.id !== clientId);
  });
};

export const broadcastSseEvent = (eventType: 'FLAG_UPDATED' | 'FLAG_CREATED' | 'FLAG_DELETED' | 'EXPERIMENT_UPDATED', payload: any) => {
  const message = `data: ${JSON.stringify({ type: eventType, payload, timestamp: new Date().toISOString() })}\n\n`;
  clients.forEach(client => {
    try {
      client.res.write(message);
    } catch (err) {
      console.warn(`[SSE] Failed to write event to client ${client.id}`);
    }
  });
};
