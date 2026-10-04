import type { Server as HttpServer, IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { JwtUtils } from '../../utils/jwt.js';
import { communicationEvents } from './communication.events.js';
import { StaffUser, StaffPresenceStatus } from '../staff-auth/staff-user.model.js';

interface CommunicationSocket extends WebSocket {
  userId?: string;
  hospitalId?: string;
}

function tokenFromRequest(req: IncomingMessage): string | null {
  return new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`).searchParams.get('token');
}

export function attachCommunicationWebSocket(server: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    try {
      const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
      if (url.pathname !== '/ws/communication') return;

      const token = tokenFromRequest(request);
      if (!token) { socket.destroy(); return; }

      const claims: any = JwtUtils.verifyAccessToken(token);
      if (claims.userType !== 'STAFF' || !claims.accountId || !claims.id) { socket.destroy(); return; }

      wss.handleUpgrade(request, socket, head, (ws) => {
        (ws as CommunicationSocket).userId = claims.id;
        (ws as CommunicationSocket).hospitalId = claims.accountId;
        wss.emit('connection', ws, request);
      });
    } catch (error) {
      console.error('[Communication WebSocket] Authentication failed:', error);
      socket.destroy();
    }
  });

  wss.on('connection', async (ws: CommunicationSocket) => {
    const userId = ws.userId;
    const hospitalId = ws.hospitalId;
    if (!userId || !hospitalId) { ws.close(1008, 'Authentication context missing'); return; }

    const user = await StaffUser.findOne({ _id: userId, hospitalId, isActive: true, status: 'ACTIVE' }).select('_id').lean().catch(() => null);
    if (!user) { ws.close(1008, 'Staff account is not active'); return; }

    await StaffUser.updateOne({ _id: userId, hospitalId }, { $set: { presenceStatus: StaffPresenceStatus.ONLINE, lastSeenAt: new Date() } });

    const handler = (event: any) => {
      if (event.hospitalId !== hospitalId) return;
      if (event.userIds && !event.userIds.includes(userId)) return;
      if (ws.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify(event));
    };

    communicationEvents.on('event', handler);

    ws.send(JSON.stringify({
      type: 'communication.connected',
      hospitalId,
      userId,
      occurredAt: new Date().toISOString(),
    }));

    const goOffline = async () => {
      communicationEvents.off('event', handler);
      await StaffUser.updateOne({ _id: userId, hospitalId }, { $set: { presenceStatus: StaffPresenceStatus.OFFLINE, lastSeenAt: new Date() } }).catch(() => undefined);
    };
    ws.on('close', () => { void goOffline(); });
    ws.on('error', () => { void goOffline(); });
  });

  console.log('[Communication WebSocket] Listening on /ws/communication');
}
