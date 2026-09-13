import { EventEmitter } from 'node:events';

export type AppointmentEventType =
  | 'appointment.created'
  | 'appointment.updated'
  | 'appointment.cancelled'
  | 'queue.updated'
  | 'queue.ticket.created'
  | 'queue.ticket.updated'
  | 'provider.delay.updated'
  | 'reminder.scheduled';

export interface AppointmentEvent {
  type: AppointmentEventType;
  hospitalId: string;
  payload: unknown;
  occurredAt: string;
}

export const appointmentEvents = new EventEmitter();
appointmentEvents.setMaxListeners(0);

export function publishAppointmentEvent(type: AppointmentEventType, hospitalId: string, payload: unknown) {
  appointmentEvents.emit('event', { type, hospitalId, payload, occurredAt: new Date().toISOString() } satisfies AppointmentEvent);
}
