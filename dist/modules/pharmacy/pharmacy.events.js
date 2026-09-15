import { EventEmitter } from 'events';
export const pharmacyEvents = new EventEmitter();
export var PharmacyEventType;
(function (PharmacyEventType) {
    PharmacyEventType["PRESCRIPTION_RECEIVED"] = "pharmacy.prescription.received";
    PharmacyEventType["SCREENING_COMPLETED"] = "pharmacy.screening.completed";
    PharmacyEventType["DISPENSED"] = "pharmacy.dispensed";
    PharmacyEventType["STOCK_CHANGED"] = "pharmacy.stock.changed";
    PharmacyEventType["LOW_STOCK"] = "pharmacy.stock.low";
    PharmacyEventType["CONTROLLED_SUBSTANCE_LOGGED"] = "pharmacy.controlled.logged";
})(PharmacyEventType || (PharmacyEventType = {}));
export function emitPharmacyEvent(type, payload) {
    pharmacyEvents.emit(type, payload);
}
