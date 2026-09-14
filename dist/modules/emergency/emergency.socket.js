import { WebSocketServer, WebSocket } from 'ws';
import { emergencyEvents } from './emergency.events.js';
import { emergencyService } from './emergency.service.js';
import { JwtUtils } from '../../utils/jwt.js';
export function attachEmergencyWebSocket(server) {
    const wss = new WebSocketServer({ noServer: true });
    server.on('upgrade', (request, socket, head) => {
        try {
            const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
            if (url.pathname !== '/ws/emergency')
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
            channel: 'emergency-board',
            serverTime: new Date().toISOString(),
        }));
        try {
            const board = await emergencyService.getBoard(hospitalId, { page: 1, limit: 100 });
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'board.snapshot', data: board }));
            }
        }
        catch (error) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'board.error', message: error instanceof Error ? error.message : 'Unable to load board.' }));
            }
        }
    });
    emergencyEvents.on('board.changed', async (event) => {
        const clients = Array.from(wss.clients).filter((client) => client.hospitalId === event.hospitalId && client.readyState === WebSocket.OPEN);
        if (!clients.length)
            return;
        try {
            const board = await emergencyService.getBoard(event.hospitalId, { page: 1, limit: 100 });
            const payload = JSON.stringify({ type: 'board.snapshot', data: board, event });
            clients.forEach((client) => client.send(payload));
        }
        catch (error) {
            const payload = JSON.stringify({ type: 'board.changed', data: event });
            clients.forEach((client) => client.send(payload));
            console.error('[Emergency WebSocket] Board refresh failed:', error);
        }
    });
}
