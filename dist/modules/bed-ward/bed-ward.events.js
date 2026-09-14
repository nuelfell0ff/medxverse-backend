import { EventEmitter } from 'node:events';
export const bedWardEvents = new EventEmitter();
bedWardEvents.setMaxListeners(1000);
export const emitBedBoardChanged = (event) => {
    bedWardEvents.emit('board.changed', event);
};
export const emitHousekeeping = (event) => {
    bedWardEvents.emit('housekeeping', event);
};
