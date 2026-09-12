import { PatientService } from './patient.service.js';
import type { FhirResourceType } from './patient.types.js';

type PublishInput = {
  hospitalId: string;
  patientId: string;
  actorId: string;
  role?: string;
  resourceType: Exclude<FhirResourceType, 'Patient'>;
  resourceId: string;
  encounterId?: string;
  department?: string;
  status?: string;
  sensitive?: boolean;
  sensitivityCode?: string;
  code?: { system?: string; code?: string; display?: string };
  resource: Record<string, unknown>;
  reason?: string;
};

/**
 * Shared bridge used by clinical modules to publish into the Unified EHR.
 * Publishing is best-effort so a temporary EHR projection failure cannot
 * break an existing clinical workflow. The source clinical record remains
 * authoritative and can be republished by calling the same operation again.
 */
export const publishEhrResource = async (input: PublishInput): Promise<void> => {
  const actor = { userId: input.actorId, role: input.role };

  try {

    await PatientService.updateEHRResource(
      input.hospitalId,
      actor,
      input.resourceType,
      input.resourceId,
      {
        resource: input.resource,
        reason: input.reason,
        sensitive: input.sensitive,
        sensitivityCode: input.sensitivityCode,
      }
    );
  } catch (error: any) {
    if (error?.statusCode !== 404) {
      console.error(
        `[EHR] Failed to update ${input.resourceType}/${input.resourceId}:`,
        error instanceof Error ? error.message : error
      );
      return;
    }

    try {
      await PatientService.createEHRResource(input.hospitalId, actor, {
        resourceType: input.resourceType,
        patientId: input.patientId,
        id: input.resourceId,
        encounterId: input.encounterId,
        status: input.status,
        department: input.department,
        sensitive: input.sensitive,
        sensitivityCode: input.sensitivityCode,
        code: input.code,
        resource: input.resource,
        reason: input.reason,
      });
    } catch (createError) {
      console.error(
        `[EHR] Failed to create ${input.resourceType}/${input.resourceId}:`,
        createError instanceof Error ? createError.message : createError
      );
    }
  }
};
