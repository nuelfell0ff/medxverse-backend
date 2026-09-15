/**
 * Integration seams for CPOE/eMAR/AI CDS.
 *
 * These functions intentionally avoid hard dependencies on modules whose public
 * APIs can vary between MedXverse deployments. Wire them to the corresponding
 * module event buses/connectors when those APIs are available.
 */
export interface PharmacyPrescriptionIntegrationEvent {
  hospitalId: string;
  patientId: string;
  prescriptionId: string;
  source: 'CPOE' | 'EHR' | 'EMAR' | 'CLINICIAN_ORDER';
  sourceRecordId?: string;
}

export function normalizeElectronicPrescription(input: PharmacyPrescriptionIntegrationEvent) {
  return {
    ...input,
    receivedAt: new Date(),
  };
}

export interface EmarDispenseLink {
  dispenseRecordId: string;
  prescriptionId: string;
  emarReferenceId?: string;
}

export function createEmarDispenseLink(input: EmarDispenseLink) {
  return {
    ...input,
    linkedAt: new Date(),
  };
}

/**
 * Optional AI/CDS adapter seam. The core Pharmacy workflow never trusts AI
 * output as an authorization decision; pharmacist review remains authoritative.
 */
export interface PharmacyClinicalDecisionSupportAdapter {
  screenPrescription(input: {
    hospitalId: string;
    patientId: string;
    medications: unknown[];
  }): Promise<{
    issues: Array<{ code: string; severity: string; message: string }>;
  }>;
}
