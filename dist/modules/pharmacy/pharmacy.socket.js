import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { pharmacyEvents } from './pharmacy.events.js';
export function attachPharmacyWebSocket(server) {
    const wss = new WebSocketServer({ noServer: true });
    server.on('upgrade', (req, socket, head) => {
        const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
        if (url.pathname !== '/ws/pharmacy')
            return;
        const token = url.searchParams.get('token');
        if (!token) {
            socket.destroy();
            return;
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
            const hospitalId = decoded.accountId || decoded.hospitalId || decoded.hospital || decoded._id || decoded.id;
            if (!hospitalId) {
                socket.destroy();
                return;
            }
            wss.handleUpgrade(req, socket, head, ws => {
                ws.hospitalId = String(hospitalId);
                ws.send(JSON.stringify({ type: 'pharmacy.connected', hospitalId: String(hospitalId) }));
            });
        }
        catch {
            socket.destroy();
        }
    });
    const broadcast = (type, payload) => {
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN && String(client.hospitalId) === String(payload?.hospitalId)) {
                client.send(JSON.stringify({ type, payload, timestamp: new Date().toISOString() }));
            }
        });
    };
    for (const event of pharmacyEvents.eventNames()) {
        pharmacyEvents.on(event, payload => broadcast(String(event), payload));
    }
    return wss;
}
