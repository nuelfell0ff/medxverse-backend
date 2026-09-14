import { EventEmitter } from 'node:events';
export const emergencyEvents = new EventEmitter();
emergencyEvents.setMaxListeners(1000);
