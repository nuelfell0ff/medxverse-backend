import type { Server as HttpServer, IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import { WebSocketServer, WebSocket } from 'ws';
import { JwtUtils } from '../../utils/jwt.js';
import { communicationEvents } from './communication.events.js';
import { StaffUser, StaffPresenceStatus } from '../staff-auth/staff-user.model.js';

interface CommunicationSocket extends WebSocket {
  userId?: string;
  hospitalId?: string;
  isAlive?: boolean;
}

const HEARTBEAT_INTERVAL_MS = 25000;

// Multiple browser tabs/devices can belong to the same Staff account.
// Presence must only become OFFLINE after the last socket disappears.
const activeSockets = new Map<string, Set<CommunicationSocket>>();

function tokenFromRequest(req: IncomingMessage): string | null {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    return url.searchParams.get('token')?.trim() || null;
  } catch {
    return null;
  }
}

function rejectUpgrade(socket: Duplex, statusCode: number, message: string): void {
  if (socket.destroyed) return;

  const reason =
    statusCode === 401 ? 'Unauthorized' :
    statusCode === 403 ? 'Forbidden' :
    'Bad Request';
  const body = `${message}\n`;

  socket.write([
    `HTTP/1.1 ${statusCode} ${reason}`,
    'Connection: close',
    'Content-Type: text/plain; charset=utf-8',
    `Content-Length: ${Buffer.byteLength(body)}`,
    '',
    body,
  ].join('\r\n'));

  socket.destroy();
}

function socketKey(hospitalId: string, userId: string): string {
  return `${hospitalId}:${userId}`;
}

function addActiveSocket(socket: CommunicationSocket): number {
  const key = socketKey(socket.hospitalId!, socket.userId!);
  let sockets = activeSockets.get(key);

  if (!sockets) {
    sockets = new Set();
    activeSockets.set(key, sockets);
  }

  sockets.add(socket);
  return sockets.size;
}

function removeActiveSocket(socket: CommunicationSocket): number {
  const key = socketKey(socket.hospitalId!, socket.userId!);
  const sockets = activeSockets.get(key);

  if (!sockets) return 0;

  sockets.delete(socket);

  if (sockets.size === 0) {
    activeSockets.delete(key);
    return 0;
  }

  return sockets.size;
}

export function attachCommunicationWebSocket(server: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    console.log('[Communication WebSocket] UPGRADE RECEIVED:', request.url);

    let url: URL;

    try {
      url = new URL(request.url || '/', 'http://localhost');
    } catch (error) {
      console.error('[Communication WebSocket] Invalid upgrade URL:', error);
      rejectUpgrade(socket, 400, 'Invalid WebSocket request');
      return;
    }

    if (url.pathname !== '/ws/communication') return;

    console.log('[Communication WebSocket] Communication path matched.');

    try {
      const token = tokenFromRequest(request);
      console.log('[Communication WebSocket] Token received:', Boolean(token));

      if (!token) {
        rejectUpgrade(socket, 401, 'Missing access token');
        return;
      }

      const claims = JwtUtils.verifyAccessToken(token);

      console.log('[Communication WebSocket] Token verified:', {
        userType: claims.userType,
        id: claims.id,
        accountId: claims.accountId,
        hospitalId: claims.hospitalId,
      });

      if (
        claims.userType !== 'STAFF' ||
        !claims.id ||
        !(claims.accountId || claims.hospitalId)
      ) {
        rejectUpgrade(socket, 403, 'Staff authentication required');
        return;
      }

      const userId = String(claims.id);
      const hospitalId = String(claims.accountId || claims.hospitalId);

      console.log('[Communication WebSocket] Authentication accepted:', {
        userId,
        hospitalId,
      });

      wss.handleUpgrade(request, socket, head, (ws) => {
        const communicationSocket = ws as CommunicationSocket;
        communicationSocket.userId = userId;
        communicationSocket.hospitalId = hospitalId;
        communicationSocket.isAlive = true;

        console.log('[Communication WebSocket] WebSocket upgrade completed.');
        wss.emit('connection', communicationSocket, request);
      });
    } catch (error) {
      console.error('[Communication WebSocket] Authentication or upgrade failed:', error);
      rejectUpgrade(socket, 401, 'Invalid or expired access token');
    }
  });

  wss.on('connection', async (ws: CommunicationSocket) => {
    const userId = ws.userId;
    const hospitalId = ws.hospitalId;

    console.log('[Communication WebSocket] Connection event received.');
    console.log('[Communication WebSocket] Connection context:', { userId, hospitalId });

    if (!userId || !hospitalId) {
      ws.close(1008, 'Authentication context missing');
      return;
    }

    let cleanedUp = false;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let eventHandler: ((event: any) => void) | null = null;

    const goOffline = async (source: string) => {
      if (cleanedUp) return;
      cleanedUp = true;

      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }

      if (eventHandler) {
        communicationEvents.off('event', eventHandler);
        eventHandler = null;
      }

      const remaining = removeActiveSocket(ws);

      console.warn('[Communication WebSocket] CLOSE RECEIVED:', {
        userId,
        hospitalId,
        source,
        remainingConnections: remaining,
        readyState: ws.readyState,
      });

      if (remaining === 0) {
        await StaffUser.updateOne(
          { _id: userId, hospitalId },
          {
            $set: {
              presenceStatus: StaffPresenceStatus.OFFLINE,
              lastSeenAt: new Date(),
            },
          },
        ).catch(() => undefined);

        console.log('[Communication WebSocket] Staff presence set to OFFLINE:', {
          userId,
          hospitalId,
        });
      }
    };

    // Register these immediately. This prevents an abrupt disconnect during
    // account verification from bypassing cleanup.
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('close', (code, reason) => {
      console.warn('[Communication WebSocket] CLOSE RECEIVED:', {
        userId,
        hospitalId,
        code,
        reason: reason.toString() || 'No reason supplied',
        wasClean: code !== 1006,
      });
      void goOffline('close');
    });

    ws.on('error', (error) => {
      console.error('[Communication WebSocket] Socket error:', {
        userId,
        hospitalId,
        error,
      });
      void goOffline('error');
    });

    try {
      console.log('[Communication WebSocket] Checking Staff account...');

      const user = await StaffUser.findOne({
        _id: userId,
        hospitalId,
        isActive: true,
        status: 'ACTIVE',
      }).select('_id').lean().catch(() => null);

      if (!user) {
        console.warn('[Communication WebSocket] Staff account not found or inactive:', {
          userId,
          hospitalId,
        });
        ws.close(1008, 'Staff account is not active');
        return;
      }

      console.log('[Communication WebSocket] Staff account verified.');

      const connectionCount = addActiveSocket(ws);

      await StaffUser.updateOne(
        { _id: userId, hospitalId },
        {
          $set: {
            presenceStatus: StaffPresenceStatus.ONLINE,
            lastSeenAt: new Date(),
          },
        },
      );

      console.log('[Communication WebSocket] Staff presence set to ONLINE:', {
        userId,
        hospitalId,
        activeConnections: connectionCount,
      });

      eventHandler = (event: any) => {
        if (event.hospitalId !== hospitalId) return;
        if (event.userIds && !event.userIds.includes(userId)) return;
        if (ws.readyState !== WebSocket.OPEN) return;

        try {
          ws.send(JSON.stringify(event));
        } catch (error) {
          console.error('[Communication WebSocket] Failed to send event:', error);
        }
      };

      communicationEvents.on('event', eventHandler);

      ws.send(JSON.stringify({
        type: 'communication.connected',
        hospitalId,
        userId,
        occurredAt: new Date().toISOString(),
      }));

      // Real WebSocket protocol heartbeat. Browsers automatically answer
      // protocol ping frames with pong frames; no application JSON ping is needed.
      heartbeatTimer = setInterval(() => {
        if (ws.readyState !== WebSocket.OPEN) return;

        if (ws.isAlive === false) {
          console.warn('[Communication WebSocket] Heartbeat timeout; terminating socket:', {
            userId,
            hospitalId,
          });
          ws.terminate();
          return;
        }

        ws.isAlive = false;
        ws.ping();
      }, HEARTBEAT_INTERVAL_MS);

      console.log('[Communication WebSocket] Connected successfully:', {
        userId,
        hospitalId,
      });
    } catch (error) {
      console.error('[Communication WebSocket] Connection initialization failed:', error);
      ws.close(1011, 'Unable to initialize communication session');
    }
  });

  console.log('[Communication WebSocket] Ready on /ws/communication');
}
