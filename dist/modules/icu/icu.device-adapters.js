import { DeviceProtocol } from './icu.types.js';
function numeric(value) {
    if (typeof value === 'number' || typeof value === 'boolean')
        return value;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        const n = Number(trimmed);
        return trimmed !== '' && Number.isFinite(n) ? n : trimmed;
    }
    throw new Error('Unsupported device measurement value.');
}
/**
 * Adapter for gateway payloads that have already been decoded into a
 * protocol-neutral object. This is the normal target of an IEEE 11073 or
 * vendor SDK connector.
 *
 * Accepted shape:
 * { measurements: [{ parameter, value, unit, referenceCode }] }
 * or
 * { data: { heartRate: 80, spo2: 98 } }
 */
export class StructuredDeviceAdapter {
    protocol;
    constructor(protocol) {
        this.protocol = protocol;
    }
    canHandle(payload) {
        return !!payload && typeof payload === 'object';
    }
    normalize(payload) {
        const value = payload;
        if (Array.isArray(value.measurements)) {
            return value.measurements.map((item) => {
                if (!item || typeof item !== 'object')
                    throw new Error('Invalid device measurement.');
                const m = item;
                if (!m.parameter || m.value === undefined)
                    throw new Error('Each measurement requires parameter and value.');
                return {
                    parameter: String(m.parameter),
                    value: numeric(m.value),
                    unit: m.unit ? String(m.unit) : undefined,
                    referenceCode: m.referenceCode ? String(m.referenceCode) : undefined,
                };
            });
        }
        const data = value.data;
        if (data && typeof data === 'object') {
            return Object.entries(data).map(([parameter, measurement]) => ({
                parameter,
                value: numeric(measurement),
            }));
        }
        throw new Error('Structured device payload does not contain measurements or data.');
    }
}
/**
 * Minimal HL7 v2 ORU^R01 OBX adapter.
 *
 * It intentionally handles the transport-neutral OBX observation structure,
 * while vendor/device-specific LOINC or local-code mapping remains configurable.
 * A production connector should validate the complete HL7 envelope before
 * handing the message to this adapter.
 */
export class Hl7ObxAdapter {
    protocol = DeviceProtocol.HL7;
    canHandle(payload) {
        return typeof payload === 'string' && payload.includes('OBX|');
    }
    normalize(payload) {
        const message = String(payload);
        const measurements = [];
        for (const segment of message.split(/\r?\n/)) {
            if (!segment.startsWith('OBX|'))
                continue;
            const fields = segment.split('|');
            const identifier = fields[3] || fields[2] || '';
            const value = fields[5];
            const unit = fields[6] || undefined;
            if (!identifier || value === undefined || value === '')
                continue;
            const components = identifier.split('^');
            const parameter = components[0] || components[1] || identifier;
            measurements.push({
                parameter,
                value: numeric(value),
                unit,
                referenceCode: identifier,
            });
        }
        if (!measurements.length) {
            throw new Error('No OBX observations were found in the HL7 payload.');
        }
        return measurements;
    }
}
const adapters = new Map([
    [DeviceProtocol.HL7, new Hl7ObxAdapter()],
    [DeviceProtocol.IEEE_11073, new StructuredDeviceAdapter(DeviceProtocol.IEEE_11073)],
    [DeviceProtocol.VENDOR_API, new StructuredDeviceAdapter(DeviceProtocol.VENDOR_API)],
    [DeviceProtocol.FHIR, new StructuredDeviceAdapter(DeviceProtocol.FHIR)],
]);
export function normalizeDevicePayload(protocol, payload, context) {
    const adapter = adapters.get(protocol);
    if (!adapter)
        throw new Error(`No device adapter is registered for protocol ${protocol}.`);
    if (!adapter.canHandle(payload))
        throw new Error(`The ${protocol} adapter cannot handle this payload.`);
    return adapter.normalize(payload, context);
}
