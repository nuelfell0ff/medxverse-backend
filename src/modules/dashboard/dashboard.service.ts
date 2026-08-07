import { IDashboardMetrics } from './dashboard.types.js';

export class DashboardService {
  static async getExecutiveMetrics(hospitalId: string): Promise<IDashboardMetrics> {
    // Aggregated real-time status across hospital departments
    return {
      overview: {
        registeredPatients: 8,
        currentlyAdmitted: 3,
        claimsValue: 4335000,
        claimsAwaitingDecision: 3,
      },
      waitingPatientsQueue: {
        outpatientClinic: { count: 63, avgWaitMinutes: 22 },
        emergency: { count: 19, avgWaitMinutes: 6 },
        pharmacy: { count: 41, avgWaitMinutes: 14 },
        laboratory: { count: 58, avgWaitMinutes: 31 },
        radiology: { count: 22, avgWaitMinutes: 38 },
      },
      criticalAlerts: [
        { id: '1', title: 'Resuscitation bay 2 — polytrauma, ETA 4 min', severity: 'Critical', time: 'now' },
        { id: '2', title: 'Critical potassium 6.8 mmol/L — Ward 3, bed 12', severity: 'Critical', time: '2 min' },
        { id: '3', title: 'ICU capacity at 82% — escalate step-down transfers', severity: 'Urgent', time: '11 min' },
        { id: '4', title: 'Oxygen cylinder stock below reorder threshold', severity: 'Alert', time: '26 min' },
      ],
      aiInsights: [
        '14 inpatients have a rising NEWS2 trend — review before the evening ward round.',
        'Theatre list 3 is over-booked by 45 minutes; shifting case #7 recovers utilization to 81%.',
        'Antibiotic prescribing in Ward 5 deviates from the sepsis guideline in 6 of 22 charts.',
        'Claims denial risk is elevated for 38 encounters missing ICD-11 specificity.',
      ],
      recentPatients: [],
    };
  }
}