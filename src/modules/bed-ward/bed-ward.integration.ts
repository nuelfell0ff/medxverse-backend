import { emergencyEvents, type EmergencyWorkflowEvent } from '../emergency/emergency.events.js';
import { bedWardService } from './bed-ward.service.js';
import { AdmissionRequestSource } from './bed-ward.types.js';

let initialized = false;

export function initializeBedWardIntegrations(): void {
  if (initialized) return;
  initialized = true;

  emergencyEvents.on('downstream.workflow', async (event: EmergencyWorkflowEvent) => {
    if (event.workflow !== 'BED_MANAGEMENT' || !event.patientId) return;

    try {
      await bedWardService.createAdmissionRequest({
        hospitalId: event.hospitalId,
        patientId: event.patientId,
        requirements: event.requirements || {},
        source: AdmissionRequestSource.EMERGENCY,
        requestedById: event.decidedById || event.patientId,
        reason: 'Emergency Department admission requires inpatient bed.',
      });
    } catch (error) {
      console.error('[BedWard] Failed to create ED bed request:', error);
    }
  });
}
