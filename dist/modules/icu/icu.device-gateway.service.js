import { createHash } from 'crypto';
import { Types } from 'mongoose';
import { normalizeDevicePayload } from './icu.device-adapters.js';
import { ICUAdmissionModel, DeviceReadingModel, FlowsheetEntryModel, } from './icu.model.js';
import { DeviceProtocol, FlowEntrySource, ICUDeviceType, ReadingQuality, } from './icu.types.js';
/**
 * Vendor-neutral device gateway boundary.
 *
 * Adapters for HL7, IEEE 11073 and vendor APIs should convert their payloads
 * into NormalizedDevicePayload before persistence. The ICU domain does not
 * depend on vendor-specific field names or transport protocols.
 */
export class ICUDeviceGatewayService {
    normalize(input) {
        const recordedAt = input.recordedAt
            ? new Date(input.recordedAt)
            : new Date();
        if (Number.isNaN(recordedAt.getTime())) {
            throw new Error('Invalid device reading timestamp.');
        }
        if (!input.deviceId?.trim()) {
            throw new Error('Device ID is required.');
        }
        const protocol = input.protocol || DeviceProtocol.VENDOR_API;
        const quality = input.quality || ReadingQuality.VALID;
        const measurements = input.measurements?.length
            ? input.measurements
            : input.payload !== undefined
                ? normalizeDevicePayload(protocol, input.payload, {
                    deviceId: input.deviceId.trim(),
                    deviceType: input.deviceType,
                })
                : [];
        if (!measurements.length) {
            throw new Error('At least one device measurement is required.');
        }
        const payloadString = input.payload
            ? typeof input.payload === 'string'
                ? input.payload
                : JSON.stringify(input.payload)
            : JSON.stringify(measurements);
        const rawPayloadHash = createHash('sha256')
            .update(payloadString)
            .digest('hex');
        return {
            deviceId: input.deviceId.trim(),
            deviceType: input.deviceType,
            protocol,
            manufacturer: input.manufacturer?.trim(),
            model: input.model?.trim(),
            recordedAt,
            sourceSequence: input.sourceSequence,
            measurements,
            quality,
            rawPayloadHash,
            metadata: {
                ...(input.metadata || {}),
                deviceId: input.deviceId.trim(),
                deviceType: input.deviceType,
            },
        };
    }
    async ingest(hospitalId, actorId, input) {
        if (!Types.ObjectId.isValid(hospitalId) ||
            !Types.ObjectId.isValid(actorId)) {
            throw new Error('Invalid hospital or actor ID.');
        }
        if (!Types.ObjectId.isValid(input.admissionId)) {
            throw new Error('Invalid ICU admission ID.');
        }
        /*
         * Explicitly type the lean result.
         *
         * findOne() returns one document (or null), but because the underlying
         * model typing is broad, TypeScript was previously inferring a possible
         * array here. The generic supplied to lean() describes the actual shape
         * required by this service.
         */
        const admission = await ICUAdmissionModel.findOne({
            _id: input.admissionId,
            hospitalId,
            status: {
                $in: ['ADMITTED', 'STABILIZED'],
            },
        }).lean();
        if (!admission) {
            throw new Error('Active ICU admission not found.');
        }
        const normalized = this.normalize(input);
        const metadata = {
            ...(normalized.metadata || {}),
            hospitalId,
            admissionId: input.admissionId,
            patientId: admission.patientId.toString(),
        };
        // Sequence numbers allow upstream gateways to retry safely.
        if (normalized.sourceSequence) {
            const duplicate = await DeviceReadingModel.findOne({
                'metadata.hospitalId': hospitalId,
                'metadata.admissionId': input.admissionId,
                deviceId: normalized.deviceId,
                sourceSequence: normalized.sourceSequence,
            }).lean();
            if (duplicate) {
                return duplicate;
            }
        }
        const reading = await DeviceReadingModel.create({
            hospitalId: new Types.ObjectId(hospitalId),
            admissionId: new Types.ObjectId(input.admissionId),
            patientId: admission.patientId,
            ...normalized,
            metadata,
            receivedAt: new Date(),
        });
        // Device data pre-populates the nurse flowsheet.
        // Each generated entry remains reviewable and traceable
        // to its originating device reading.
        const flowEntries = normalized.measurements.map((measurement) => ({
            hospitalId: new Types.ObjectId(hospitalId),
            admissionId: new Types.ObjectId(input.admissionId),
            patientId: admission.patientId,
            recordedAt: normalized.recordedAt,
            category: this.categoryFor(normalized.deviceType, measurement.parameter),
            parameter: measurement.parameter,
            value: measurement.value,
            unit: measurement.unit,
            source: FlowEntrySource.DEVICE,
            sourceDeviceReadingId: reading._id,
            status: 'PENDING_REVIEW',
        }));
        if (flowEntries.length) {
            await FlowsheetEntryModel.insertMany(flowEntries);
        }
        return reading;
    }
    categoryFor(deviceType, parameter) {
        if (deviceType === ICUDeviceType.VENTILATOR) {
            return 'VENTILATION';
        }
        if (deviceType === ICUDeviceType.INFUSION_PUMP) {
            return 'INFUSION';
        }
        if (/bp|pressure|heart|pulse|spo2|oxygen|temp|resp|ecg|rhythm/i.test(parameter)) {
            return 'VITALS';
        }
        return 'DEVICE';
    }
}
export const icuDeviceGatewayService = new ICUDeviceGatewayService();
