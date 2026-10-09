import { EventEmitter } from 'events';
export const communicationEvents = new EventEmitter();
communicationEvents.setMaxListeners(0);
