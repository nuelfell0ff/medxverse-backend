import { WebSocketServer, WebSocket } from 'ws';
import { appointmentEvents } from './appointment.events.js';
import { JwtUtils } from '../../utils/jwt.js';
function tokenFromRequest(req) {
    return new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`).searchParams.get('token');
}
/**
 * Appointment WebSocket authentication mirrors the working Emergency socket:
 * verify the same access JWT and derive the hospital/account scope server-side.
 *
 * noServer=true is intentional because the application has multiple WebSocket
 * channels on the same HTTP server. Each channel owns only its own upgrade path.
 */
export function attachAppointmentWebSocket(server) {
    const wss = new WebSocketServer({ noServer: true });
    server.on('upgrade', (request, socket, head) => {
        try {
            const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
            if (url.pathname !== '/ws/appointments')
                return;
            const token = tokenFromRequest(request);
            if (!token) {
                socket.destroy();
                return;
            }
            const claims = JwtUtils.verifyAccessToken(token);
            const hospitalId = claims.accountId || claims.hospitalId || claims.hospital || claims._id || claims.id;
            if (!hospitalId) {
                socket.destroy();
                return;
            }
            wss.handleUpgrade(request, socket, head, (ws) => {
                ws.hospitalId = hospitalId;
                wss.emit('connection', ws, request);
            });
        }
        catch (error) {
            console.error('[Appointment WebSocket] Authentication failed:', error);
            socket.destroy();
        }
    });
    wss.on('connection', (ws) => {
        const hospitalId = ws.hospitalId;
        if (!hospitalId) {
            ws.close(1008, 'Hospital context missing');
            return;
        }
        const handler = (event) => {
            if (event?.hospitalId === hospitalId && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(event));
            }
        };
        appointmentEvents.on('event', handler);
        ws.send(JSON.stringify({
            type: 'appointment.connected',
            channel: 'appointments',
            hospitalId,
            occurredAt: new Date().toISOString(),
        }));
        ws.on('close', () => appointmentEvents.off('event', handler));
        ws.on('error', () => appointmentEvents.off('event', handler));
    });
    console.log('[Appointment WebSocket] Listening on /ws/appointments');
}
// Backward-compatible alias for any existing imports.
export const attachAppointmentSocket = attachAppointmentWebSocket;
