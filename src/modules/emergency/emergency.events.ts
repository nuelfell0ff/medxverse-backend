import { EventEmitter } from 'node:events';

export interface EmergencyBoardChangedEvent {
  hospitalId: string;
  event: string;
  visitId?: string;
  occurredAt: string;
}

export interface EmergencyWorkflowEvent {
  hospitalId: string;
  visitId: string;
  dispositionId: string;
  workflow: 'BED_MANAGEMENT' | 'DISCHARGE_PLANNING' | 'REFERRAL';
  patientId?: string;
}

export const emergencyEvents = new EventEmitter();
emergencyEvents.setMaxListeners(1000);
