import { EventEmitter } from 'events';

export const pharmacyEvents = new EventEmitter();

export enum PharmacyEventType {
  PRESCRIPTION_RECEIVED = 'pharmacy.prescription.received',
  SCREENING_COMPLETED = 'pharmacy.screening.completed',
  DISPENSED = 'pharmacy.dispensed',
  STOCK_CHANGED = 'pharmacy.stock.changed',
  LOW_STOCK = 'pharmacy.stock.low',
  CONTROLLED_SUBSTANCE_LOGGED = 'pharmacy.controlled.logged',
}

export function emitPharmacyEvent(type: PharmacyEventType, payload: Record<string, unknown>) {
  pharmacyEvents.emit(type, payload);
}
