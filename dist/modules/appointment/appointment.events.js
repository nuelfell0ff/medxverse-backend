import { EventEmitter } from 'node:events';
export const appointmentEvents = new EventEmitter();
appointmentEvents.setMaxListeners(0);
export function publishAppointmentEvent(type, hospitalId, payload) {
    appointmentEvents.emit('event', { type, hospitalId, payload, occurredAt: new Date().toISOString() });
}
