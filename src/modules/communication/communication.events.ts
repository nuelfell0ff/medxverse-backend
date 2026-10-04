import { EventEmitter } from 'events';

export interface CommunicationEvent {
  type: string;
  hospitalId: string;
  userIds?: string[];
  conversationId?: string;
  messageId?: string;
  ticketId?: string;
  payload?: unknown;
  occurredAt: string;
}

export const communicationEvents = new EventEmitter();
communicationEvents.setMaxListeners(0);
