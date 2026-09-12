import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import mongoose, { Types } from 'mongoose';

import { connectDB } from '../src/config/db.js';
import { PatientModel } from '../src/modules/patient/patient.model.js';
import { PatientService } from '../src/modules/patient/patient.service.js';
import type { FhirResourceType } from '../src/modules/patient/patient.types.js';

type AnyRecord = Record<string, any>;

type Stats = {
  scanned: number;
  imported: number;
  skipped: number;
  failed: number;
  unmatched: number;
};

type Report = {
  startedAt: string;
  completedAt?: string;
  dryRun: boolean;
  module?: string;
  patient?: string;
  modules: Record<string, Stats>;
  touchedPatients: string[];
};

const SYSTEM_ACTOR = '000000000000000000000001';

const EHR_MODELS = new Set([
  'Patient',
  'Encounter',
  'Observation',
  'Condition',
  'MedicationStatement',
  'DocumentReference',
  'Procedure',
  'Claim',
  'EhrEvent',
  'EhrAuditLog',
  'ConsentRecord',
  'PatientEhrView',
]);

const CLINICAL_MODEL_ORDER = [
  'InpatientAdmission',
  'EmergencyCase',
  'ICUAdmission',
  'Consultation',
  'Outpatient',
  'TelemedicineSession',
  'LabOrder',
  'RadiologyOrder',
  'DispenseRecord',
  'SurgeryCase',
  'SurgicalCase',
  'DentalProcedure',
  'EyeExam',
  'OpticalPrescription',
  'MentalHealthAssessment',
  'PsychotherapySession',
  'MchRecord',
  'TransfusionRequest',
  'DietaryOrder',
  'MealDelivery',
  'DentalChart',
  'Appointment',
  'Ambulance',
  'TripRequest',
  'HmoClaim',
  'HmoPreAuth',
  'BillingAccount',
  'Charge',
  'Payment',
  'Refund',
  'PaymentPlan',
];

const argv = process.argv.slice(2);

const has = (name: string): boolean => argv.includes(name);

const value = (name: string): string | undefined => {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
};

const dryRun = has('--dry-run');
const requestedModule = value('--module');
const requestedPatient = value('--patient');
const fromDate = value('--from-date');
const toDate = value('--to-date');

const limitArg = Number(value('--limit') || 0);
const limit =
  Number.isFinite(limitArg) && limitArg > 0 ? limitArg : undefined;

/**
 * Safely retrieve nested values such as:
 * "procedureTracking.reportedAt"
 */
function getNestedValue(
  row: AnyRecord,
  key: string,
): any {
  return key
    .split('.')
    .reduce<any>((current, part) => current?.[part], row);
}

/**
 * Convert a legacy record's date field into a valid Date.
 */
function dateOf(
  row: AnyRecord,
  candidates: string[],
): Date {
  for (const key of candidates) {
    const raw = getNestedValue(row, key);

    if (raw) {
      const date =
        raw instanceof Date
          ? new Date(raw.getTime())
          : new Date(String(raw));

      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }
  }

  const fallbackRaw = row.createdAt || row.updatedAt;

  if (fallbackRaw) {
    const fallback =
      fallbackRaw instanceof Date
        ? new Date(fallbackRaw.getTime())
        : new Date(String(fallbackRaw));

    if (!Number.isNaN(fallback.getTime())) {
      return fallback;
    }
  }

  return new Date();
}

function stringValue(
  row: AnyRecord,
  candidates: string[],
  fallback = '',
): string {
  for (const key of candidates) {
    const raw = getNestedValue(row, key);

    if (
      raw !== undefined &&
      raw !== null &&
      String(raw).trim()
    ) {
      return String(raw);
    }
  }

  return fallback;
}

function actorFor(row: AnyRecord): string {
  const candidates = [
    'doctorId',
    'doctor',
    'createdBy',
    'createdById',
    'updatedBy',
    'updatedById',
    'performedBy',
    'requestedById',
    'evaluatorId',
    'therapistId',
    'examinerId',
    'orderedById',
    'recordedBy',
  ];

  for (const key of candidates) {
    const raw = row[key];
    const id = raw?._id || raw;

    if (
      id &&
      Types.ObjectId.isValid(String(id))
    ) {
      return String(id);
    }
  }

  return SYSTEM_ACTOR;
}

function cleanRow(row: AnyRecord): AnyRecord {
  const output: AnyRecord = {};

  for (const [key, value] of Object.entries(row)) {
    if (key === '__v') {
      continue;
    }

    if (key === '_id' && value) {
      output._sourceId = String(value);
    } else {
      output[key] = value;
    }
  }

  return output;
}

function sensitivity(
  modelName: string,
  row: AnyRecord,
) {
  if (
    modelName === 'MentalHealthAssessment' ||
    modelName === 'PsychotherapySession'
  ) {
    return {
      sensitive: true,
      sensitivityCode: 'MENTAL_HEALTH',
    };
  }

  const raw = stringValue(row, [
    'sensitivityCode',
    'sensitiveCode',
  ]);

  return raw
    ? {
        sensitive: true,
        sensitivityCode: raw,
      }
    : {
        sensitive: false,
        sensitivityCode: undefined,
      };
}

function resource(
  modelName: string,
  row: AnyRecord,
):
  | {
      resourceType: FhirResourceType;
      resource: AnyRecord;
      status?: string;
      department?: string;
    }
  | null {
  const id = String(row._id);
  const source = cleanRow(row);

  const status = stringValue(
    row,
    ['status', 'resultStatus', 'report.status'],
    'unknown',
  );

  const department = modelName.toLowerCase();

  switch (modelName) {
    case 'LabOrder':
      return {
        resourceType: 'Observation',
        status,
        department: 'LABORATORY',
        resource: {
          resourceType: 'Observation',
          id: `legacy-LabOrder-${id}`,
          status: [
            'VERIFIED',
            'AUTHORIZED',
            'COMPLETED',
            'RESULTS_RECORDED',
          ].includes(status)
            ? 'final'
            : 'preliminary',

          category: [
            {
              coding: [
                {
                  system:
                    'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'laboratory',
                  display: 'Laboratory',
                },
              ],
            },
          ],

          code: {
            text: row.testName || 'Laboratory test',
          },

          subject: {
            reference: `Patient/${row.patientId}`,
          },

          effectiveDateTime: dateOf(
            row,
            [
              'completedAt',
              'authorizedAt',
              'verifiedAt',
              'createdAt',
            ],
          ).toISOString(),

          value: row.results || [],

          interpretation: Array.isArray(row.results)
            ? row.results
                .map((result: AnyRecord) => result.flag)
                .filter(Boolean)
            : [],

          extension: [
            {
              url: 'urn:medxverse:legacy-source',
              valueJson: source,
            },
          ],
        },
      };

    case 'RadiologyOrder':
      return {
        resourceType: 'DocumentReference',
        status:
          status === 'REPORTED' ||
          status === 'COMPLETED'
            ? 'current'
            : 'superseded',

        department: 'RADIOLOGY',

        resource: {
          resourceType: 'DocumentReference',
          id: `legacy-RadiologyOrder-${id}`,
          status: 'current',

          type: {
            text:
              row.procedureName ||
              'Radiology report',
          },

          subject: {
            reference: `Patient/${row.patientId}`,
          },

          date: dateOf(
            row,
            [
              'reportedAt',
              'procedureTracking.reportedAt',
              'createdAt',
            ],
          ).toISOString(),

          description:
            row.report?.impression ||
            row.report?.findings ||
            row.impression ||
            row.findings ||
            'Historical radiology record',

          content: [
            {
              attachment: {
                title:
                  row.procedureName ||
                  'Radiology report',

                data:
                  row.report || {
                    findings: row.findings,
                    impression: row.impression,
                  },
              },
            },
          ],

          extension: [
            {
              url: 'urn:medxverse:legacy-source',
              valueJson: source,
            },
          ],
        },
      };

    case 'DispenseRecord':
      return {
        resourceType: 'MedicationStatement',
        status:
          status.toLowerCase() === 'cancelled'
            ? 'entered-in-error'
            : 'active',

        department: 'PHARMACY',

        resource: {
          resourceType: 'MedicationStatement',
          id: `legacy-DispenseRecord-${id}`,

          status:
            status.toLowerCase() === 'cancelled'
              ? 'entered-in-error'
              : 'active',

          subject: {
            reference: `Patient/${row.patientId}`,
          },

          effectiveDateTime: dateOf(
            row,
            ['dispensedAt', 'createdAt'],
          ).toISOString(),

          medicationCodeableConcept: {
            text:
              row.medicationName ||
              row.drugName ||
              (Array.isArray(row.items)
                ? row.items
                    .map(
                      (item: AnyRecord) =>
                        item.medicationName ||
                        item.name,
                    )
                    .filter(Boolean)
                    .join(', ')
                : '') ||
              'Dispensed medication',
          },

          dosage:
            row.items ||
            row.instructions ||
            row.dosage,

          extension: [
            {
              url: 'urn:medxverse:legacy-source',
              valueJson: source,
            },
          ],
        },
      };

    case 'Consultation':
      return {
        resourceType: 'Encounter',
        status:
          status === 'COMPLETED'
            ? 'finished'
            : 'in-progress',

        department: 'CONSULTATION',

        resource: {
          resourceType: 'Encounter',
          id: `legacy-Consultation-${id}`,

          status:
            status === 'COMPLETED'
              ? 'finished'
              : 'in-progress',

          class: {
            code: 'AMB',
            display: 'Ambulatory',
          },

          type: [
            {
              text: 'Consultation',
            },
          ],

          subject: {
            reference: `Patient/${row.patientId}`,
          },

          period: {
            start: dateOf(
              row,
              ['createdAt'],
            ).toISOString(),

            ...(row.completedAt
              ? {
                  end: new Date(
                    row.completedAt,
                  ).toISOString(),
                }
              : {}),
          },

          reasonCode: row.reason
            ? [{ text: row.reason }]
            : [],

          extension: [
            {
              url: 'urn:medxverse:legacy-source',
              valueJson: source,
            },
          ],
        },
      };

    case 'Outpatient':
      return {
        resourceType: 'Encounter',
        status:
          status === 'COMPLETED'
            ? 'finished'
            : 'in-progress',

        department: 'OUTPATIENT',

        resource: {
          resourceType: 'Encounter',
          id: `legacy-Outpatient-${id}`,

          status:
            status === 'COMPLETED'
              ? 'finished'
              : 'in-progress',

          class: {
            code: 'AMB',
            display: 'Ambulatory',
          },

          type: [
            {
              text: 'Outpatient visit',
            },
          ],

          subject: {
            reference: `Patient/${row.patientId}`,
          },

          period: {
            start: dateOf(
              row,
              [
                'consultationStartedAt',
                'queuedAt',
                'createdAt',
              ],
            ).toISOString(),

            ...(row.consultationEndedAt
              ? {
                  end: new Date(
                    row.consultationEndedAt,
                  ).toISOString(),
                }
              : {}),
          },

          reasonCode:
            row.reasonForVisit ||
            row.visitReason
              ? [
                  {
                    text:
                      row.reasonForVisit ||
                      row.visitReason,
                  },
                ]
              : [],

          extension: [
            {
              url: 'urn:medxverse:legacy-source',
              valueJson: source,
            },
          ],
        },
      };

    case 'InpatientAdmission':
      return {
        resourceType: 'Encounter',

        status: row.dischargedAt
          ? 'finished'
          : 'in-progress',

        department: 'ADMISSIONS',

        resource: {
          resourceType: 'Encounter',
          id: `legacy-InpatientAdmission-${id}`,

          status: row.dischargedAt
            ? 'finished'
            : 'in-progress',

          class: {
            code: 'IMP',
            display: 'Inpatient encounter',
          },

          type: [
            {
              text: 'Inpatient admission',
            },
          ],

          subject: {
            reference: `Patient/${row.patientId}`,
          },

          period: {
            start: dateOf(
              row,
              ['admittedAt', 'createdAt'],
            ).toISOString(),

            ...(row.dischargedAt
              ? {
                  end: new Date(
                    row.dischargedAt,
                  ).toISOString(),
                }
              : {}),
          },

          reasonCode: row.admissionReason
            ? [
                {
                  text: row.admissionReason,
                },
              ]
            : [],

          extension: [
            {
              url: 'urn:medxverse:legacy-source',
              valueJson: source,
            },
          ],
        },
      };

    case 'TelemedicineSession':
      return {
        resourceType: 'Encounter',

        status: row.endTime
          ? 'finished'
          : 'in-progress',

        department: 'TELEMEDICINE',

        resource: {
          resourceType: 'Encounter',
          id: `legacy-TelemedicineSession-${id}`,

          status: row.endTime
            ? 'finished'
            : 'in-progress',

          class: {
            code: 'VR',
            display: 'Virtual',
          },

          type: [
            {
              text:
                row.consultationType ||
                'Telemedicine consultation',
            },
          ],

          subject: {
            reference: `Patient/${row.patientId}`,
          },

          period: {
            start: dateOf(
              row,
              [
                'actualStartTime',
                'scheduledStartTime',
                'createdAt',
              ],
            ).toISOString(),

            ...(row.endTime
              ? {
                  end: new Date(
                    row.endTime,
                  ).toISOString(),
                }
              : {}),
          },

          extension: [
            {
              url: 'urn:medxverse:legacy-source',
              valueJson: source,
            },
          ],
        },
      };

    case 'SurgeryCase':
    case 'SurgicalCase':
      return {
        resourceType: 'Procedure',

        status:
          row.status === 'COMPLETED' ||
          row.actualEndTime
            ? 'completed'
            : 'preparation',

        department: 'SURGERY',

        resource: {
          resourceType: 'Procedure',
          id: `legacy-${modelName}-${id}`,

          status:
            row.status === 'COMPLETED' ||
            row.actualEndTime
              ? 'completed'
              : 'preparation',

          code: {
            text:
              row.procedureName ||
              row.procedure?.name ||
              'Surgical procedure',
          },

          subject: {
            reference: `Patient/${row.patientId}`,
          },

          performedPeriod: {
            start: dateOf(
              row,
              [
                'actualStartTime',
                'scheduledStartTime',
                'createdAt',
              ],
            ).toISOString(),

            ...(row.actualEndTime
              ? {
                  end: new Date(
                    row.actualEndTime,
                  ).toISOString(),
                }
              : {}),
          },

          note: [
            {
              text:
                row.notes ||
                row.postOpNotes ||
                row.preOpAssessment?.notes ||
                'Historical surgical record',
            },
          ],

          extension: [
            {
              url: 'urn:medxverse:legacy-source',
              valueJson: source,
            },
          ],
        },
      };

    case 'EmergencyCase':
      return {
        resourceType: 'Encounter',

        status:
          row.status === 'DISCHARGED' ||
          row.status === 'COMPLETED'
            ? 'finished'
            : 'in-progress',

        department: 'EMERGENCY',

        resource: {
          resourceType: 'Encounter',
          id: `legacy-EmergencyCase-${id}`,

          status:
            row.status === 'DISCHARGED' ||
            row.status === 'COMPLETED'
              ? 'finished'
              : 'in-progress',

          class: {
            code: 'EMER',
            display: 'Emergency',
          },

          type: [
            {
              text: 'Emergency encounter',
            },
          ],

          subject: {
            reference: `Patient/${row.patientId}`,
          },

          reasonCode:
            row.chiefComplaint || row.reason
              ? [
                  {
                    text:
                      row.chiefComplaint ||
                      row.reason,
                  },
                ]
              : [],

          period: {
            start: dateOf(
              row,
              ['createdAt'],
            ).toISOString(),
          },

          extension: [
            {
              url: 'urn:medxverse:legacy-source',
              valueJson: source,
            },
          ],
        },
      };

    case 'ICUAdmission':
      return {
        resourceType: 'Encounter',

        status: row.dischargedAt
          ? 'finished'
          : 'in-progress',

        department: 'ICU',

        resource: {
          resourceType: 'Encounter',
          id: `legacy-ICUAdmission-${id}`,

          status: row.dischargedAt
            ? 'finished'
            : 'in-progress',

          class: {
            code: 'IMP',
            display: 'Inpatient/ICU',
          },

          type: [
            {
              text: 'ICU admission',
            },
          ],

          subject: {
            reference: `Patient/${row.patientId}`,
          },

          period: {
            start: dateOf(
              row,
              ['admittedAt', 'createdAt'],
            ).toISOString(),

            ...(row.dischargedAt
              ? {
                  end: new Date(
                    row.dischargedAt,
                  ).toISOString(),
                }
              : {}),
          },

          extension: [
            {
              url: 'urn:medxverse:legacy-source',
              valueJson: source,
            },
          ],
        },
      };

    case 'DentalProcedure':
      return {
        resourceType: 'Procedure',

        status:
          status.toLowerCase() === 'completed'
            ? 'completed'
            : 'in-progress',

        department: 'DENTAL',

        resource: {
          resourceType: 'Procedure',
          id: `legacy-DentalProcedure-${id}`,

          status:
            status.toLowerCase() === 'completed'
              ? 'completed'
              : 'in-progress',

          code: {
            text:
              row.procedureType ||
              row.procedureName ||
              'Dental procedure',
          },

          subject: {
            reference: `Patient/${row.patientId}`,
          },

          performedDateTime: dateOf(
            row,
            ['performedAt', 'createdAt'],
          ).toISOString(),

          note: row.notes
            ? [{ text: row.notes }]
            : [],

          extension: [
            {
              url: 'urn:medxverse:legacy-source',
              valueJson: source,
            },
          ],
        },
      };

    case 'EyeExam':
      return {
        resourceType: 'Observation',
        status: 'final',
        department: 'EYE_CLINIC',

        resource: {
          resourceType: 'Observation',
          id: `legacy-EyeExam-${id}`,
          status: 'final',

          category: [
            {
              text: 'Eye examination',
            },
          ],

          code: {
            text:
              row.examType ||
              'Eye examination',
          },

          subject: {
            reference: `Patient/${row.patientId}`,
          },

          effectiveDateTime: dateOf(
            row,
            ['createdAt'],
          ).toISOString(),

          value: source,

          extension: [
            {
              url: 'urn:medxverse:legacy-source',
              valueJson: source,
            },
          ],
        },
      };

    case 'OpticalPrescription':
      return {
        resourceType: 'DocumentReference',
        status: 'current',
        department: 'EYE_CLINIC',

        resource: {
          resourceType: 'DocumentReference',
          id: `legacy-OpticalPrescription-${id}`,
          status: 'current',

          type: {
            text: 'Optical prescription',
          },

          subject: {
            reference: `Patient/${row.patientId}`,
          },

          date: dateOf(
            row,
            ['createdAt'],
          ).toISOString(),

          description:
            'Historical optical prescription',

          content: [
            {
              attachment: {
                title: 'Optical prescription',
                data: source,
              },
            },
          ],

          extension: [
            {
              url: 'urn:medxverse:legacy-source',
              valueJson: source,
            },
          ],
        },
      };

    case 'MentalHealthAssessment':
      return {
        resourceType: 'Observation',
        status: 'final',
        department: 'MENTAL_HEALTH',

        resource: {
          resourceType: 'Observation',
          id: `legacy-MentalHealthAssessment-${id}`,
          status: 'final',

          code: {
            text:
              row.assessmentType ||
              'Mental health assessment',
          },

          subject: {
            reference: `Patient/${row.patientId}`,
          },

          effectiveDateTime: dateOf(
            row,
            ['createdAt'],
          ).toISOString(),

          value: source,

          extension: [
            {
              url: 'urn:medxverse:legacy-source',
              valueJson: source,
            },
          ],
        },
      };

    case 'PsychotherapySession':
      return {
        resourceType: 'DocumentReference',
        status: 'current',
        department: 'MENTAL_HEALTH',

        resource: {
          resourceType: 'DocumentReference',
          id: `legacy-PsychotherapySession-${id}`,
          status: 'current',

          type: {
            text:
              row.sessionType ||
              'Psychotherapy session',
          },

          subject: {
            reference: `Patient/${row.patientId}`,
          },

          date: dateOf(
            row,
            ['sessionDate', 'createdAt'],
          ).toISOString(),

          description:
            row.notes ||
            row.subjectiveNotes ||
            row.objectiveNotes ||
            'Historical psychotherapy session',

          content: [
            {
              attachment: {
                title:
                  'Psychotherapy session',
                data: source,
              },
            },
          ],

          extension: [
            {
              url: 'urn:medxverse:legacy-source',
              valueJson: source,
            },
          ],
        },
      };

    case 'MchRecord':
      return {
        resourceType: 'Encounter',
        status: 'finished',
        department: 'MCH',

        resource: {
          resourceType: 'Encounter',
          id: `legacy-MchRecord-${id}`,
          status: 'finished',

          class: {
            code: 'AMB',
            display: 'Maternal/child health',
          },

          type: [
            {
              text: 'MCH record',
            },
          ],

          subject: {
            reference: `Patient/${row.patientId}`,
          },

          period: {
            start: dateOf(
              row,
              [
                'createdAt',
                'ancVisits.0.visitDate',
                'pncVisits.0.visitDate',
                'deliveryRecord.deliveryDate',
              ],
            ).toISOString(),
          },

          extension: [
            {
              url: 'urn:medxverse:legacy-source',
              valueJson: source,
            },
          ],
        },
      };

    case 'TransfusionRequest':
      return {
        resourceType: 'Procedure',

        status:
          row.status === 'COMPLETED'
            ? 'completed'
            : 'preparation',

        department: 'BLOOD_BANK',

        resource: {
          resourceType: 'Procedure',
          id: `legacy-TransfusionRequest-${id}`,

          status:
            row.status === 'COMPLETED'
              ? 'completed'
              : 'preparation',

          code: {
            text: `Blood transfusion request - ${
              row.componentType ||
              'blood component'
            }`,
          },

          subject: {
            reference: `Patient/${row.patientId}`,
          },

          performedDateTime: dateOf(
            row,
            ['updatedAt', 'createdAt'],
          ).toISOString(),

          note:
            row.clinicalIndication ||
            row.notes
              ? [
                  {
                    text:
                      row.clinicalIndication ||
                      row.notes,
                  },
                ]
              : [],

          extension: [
            {
              url: 'urn:medxverse:legacy-source',
              valueJson: source,
            },
          ],
        },
      };

    case 'DietaryOrder':
      return {
        resourceType: 'Observation',
        status: 'final',
        department: 'DIETARY',

        resource: {
          resourceType: 'Observation',
          id: `legacy-DietaryOrder-${id}`,
          status: 'final',

          code: {
            text: `Dietary order: ${
              row.dietType || 'diet'
            }`,
          },

          subject: {
            reference: `Patient/${row.patientId}`,
          },

          effectiveDateTime: dateOf(
            row,
            ['startDate', 'createdAt'],
          ).toISOString(),

          value: source,

          extension: [
            {
              url: 'urn:medxverse:legacy-source',
              valueJson: source,
            },
          ],
        },
      };

    case 'MealDelivery':
      return {
        resourceType: 'Observation',
        status: 'final',
        department: 'DIETARY',

        resource: {
          resourceType: 'Observation',
          id: `legacy-MealDelivery-${id}`,
          status: 'final',

          code: {
            text: `Meal delivery: ${
              row.mealType || 'meal'
            }`,
          },

          subject: {
            reference: `Patient/${row.patientId}`,
          },

          effectiveDateTime: dateOf(
            row,
            [
              'deliveredAt',
              'scheduledDate',
              'createdAt',
            ],
          ).toISOString(),

          value: source,

          extension: [
            {
              url: 'urn:medxverse:legacy-source',
              valueJson: source,
            },
          ],
        },
      };

    case 'DentalChart':
      return {
        resourceType: 'DocumentReference',
        status: 'current',
        department: 'DENTAL',

        resource: {
          resourceType: 'DocumentReference',
          id: `legacy-DentalChart-${id}`,
          status: 'current',

          type: {
            text: 'Dental chart',
          },

          subject: {
            reference: `Patient/${row.patientId}`,
          },

          date: dateOf(
            row,
            ['updatedAt', 'createdAt'],
          ).toISOString(),

          description:
            row.notes ||
            'Historical dental chart',

          content: [
            {
              attachment: {
                title: 'Dental chart',
                data: source,
              },
            },
          ],

          extension: [
            {
              url: 'urn:medxverse:legacy-source',
              valueJson: source,
            },
          ],
        },
      };

    case 'Appointment':
      return {
        resourceType: 'Encounter',
        status: 'planned',

        department: stringValue(
          row,
          ['department'],
          'APPOINTMENT',
        ),

        resource: {
          resourceType: 'Encounter',
          id: `legacy-Appointment-${id}`,
          status: 'planned',

          class: {
            code: 'AMB',
            display: 'Ambulatory',
          },

          type: [
            {
              text:
                row.appointmentType ||
                row.type ||
                'Scheduled appointment',
            },
          ],

          subject: {
            reference: `Patient/${row.patientId}`,
          },

          period: {
            start: dateOf(
              row,
              [
                'scheduledAt',
                'appointmentDate',
                'createdAt',
              ],
            ).toISOString(),
          },

          extension: [
            {
              url: 'urn:medxverse:legacy-source',
              valueJson: source,
            },
          ],
        },
      };

    case 'Ambulance':
    case 'TripRequest':
      return {
        resourceType: 'DocumentReference',
        status: 'current',
        department: 'AMBULANCE',

        resource: {
          resourceType: 'DocumentReference',
          id: `legacy-${modelName}-${id}`,
          status: 'current',

          type: {
            text: 'Ambulance/transport record',
          },

          subject: {
            reference: `Patient/${row.patientId}`,
          },

          date: dateOf(
            row,
            [
              'completedAt',
              'updatedAt',
              'createdAt',
            ],
          ).toISOString(),

          description:
            row.reason ||
            row.pickupLocation ||
            'Historical ambulance record',

          content: [
            {
              attachment: {
                title: 'Transport record',
                data: source,
              },
            },
          ],

          extension: [
            {
              url: 'urn:medxverse:legacy-source',
              valueJson: source,
            },
          ],
        },
      };

    case 'HmoClaim':
    case 'HmoPreAuth':
      return {
        resourceType: 'Claim',
        status: 'active',
        department: 'HMO',

        resource: {
          resourceType: 'Claim',
          id: `legacy-${modelName}-${id}`,
          status: 'active',
          use: 'claim',

          patient: {
            reference: `Patient/${row.patientId}`,
          },

          created: dateOf(
            row,
            ['createdAt', 'updatedAt'],
          ).toISOString(),

          type: {
            text:
              modelName === 'HmoPreAuth'
                ? 'HMO pre-authorization'
                : 'HMO claim',
          },

          extension: [
            {
              url: 'urn:medxverse:legacy-source',
              valueJson: source,
            },
          ],
        },
      };

    case 'BillingAccount':
    case 'Charge':
    case 'Payment':
    case 'Refund':
    case 'PaymentPlan':
      return {
        resourceType: 'Claim',
        status: 'active',
        department: 'BILLING',

        resource: {
          resourceType: 'Claim',
          id: `legacy-${modelName}-${id}`,
          status: 'active',
          use: 'claim',

          patient: {
            reference: `Patient/${row.patientId}`,
          },

          created: dateOf(
            row,
            [
              'chargeDate',
              'paymentDate',
              'refundDate',
              'createdAt',
            ],
          ).toISOString(),

          type: {
            text: `Billing ${modelName}`,
          },

          extension: [
            {
              url: 'urn:medxverse:legacy-source',
              valueJson: source,
            },
          ],
        },
      };

    default:
      return null;
  }
}

const MODEL_MODULES = new Map<string, string>();

async function findModelFiles(
  directory: string,
): Promise<string[]> {
  const entries = await fs.readdir(directory, {
    withFileTypes: true,
  });

  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await findModelFiles(fullPath));
      continue;
    }

    if (
      entry.isFile() &&
      (entry.name.endsWith('.model.ts') ||
        entry.name.endsWith('.model.js'))
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

async function loadAllModels(): Promise<void> {
  const modulesDir = path.resolve(
    process.cwd(),
    'src/modules',
  );

  const modelFiles = await findModelFiles(modulesDir);

  for (const modelFile of modelFiles) {
    /*
     * Import the actual source file. The previous implementation
     * assumed every module had exactly <module>/<module>.model.ts,
     * which is not true for all MedXverse modules. It also silently
     * swallowed import errors, leaving mongoose.models empty.
     */
    try {
      const before = new Set(
        Object.keys(mongoose.models),
      );

      await import(
        new URL(
          `file://${modelFile.replace(/\\/g, '/')}`,
        ).href
      );

      const moduleName = path.relative(
        modulesDir,
        path.dirname(modelFile),
      ).split(path.sep)[0];

      for (const modelName of Object.keys(
        mongoose.models,
      )) {
        if (!before.has(modelName)) {
          MODEL_MODULES.set(
            modelName,
            moduleName,
          );
        }
      }
    } catch (error) {
      console.warn(
        `[EHR BACKFILL] Could not load model file ${modelFile}:`,
        error instanceof Error
          ? error.message
          : error,
      );
    }
  }

  /*
   * Some models may already have been registered by another
   * imported module. Preserve them so they can still be scanned.
   */
  for (const modelName of Object.keys(
    mongoose.models,
  )) {
    if (!MODEL_MODULES.has(modelName)) {
      MODEL_MODULES.set(
        modelName,
        modelName.toLowerCase(),
      );
    }
  }

  console.log(
    `[EHR BACKFILL] Loaded ${Object.keys(mongoose.models).length} Mongoose models.`,
  );
}

async function migrateModel(
  modelName: string,
  report: Report,
): Promise<void> {
  const model: any =
    mongoose.models[modelName];

  if (
    !model ||
    EHR_MODELS.has(modelName) ||
    !model.schema.path('patientId')
  ) {
    return;
  }

  if (requestedModule) {
    const normalizedRequested =
      requestedModule.toLowerCase();

    const normalizedModel =
      modelName.toLowerCase();

    const normalizedModule =
      (
        MODEL_MODULES.get(modelName) || ''
      ).toLowerCase();

    if (
      normalizedRequested !== normalizedModel &&
      normalizedRequested !== normalizedModule &&
      !normalizedModel.startsWith(
        `${normalizedRequested}`,
      )
    ) {
      return;
    }
  }

  const touchedPatients =
    report.touchedPatients;

  const stats: Stats =
    report.modules[modelName] || {
      scanned: 0,
      imported: 0,
      skipped: 0,
      failed: 0,
      unmatched: 0,
    };

  report.modules[modelName] = stats;

  const query: AnyRecord = {};

  if (requestedPatient) {
    if (
      !Types.ObjectId.isValid(
        requestedPatient,
      )
    ) {
      throw new Error(
        '--patient must be a valid Mongo ObjectId',
      );
    }

    query.patientId =
      new Types.ObjectId(
        requestedPatient,
      );
  }

  if (fromDate || toDate) {
    query.createdAt = {};

    if (fromDate) {
      query.createdAt.$gte =
        new Date(fromDate);
    }

    if (toDate) {
      query.createdAt.$lte =
        new Date(toDate);
    }
  }

  const cursor = model
    .find(query)
    .sort({
      createdAt: 1,
      _id: 1,
    })
    .lean()
    .cursor();

  let processed = 0;

  for await (const rawRow of cursor) {
    /*
     * Mongoose can infer a union here depending on
     * the model schema. Convert it once to our generic
     * migration record type.
     */
    const row =
      rawRow as unknown as AnyRecord;

    if (
      limit &&
      processed >= limit
    ) {
      break;
    }

    processed += 1;
    stats.scanned += 1;

    const patientId =
      row.patientId?._id ||
      row.patientId;

    if (
      !patientId ||
      !Types.ObjectId.isValid(
        String(patientId),
      )
    ) {
      stats.unmatched += 1;
      continue;
    }

    const patientObjectId =
      new Types.ObjectId(
        String(patientId),
      );

    /*
     * Explicitly normalize hospitalId so
     * Mongoose's generated types cannot infer
     * an array/object union here.
     */
    const hospitalId =
      row.hospitalId;

    if (
      !hospitalId ||
      !Types.ObjectId.isValid(
        String(hospitalId),
      )
    ) {
      stats.unmatched += 1;
      continue;
    }

    const patientExists =
      await PatientModel.exists({
        _id: patientObjectId,
        hospitalId:
          new Types.ObjectId(
            String(hospitalId),
          ),
      });

    if (!patientExists) {
      stats.unmatched += 1;
      continue;
    }

    if (
      !touchedPatients.includes(
        String(patientId),
      )
    ) {
      touchedPatients.push(
        String(patientId),
      );
    }

    const mapped = resource(
      modelName,
      row,
    );

    if (!mapped) {
      stats.skipped += 1;
      continue;
    }

    const sourceId =
      String(row._id);

    const sourceKey =
      `LEGACY:${modelName}:${sourceId}`;

    if (dryRun) {
      stats.imported += 1;
      continue;
    }

    try {
      const result =
        await PatientService.importHistoricalEHRResource(
          String(hospitalId),
          {
            resourceType:
              mapped.resourceType,

            patientId:
              String(patientId),

            id:
              mapped.resource.id,

            status:
              mapped.status,

            department:
              mapped.department,

            ...sensitivity(
              modelName,
              row,
            ),

            resource:
              mapped.resource,

            reason:
              'Historical Unified EHR backfill',

            occurredAt:
              dateOf(
                row,
                [
                  'completedAt',
                  'reportedAt',
                  'dispensedAt',
                  'performedAt',
                  'sessionDate',
                  'admittedAt',
                  'actualStartTime',
                  'createdAt',
                ],
              ),

            sourceKey,

            sourceSystem:
              'LEGACY_MIGRATION',

            sourceModel:
              modelName,

            sourceRecordId:
              sourceId,

            recordedBy:
              actorFor(row),

            refreshView: false,
          },
        );

      if (
        result.status === 'SKIPPED'
      ) {
        stats.skipped += 1;
      } else {
        stats.imported += 1;
      }

      /*
       * Expand high-value nested consultation
       * diagnoses into first-class Conditions.
       */
      if (
        modelName === 'Consultation' &&
        Array.isArray(row.diagnoses)
      ) {
        for (
          let i = 0;
          i < row.diagnoses.length;
          i += 1
        ) {
          const diagnosis =
            row.diagnoses[i];

          const text =
            typeof diagnosis === 'string'
              ? diagnosis
              : diagnosis?.description ||
                diagnosis?.name ||
                diagnosis?.diagnosis ||
                diagnosis?.code;

          if (!text) {
            continue;
          }

          const conditionId =
            `legacy-Consultation-${sourceId}-condition-${i}`;

          await PatientService.importHistoricalEHRResource(
            String(hospitalId),
            {
              resourceType:
                'Condition',

              patientId:
                String(patientId),

              id:
                conditionId,

              status:
                'active',

              department:
                'CONSULTATION',

              resource: {
                resourceType:
                  'Condition',

                id:
                  conditionId,

                clinicalStatus: {
                  text: 'active',
                },

                code: {
                  text,
                },

                subject: {
                  reference:
                    `Patient/${patientId}`,
                },

                recordedDate:
                  dateOf(
                    row,
                    ['createdAt'],
                  ).toISOString(),
              },

              occurredAt:
                dateOf(
                  row,
                  ['createdAt'],
                ),

              sourceKey:
                `LEGACY:${modelName}:${sourceId}:condition:${i}`,

              sourceSystem:
                'LEGACY_MIGRATION',

              sourceModel:
                modelName,

              sourceRecordId:
                sourceId,

              recordedBy:
                actorFor(row),

              refreshView:
                false,
            },
          );
        }
      }

      /*
       * Import consultation/outpatient notes
       * as DocumentReference resources.
       */
      if (
        (
          modelName === 'Consultation' ||
          modelName === 'Outpatient'
        ) &&
        (
          row.consultationNotes ||
          row.clinicalNotes ||
          row.notes
        )
      ) {
        const note =
          row.consultationNotes ||
          row.clinicalNotes ||
          row.notes;

        const noteId =
          `legacy-${modelName}-${sourceId}-note`;

        await PatientService.importHistoricalEHRResource(
          String(hospitalId),
          {
            resourceType:
              'DocumentReference',

            patientId:
              String(patientId),

            id:
              noteId,

            status:
              'current',

            department:
              modelName.toUpperCase(),

            resource: {
              resourceType:
                'DocumentReference',

              id:
                noteId,

              status:
                'current',

              type: {
                text: 'Clinical note',
              },

              subject: {
                reference:
                  `Patient/${patientId}`,
              },

              date:
                dateOf(
                  row,
                  ['createdAt'],
                ).toISOString(),

              content: [
                {
                  attachment: {
                    title:
                      'Clinical note',

                    data:
                      String(note),
                  },
                },
              ],
            },

            occurredAt:
              dateOf(
                row,
                ['createdAt'],
              ),

            sourceKey:
              `LEGACY:${modelName}:${sourceId}:note`,

            sourceSystem:
              'LEGACY_MIGRATION',

            sourceModel:
              modelName,

            sourceRecordId:
              sourceId,

            recordedBy:
              actorFor(row),

            refreshView:
              false,
          },
        );
      }
    } catch (error) {
      stats.failed += 1;

      console.error(
        `[EHR BACKFILL] ${modelName}/${sourceId}:`,
        error instanceof Error
          ? error.message
          : error,
      );
    }
  }
}

async function main(): Promise<void> {
  console.log(
    '=== MedXverse Unified EHR Historical Backfill ===',
  );

  console.log({
    dryRun,
    requestedModule,
    requestedPatient,
    fromDate,
    toDate,
    limit,
  });

  await connectDB();

  await loadAllModels();

  const report: Report = {
    startedAt:
      new Date().toISOString(),

    dryRun,

    module:
      requestedModule,

    patient:
      requestedPatient,

    modules: {},

    touchedPatients: [],
  };

  const modelNames = [
    ...CLINICAL_MODEL_ORDER,

    ...Object.keys(
      mongoose.models,
    ).filter(
      (name) =>
        !CLINICAL_MODEL_ORDER.includes(
          name,
        ),
    ),
  ];

  for (const name of modelNames) {
    await migrateModel(
      name,
      report,
    );
  }

  if (!dryRun) {
    const touched =
      report.touchedPatients;

    for (const patientId of touched) {
      /*
       * Cast the lean result to AnyRecord so
       * Mongoose's generated union type cannot
       * incorrectly infer an array.
       */
      const patient =
        (await PatientModel.findById(
          patientId,
        )
          .select('_id hospitalId')
          .lean()) as unknown as
          AnyRecord | null;

      if (patient) {
        await PatientService.rebuildEHRView(
          String(
            patient.hospitalId,
          ),
          String(patient._id),
        );
      }
    }

    console.log(
      `[EHR BACKFILL] Rebuilt ${touched.length} patient EHR materialized views.`,
    );
  }

  report.completedAt =
    new Date().toISOString();

  const reportPath =
    path.resolve(
      process.cwd(),
      'ehr-backfill-report.json',
    );

  await fs.writeFile(
    reportPath,
    JSON.stringify(
      report,
      null,
      2,
    ),
  );

  console.log(
    `Report written to ${reportPath}`,
  );

  console.log(
    JSON.stringify(
      report,
      null,
      2,
    ),
  );

  await mongoose.disconnect();
}

main().catch(
  async (error) => {
    console.error(
      '[EHR BACKFILL] Fatal:',
      error,
    );

    try {
      await mongoose.disconnect();
    } catch {
      // Ignore disconnect errors.
    }

    process.exit(1);
  },
);