export type StaffNotificationKind =
  | 'TASK_DUE_SOON'
  | 'TASK_OVERDUE'
  | 'MESSAGE_UNREAD'
  | 'TICKET_ACTION';

export interface StaffNotificationItem {
  id: string;
  kind: StaffNotificationKind;
  title: string;
  message: string;
  priority: string;
  createdAt: string;
  dueAt?: string;
  unread: boolean;
  href: string;
  data: Record<string, unknown>;
}

export interface StaffNotificationFeed {
  items: StaffNotificationItem[];
  summary: {
    total: number;
    unreadMessages: number;
    dueSoonTasks: number;
    overdueTasks: number;
    actionableTickets: number;
  };
  generatedAt: string;
  dueSoonWindowMinutes: number;
}
