export function normalizeElectronicPrescription(input) {
    return {
        ...input,
        receivedAt: new Date(),
    };
}
export function createEmarDispenseLink(input) {
    return {
        ...input,
        linkedAt: new Date(),
    };
}
