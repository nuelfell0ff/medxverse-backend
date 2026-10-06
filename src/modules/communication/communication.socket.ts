import type {
  Server as HttpServer,
  IncomingMessage,
} from 'http';

import type { Duplex } from 'stream';

import {
  WebSocketServer,
  WebSocket,
} from 'ws';

import { JwtUtils } from '../../utils/jwt.js';

import { communicationEvents } from './communication.events.js';

import {
  StaffUser,
  StaffPresenceStatus,
} from '../staff-auth/staff-user.model.js';

interface CommunicationSocket extends WebSocket {
  userId?: string;
  hospitalId?: string;
  isAlive?: boolean;
}

function tokenFromRequest(
  req: IncomingMessage,
): string | null {
  try {
    const url = new URL(
      req.url || '/',
      'http://localhost',
    );

    const token = url.searchParams.get('token');

    return token?.trim() || null;
  } catch {
    return null;
  }
}

function rejectUpgrade(
  socket: Duplex,
  statusCode: number,
  message: string,
): void {
  if (socket.destroyed) {
    return;
  }

  const reason =
    statusCode === 401
      ? 'Unauthorized'
      : statusCode === 403
        ? 'Forbidden'
        : 'Bad Request';

  const body = `${message}\n`;

  socket.write(
    [
      `HTTP/1.1 ${statusCode} ${reason}`,
      'Connection: close',
      'Content-Type: text/plain; charset=utf-8',
      `Content-Length: ${Buffer.byteLength(body)}`,
      '',
      body,
    ].join('\r\n'),
  );

  socket.destroy();
}

/**
 * Attaches the Staff communication WebSocket to the same
 * HTTP server that serves the Express API.
 *
 * WebSocket upgrades must be handled by the actual HTTP
 * server that is listening for requests.
 */
export function attachCommunicationWebSocket(
  server: HttpServer,
): void {
  const wss = new WebSocketServer({
    noServer: true,
  });

  server.on(
    'upgrade',
    (request, socket, head) => {
      console.log(
        '[Communication WebSocket] UPGRADE RECEIVED:',
        request.url,
      );

      let url: URL;

      try {
        url = new URL(
          request.url || '/',
          'http://localhost',
        );
      } catch (error) {
        console.error(
          '[Communication WebSocket] Invalid upgrade URL:',
          error,
        );

        rejectUpgrade(
          socket,
          400,
          'Invalid WebSocket request',
        );

        return;
      }

      /**
       * Let the other WebSocket modules handle
       * their own paths.
       */
      if (
        url.pathname !==
        '/ws/communication'
      ) {
        return;
      }

      console.log(
        '[Communication WebSocket] Communication path matched.',
      );

      try {
        const token = tokenFromRequest(
          request,
        );

        console.log(
          '[Communication WebSocket] Token received:',
          Boolean(token),
        );

        if (!token) {
          console.warn(
            '[Communication WebSocket] Upgrade rejected: missing token',
          );

          rejectUpgrade(
            socket,
            401,
            'Missing access token',
          );

          return;
        }

        const claims =
          JwtUtils.verifyAccessToken(token);

        console.log(
          '[Communication WebSocket] Token verified:',
          {
            userType: claims.userType,
            id: claims.id,
            accountId: claims.accountId,
            hospitalId: claims.hospitalId,
          },
        );

        if (
          claims.userType !== 'STAFF' ||
          !claims.id ||
          !(
            claims.accountId ||
            claims.hospitalId
          )
        ) {
          console.warn(
            '[Communication WebSocket] Upgrade rejected: invalid staff claims',
          );

          rejectUpgrade(
            socket,
            403,
            'Staff authentication required',
          );

          return;
        }

        const userId = String(
          claims.id,
        );

        const hospitalId = String(
          claims.accountId ||
            claims.hospitalId,
        );

        console.log(
          '[Communication WebSocket] Authentication accepted:',
          {
            userId,
            hospitalId,
          },
        );

        console.log(
          '[Communication WebSocket] Accepting WebSocket upgrade...',
        );

        wss.handleUpgrade(
          request,
          socket,
          head,
          (ws) => {
            console.log(
              '[Communication WebSocket] WebSocket upgrade completed.',
            );

            const communicationSocket =
              ws as CommunicationSocket;

            communicationSocket.userId =
              userId;

            communicationSocket.hospitalId =
              hospitalId;

            wss.emit(
              'connection',
              communicationSocket,
              request,
            );
          },
        );
      } catch (error) {
        console.error(
          '[Communication WebSocket] Authentication or upgrade failed:',
          error,
        );

        rejectUpgrade(
          socket,
          401,
          'Invalid or expired access token',
        );
      }
    },
  );

  wss.on(
    'connection',
    async (
      ws: CommunicationSocket,
    ) => {
      console.log(
        '[Communication WebSocket] Connection event received.',
      );

      const userId = ws.userId;
      const hospitalId = ws.hospitalId;

      console.log(
        '[Communication WebSocket] Connection context:',
        {
          userId,
          hospitalId,
        },
      );

      if (!userId || !hospitalId) {
        console.warn(
          '[Communication WebSocket] Closing connection: authentication context missing.',
        );

        ws.close(
          1008,
          'Authentication context missing',
        );

        return;
      }

      /*
       * Use the WebSocket protocol-level heartbeat instead of relying
       * on application JSON messages. The browser automatically replies
       * to server ping frames with pong frames, which is supported by
       * the ws package and by WebSocket-aware proxies.
       */
      ws.isAlive = true;

      const heartbeatTimer = setInterval(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          return;
        }

        if (ws.isAlive === false) {
          console.warn(
            '[Communication WebSocket] Terminating stale connection:',
            {
              userId,
              hospitalId,
            },
          );

          ws.terminate();
          return;
        }

        ws.isAlive = false;

        try {
          ws.ping();
        } catch (error) {
          console.error(
            '[Communication WebSocket] Heartbeat ping failed:',
            error,
          );
        }
      }, 25000);

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      try {
        console.log(
          '[Communication WebSocket] Checking Staff account...',
        );

        const user =
          await StaffUser.findOne({
            _id: userId,
            hospitalId,
            isActive: true,
            status: 'ACTIVE',
          })
            .select('_id')
            .lean()
            .catch(() => null);

        if (!user) {
          console.warn(
            '[Communication WebSocket] Staff account not found or inactive:',
            {
              userId,
              hospitalId,
            },
          );

          clearInterval(heartbeatTimer);

          ws.close(
            1008,
            'Staff account is not active',
          );

          return;
        }

        console.log(
          '[Communication WebSocket] Staff account verified.',
        );

        await StaffUser.updateOne(
          {
            _id: userId,
            hospitalId,
          },
          {
            $set: {
              presenceStatus:
                StaffPresenceStatus.ONLINE,
              lastSeenAt: new Date(),
            },
          },
        );

        console.log(
          '[Communication WebSocket] Staff presence set to ONLINE.',
        );

        const handler = (
          event: any,
        ) => {
          if (
            event.hospitalId !==
            hospitalId
          ) {
            return;
          }

          if (
            event.userIds &&
            !event.userIds.includes(
              userId,
            )
          ) {
            return;
          }

          if (
            ws.readyState !==
            WebSocket.OPEN
          ) {
            return;
          }

          try {
            ws.send(
              JSON.stringify(event),
            );
          } catch (error) {
            console.error(
              '[Communication WebSocket] Failed to send event:',
              error,
            );
          }
        };

        communicationEvents.on(
          'event',
          handler,
        );

        ws.send(
          JSON.stringify({
            type:
              'communication.connected',
            hospitalId,
            userId,
            occurredAt:
              new Date().toISOString(),
          }),
        );

        console.log(
          '[Communication WebSocket] Connected successfully:',
          {
            userId,
            hospitalId,
          },
        );

        let cleanedUp = false;

        const goOffline =
          async () => {
            if (cleanedUp) {
              return;
            }

            cleanedUp = true;

            clearInterval(heartbeatTimer);

            communicationEvents.off(
              'event',
              handler,
            );

            await StaffUser.updateOne(
              {
                _id: userId,
                hospitalId,
              },
              {
                $set: {
                  presenceStatus:
                    StaffPresenceStatus.OFFLINE,
                  lastSeenAt:
                    new Date(),
                },
              },
            ).catch(
              () => undefined,
            );

            console.log(
              '[Communication WebSocket] Staff connection closed:',
              {
                userId,
                hospitalId,
              },
            );
          };

        ws.on(
          'close',
          (code, reason) => {
            console.warn(
              '[Communication WebSocket] CLOSE RECEIVED:',
              {
                userId,
                hospitalId,
                code,
                reason: reason.toString() || 'No reason supplied',
                wasClean: code === 1000,
              },
            );

            void goOffline();
          },
        );

        ws.on(
          'error',
          (error) => {
            console.error(
              '[Communication WebSocket] Socket error:',
              error,
            );

            void goOffline();
          },
        );
      } catch (error) {
        console.error(
          '[Communication WebSocket] Connection initialization failed:',
          error,
        );

        clearInterval(heartbeatTimer);

        ws.close(
          1011,
          'Unable to initialize communication session',
        );
      }
    },
  );

  console.log(
    '[Communication WebSocket] Ready on /ws/communication',
  );
}