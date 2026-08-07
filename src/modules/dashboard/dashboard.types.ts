import { Types } from 'mongoose';

export interface ICriticalAlert {
  id: string;
  title: string;
  severity: 'Critical' | 'Urgent' | 'Alert';
  time: string;
}

export interface IQueueMetric {
  count: number;
  avgWaitMinutes: number;
}

export interface IDashboardOverview {
  registeredPatients: number;
  currentlyAdmitted: number;
  claimsValue: number;
  claimsAwaitingDecision: number;
}

export interface IDashboardMetrics {
  overview: IDashboardOverview;
  waitingPatientsQueue: {
    outpatientClinic: IQueueMetric;
    emergency: IQueueMetric;
    pharmacy: IQueueMetric;
    laboratory: IQueueMetric;
    radiology: IQueueMetric;
  };
  criticalAlerts: ICriticalAlert[];
  aiInsights: string[];
  recentPatients: Array<{
    _id: Types.ObjectId;
    firstName: string;
    lastName: string;
    mrn: string;
  }>;
}