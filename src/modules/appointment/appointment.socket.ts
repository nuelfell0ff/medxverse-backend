import { IncomingMessage } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { appointmentEvents } from './appointment.events.js';

interface SocketWithHospital extends WebSocket { hospitalId?: string; }
export type AppointmentSocketAuthenticator = (req: IncomingMessage, token: string) => Promise<string | null> | string | null;

function tokenFromRequest(req: IncomingMessage): string | null {
  return new URL(req.url || '/', 'http://localhost').searchParams.get('token');
}

/**
 * Attach the appointment live stream to the application's HTTP server.
 * The authenticator must verify the same JWT/session used by Express auth and return hospitalId.
 */
export function attachAppointmentSocket(server: any, authenticateSocket: AppointmentSocketAuthenticator) {
  const wss = new WebSocketServer({ server, path: '/ws/appointments' });
  wss.on('connection', async (ws: SocketWithHospital, req: IncomingMessage) => {
    const token = tokenFromRequest(req);
    if (!token) { ws.close(1008, 'Authentication token required'); return; }
    let hospitalId: string | null = null;
    try { hospitalId = await authenticateSocket(req, token); } catch { ws.close(1008, 'Authentication failed'); return; }
    if (!hospitalId) { ws.close(1008, 'Authentication failed'); return; }
    ws.hospitalId = hospitalId;
    const handler=(event:any)=>{ if(event.hospitalId===hospitalId && ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify(event)); };
    appointmentEvents.on('event',handler);
    ws.send(JSON.stringify({type:'appointment.connected',hospitalId,occurredAt:new Date().toISOString()}));
    ws.on('close',()=>appointmentEvents.off('event',handler));
  });
  return wss;
}
