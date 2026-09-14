import { WebSocketServer, WebSocket } from 'ws';
import { bedWardEvents } from './bed-ward.events.js';
import { bedWardService } from './bed-ward.service.js';
import { JwtUtils } from '../../utils/jwt.js';
export function attachBedWardWebSocket(server) {
    const wss = new WebSocketServer({ noServer: true });
    server.on('upgrade', (request, socket, head) => {
        try {
            const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
            if (url.pathname !== '/ws/bed-ward')
                return;
            const token = url.searchParams.get('token');
            if (!token) {
                socket.destroy();
                return;
            }
            const claims = JwtUtils.verifyAccessToken(token);
            const hospitalId = claims.hospitalId || claims.accountId || claims.hospital || claims._id || claims.id;
            if (!hospitalId) {
                socket.destroy();
                return;
            }
            wss.handleUpgrade(request, socket, head, (ws) => {
                ws.hospitalId = hospitalId;
                wss.emit('connection', ws, request);
            });
        }
        catch {
            socket.destroy();
        }
    });
    wss.on('connection', async (ws) => {
        const hospitalId = ws.hospitalId;
        if (!hospitalId) {
            ws.close(1008, 'Hospital context missing');
            return;
        }
        ws.send(JSON.stringify({
            type: 'connected',
            channel: 'bed-ward',
            serverTime: new Date().toISOString(),
        }));
        try {
            const [dashboard, beds] = await Promise.all([
                bedWardService.getDashboard(hospitalId),
                bedWardService.getBeds(hospitalId, { page: 1, limit: 500 }),
            ]);
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'bed-ward.snapshot',
                    data: { dashboard, beds: beds.beds },
                }));
            }
        }
        catch (error) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'bed-ward.error',
                    message: error instanceof Error ? error.message : 'Unable to load bed board.',
                }));
            }
        }
    });
    bedWardEvents.on('board.changed', async (event) => {
        const clients = Array.from(wss.clients).filter((client) => client.hospitalId === event.hospitalId &&
            client.readyState === WebSocket.OPEN);
        if (!clients.length)
            return;
        try {
            const [dashboard, beds] = await Promise.all([
                bedWardService.getDashboard(event.hospitalId),
                bedWardService.getBeds(event.hospitalId, { page: 1, limit: 500 }),
            ]);
            const payload = JSON.stringify({
                type: 'bed-ward.snapshot',
                data: { dashboard, beds: beds.beds },
                event,
            });
            clients.forEach((client) => client.send(payload));
        }
        catch (error) {
            const payload = JSON.stringify({
                type: 'bed-ward.changed',
                data: event,
            });
            clients.forEach((client) => client.send(payload));
            console.error('[BedWard WebSocket] Board refresh failed:', error);
        }
    });
    bedWardEvents.on('housekeeping', (event) => {
        const clients = Array.from(wss.clients).filter((client) => client.hospitalId === event.hospitalId &&
            client.readyState === WebSocket.OPEN);
        const payload = JSON.stringify({ type: 'housekeeping.task', data: event });
        clients.forEach((client) => client.send(payload));
    });
}
