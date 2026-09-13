import { EventEmitter } from 'node:events';
import type { BedBoardEvent } from './bed-ward.types.js';

export const bedWardEvents = new EventEmitter();
bedWardEvents.setMaxListeners(1000);

export interface BedHousekeepingEvent {
  hospitalId: string;
  wardId: string;
  bedId: string;
  task: 'CLEANING_REQUIRED' | 'CLEANING_STARTED' | 'CLEANING_COMPLETED';
  occurredAt: string;
  patientId?: string;
}

export const emitBedBoardChanged = (event: BedBoardEvent): void => {
  bedWardEvents.emit('board.changed', event);
};

export const emitHousekeeping = (event: BedHousekeepingEvent): void => {
  bedWardEvents.emit('housekeeping', event);
};
