import { Types, model } from 'mongoose';
import { ICUAdmissionModel, DeviceReadingModel, FlowsheetEntryModel, ICUScoreModel, FamilyCommunicationLogModel, } from './icu.model.js';
import { FlowEntrySource, ICUCaseStatus, } from './icu.types.js';
import { icuDeviceGatewayService } from './icu.device-gateway.service.js';
import { icuScoringService } from './icu.scoring.service.js';
import { publishEhrResource } from '../patient/ehr.publisher.js';
export class ICUService {
    validateObjectId(id, field) {
        if (!id || !Types.ObjectId.isValid(id))
            throw new Error(`Invalid ${field}.`);
        return id;
    }
    async assertHospitalMember(hospitalId, accountId) {
        this.validateObjectId(hospitalId, 'hospital ID');
        this.validateObjectId(accountId, 'actor ID');
        const account = await model('Account')
            .findOne({ _id: accountId, hospitalId })
            .select('_id')
            .lean();
        if (!account)
            throw new Error('The authenticated user does not belong to this hospital.');
    }
    async assertPatientBelongsToHospital(hospitalId, patientId) {
        this.validateObjectId(hospitalId, 'hospital ID');
        this.validateObjectId(patientId, 'patient ID');
        const patient = await model('Patient')
            .findOne({ _id: patientId, hospitalId })
            .select('_id')
            .lean();
        if (!patient)
            throw new Error('Patient does not belong to this hospital.');
    }
    async getAdmissionOrThrow(admissionId, hospitalId) {
        this.validateObjectId(admissionId, 'ICU admission ID');
        const admission = await ICUAdmissionModel.findOne({ _id: admissionId, hospitalId });
        if (!admission)
            throw new Error('ICU admission not found.');
        return admission;
    }
    async createAdmission(hospitalId, input) {
        await this.assertHospitalMember(hospitalId, input.admittedById);
        this.validateObjectId(input.patientId, 'patient ID');
        await this.assertPatientBelongsToHospital(hospitalId, input.patientId);
        if (!input.bedNumber?.trim())
            throw new Error('ICU bed number is required.');
        if (!input.primaryDiagnosis?.trim())
            throw new Error('Primary diagnosis is required.');
        if (input.attendingPhysicianId)
            this.validateObjectId(input.attendingPhysicianId, 'attending physician ID');
        if (input.sourceSurgeryCaseId)
            this.validateObjectId(input.sourceSurgeryCaseId, 'source surgery case ID');
        if (input.encounterId)
            this.validateObjectId(input.encounterId, 'encounter ID');
        const admission = await ICUAdmissionModel.create({
            hospitalId: new Types.ObjectId(hospitalId),
            patientId: new Types.ObjectId(input.patientId),
            bedNumber: input.bedNumber.trim(),
            careLevel: input.careLevel,
            primaryDiagnosis: input.primaryDiagnosis.trim(),
            attendingPhysicianId: input.attendingPhysicianId ? new Types.ObjectId(input.attendingPhysicianId) : undefined,
            admittedById: new Types.ObjectId(input.admittedById),
            vitals: input.vitals,
            ventilatorSettings: input.ventilatorSettings,
            sourceSurgeryCaseId: input.sourceSurgeryCaseId ? new Types.ObjectId(input.sourceSurgeryCaseId) : undefined,
            encounterId: input.encounterId ? new Types.ObjectId(input.encounterId) : undefined,
        });
        await publishEhrResource({
            hospitalId,
            patientId: input.patientId,
            actorId: input.admittedById,
            resourceType: 'Encounter',
            resourceId: admission._id.toString(),
            department: 'ICU',
            status: admission.status,
            resource: {
                type: 'ICUAdmission',
                id: admission._id.toString(),
                patientId: input.patientId,
                bedNumber: admission.bedNumber,
                careLevel: admission.careLevel,
                primaryDiagnosis: admission.primaryDiagnosis,
                admittedAt: admission.admittedAt,
                sourceSurgeryCaseId: input.sourceSurgeryCaseId,
            },
            reason: 'ICU admission created',
        });
        return admission;
    }
    async getAdmissions(hospitalId, query) {
        this.validateObjectId(hospitalId, 'hospital ID');
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(100, Math.max(1, query.limit || 20));
        const skip = (page - 1) * limit;
        const filter = { hospitalId: new Types.ObjectId(hospitalId) };
        if (query.status)
            filter.status = query.status;
        if (query.careLevel)
            filter.careLevel = query.careLevel;
        if (query.patientId)
            filter.patientId = this.validateObjectId(query.patientId, 'patient ID');
        if (query.bedNumber)
            filter.bedNumber = { $regex: query.bedNumber, $options: 'i' };
        const [admissions, total] = await Promise.all([
            ICUAdmissionModel.find(filter)
                .populate('patientId', 'firstName lastName mrn dateOfBirth gender bloodGroup phone')
                .populate('attendingPhysicianId', 'firstName lastName role')
                .populate('admittedById', 'firstName lastName role')
                .populate('transferredToWardId', 'name wardNumber')
                .sort({ admittedAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            ICUAdmissionModel.countDocuments(filter),
        ]);
        return { admissions, total, page, totalPages: Math.ceil(total / limit) };
    }
    async getAdmissionById(admissionId, hospitalId) {
        this.validateObjectId(admissionId, 'ICU admission ID');
        this.validateObjectId(hospitalId, 'hospital ID');
        return ICUAdmissionModel.findOne({ _id: admissionId, hospitalId })
            .populate('patientId', 'firstName lastName mrn dateOfBirth gender bloodGroup phone')
            .populate('attendingPhysicianId', 'firstName lastName role')
            .populate('admittedById', 'firstName lastName role')
            .populate('transferredToWardId', 'name wardNumber')
            .exec();
    }
    async updateVitals(admissionId, hospitalId, actorId, input) {
        await this.assertHospitalMember(hospitalId, actorId);
        const admission = await this.getAdmissionOrThrow(admissionId, hospitalId);
        const updated = await ICUAdmissionModel.findOneAndUpdate({ _id: admission._id, hospitalId, status: { $in: [ICUCaseStatus.ADMITTED, ICUCaseStatus.STABILIZED] } }, { $set: { vitals: input.vitals } }, { new: true }).exec();
        if (updated) {
            const entries = Object.entries(input.vitals || {}).filter(([, value]) => value !== undefined);
            if (entries.length) {
                await FlowsheetEntryModel.insertMany(entries.map(([parameter, value]) => ({
                    hospitalId: new Types.ObjectId(hospitalId),
                    admissionId: admission._id,
                    patientId: admission.patientId,
                    recordedAt: new Date(),
                    category: 'VITALS',
                    parameter,
                    value,
                    source: FlowEntrySource.MANUAL,
                    enteredById: new Types.ObjectId(actorId),
                    status: 'CONFIRMED',
                })));
            }
        }
        return updated;
    }
    async updateVentilatorSettings(admissionId, hospitalId, actorId, input) {
        await this.assertHospitalMember(hospitalId, actorId);
        const admission = await this.getAdmissionOrThrow(admissionId, hospitalId);
        return ICUAdmissionModel.findOneAndUpdate({ _id: admission._id, hospitalId, status: { $in: [ICUCaseStatus.ADMITTED, ICUCaseStatus.STABILIZED] } }, { $set: { ventilatorSettings: input.ventilatorSettings } }, { new: true }).exec();
    }
    async updateStatus(admissionId, hospitalId, actorId, input) {
        await this.assertHospitalMember(hospitalId, actorId);
        const admission = await this.getAdmissionOrThrow(admissionId, hospitalId);
        const activeStatuses = [ICUCaseStatus.ADMITTED, ICUCaseStatus.STABILIZED];
        const allowedTransitions = {
            [ICUCaseStatus.ADMITTED]: [ICUCaseStatus.STABILIZED, ICUCaseStatus.TRANSFERRED_OUT, ICUCaseStatus.DISCHARGED, ICUCaseStatus.DECEASED],
            [ICUCaseStatus.STABILIZED]: [ICUCaseStatus.TRANSFERRED_OUT, ICUCaseStatus.DISCHARGED, ICUCaseStatus.DECEASED],
        };
        if (admission.status !== input.status) {
            const allowed = allowedTransitions[admission.status] || [];
            if (!allowed.includes(input.status))
                throw new Error(`Invalid ICU status transition: ${admission.status} -> ${input.status}.`);
        }
        const updateData = { status: input.status };
        if (input.dispositionNotes !== undefined)
            updateData.dispositionNotes = input.dispositionNotes;
        if (input.transferredToWardId)
            updateData.transferredToWardId = new Types.ObjectId(this.validateObjectId(input.transferredToWardId, 'ward ID'));
        if (!activeStatuses.includes(input.status))
            updateData.dischargedAt = input.dischargedAt || new Date();
        const updated = await ICUAdmissionModel.findOneAndUpdate({ _id: admission._id, hospitalId }, { $set: updateData }, { new: true }).exec();
        if (updated) {
            await publishEhrResource({
                hospitalId,
                patientId: admission.patientId.toString(),
                actorId,
                resourceType: 'Encounter',
                resourceId: admission._id.toString(),
                department: 'ICU',
                status: updated.status,
                resource: {
                    type: 'ICUAdmission',
                    id: updated._id.toString(),
                    status: updated.status,
                    dischargedAt: updated.dischargedAt,
                    dispositionNotes: updated.dispositionNotes,
                },
                reason: 'ICU admission status updated',
            });
        }
        return updated;
    }
    async ingestDeviceReading(hospitalId, actorId, input) {
        await this.assertHospitalMember(hospitalId, actorId);
        return icuDeviceGatewayService.ingest(hospitalId, actorId, input);
    }
    async getDeviceReadings(hospitalId, admissionId, options) {
        this.validateObjectId(hospitalId, 'hospital ID');
        const admission = await this.getAdmissionOrThrow(admissionId, hospitalId);
        const filter = {
            'metadata.hospitalId': hospitalId,
            'metadata.admissionId': admission._id.toString(),
        };
        if (options.deviceId)
            filter.deviceId = options.deviceId;
        if (options.from || options.to) {
            filter.recordedAt = {};
            if (options.from)
                filter.recordedAt.$gte = new Date(options.from);
            if (options.to)
                filter.recordedAt.$lte = new Date(options.to);
        }
        const readings = await DeviceReadingModel.find(filter)
            .sort({ recordedAt: -1 })
            .limit(Math.min(5000, Math.max(1, options.limit || 1000)))
            .lean();
        if (!options.parameter)
            return readings;
        return readings
            .map((reading) => ({
            ...reading,
            measurements: reading.measurements.filter((m) => m.parameter === options.parameter),
        }))
            .filter((reading) => reading.measurements.length);
    }
    async getTrends(hospitalId, admissionId, options) {
        this.validateObjectId(hospitalId, 'hospital ID');
        if (!options.parameter?.trim())
            throw new Error('Trend parameter is required.');
        const admission = await this.getAdmissionOrThrow(admissionId, hospitalId);
        const filter = {
            'metadata.hospitalId': hospitalId,
            'metadata.admissionId': admission._id.toString(),
        };
        if (options.deviceId)
            filter.deviceId = options.deviceId;
        if (options.from || options.to) {
            filter.recordedAt = {};
            if (options.from)
                filter.recordedAt.$gte = new Date(options.from);
            if (options.to)
                filter.recordedAt.$lte = new Date(options.to);
        }
        const readings = await DeviceReadingModel.find(filter)
            .sort({ recordedAt: 1 })
            .limit(Math.min(10000, Math.max(1, options.limit || 5000)))
            .lean();
        const points = [];
        for (const reading of readings) {
            const measurement = reading.measurements.find((m) => m.parameter === options.parameter);
            if (measurement) {
                points.push({
                    recordedAt: reading.recordedAt,
                    value: measurement.value,
                    unit: measurement.unit,
                    deviceId: reading.deviceId,
                    quality: reading.quality,
                });
            }
        }
        return points;
    }
    async getFlowsheet(hospitalId, admissionId, options) {
        this.validateObjectId(hospitalId, 'hospital ID');
        const admission = await this.getAdmissionOrThrow(admissionId, hospitalId);
        const filter = {
            hospitalId: new Types.ObjectId(hospitalId),
            admissionId: admission._id,
        };
        if (options.parameter)
            filter.parameter = options.parameter;
        if (options.status)
            filter.status = options.status;
        if (options.from || options.to) {
            filter.recordedAt = {};
            if (options.from)
                filter.recordedAt.$gte = new Date(options.from);
            if (options.to)
                filter.recordedAt.$lte = new Date(options.to);
        }
        return FlowsheetEntryModel.find(filter)
            .sort({ recordedAt: -1 })
            .limit(Math.min(5000, Math.max(1, options.limit || 1000)))
            .populate('enteredById', 'firstName lastName role')
            .populate('reviewedById', 'firstName lastName role')
            .lean();
    }
    async confirmFlowsheetEntry(hospitalId, actorId, entryId, annotation) {
        await this.assertHospitalMember(hospitalId, actorId);
        this.validateObjectId(entryId, 'flowsheet entry ID');
        return FlowsheetEntryModel.findOneAndUpdate({ _id: entryId, hospitalId: new Types.ObjectId(hospitalId) }, {
            $set: {
                status: 'CONFIRMED',
                reviewedById: new Types.ObjectId(actorId),
                reviewedAt: new Date(),
                ...(annotation !== undefined ? { annotation } : {}),
            },
        }, { new: true }).exec();
    }
    async addFlowsheetEntry(hospitalId, actorId, input) {
        await this.assertHospitalMember(hospitalId, actorId);
        const admission = await this.getAdmissionOrThrow(input.admissionId, hospitalId);
        const recordedAt = new Date(input.recordedAt);
        if (Number.isNaN(recordedAt.getTime()))
            throw new Error('Invalid flowsheet timestamp.');
        return FlowsheetEntryModel.create({
            hospitalId: new Types.ObjectId(hospitalId),
            admissionId: admission._id,
            patientId: admission.patientId,
            recordedAt,
            category: input.category,
            parameter: input.parameter,
            value: input.value,
            unit: input.unit,
            source: input.source || FlowEntrySource.MANUAL,
            sourceDeviceReadingId: input.sourceDeviceReadingId ? new Types.ObjectId(input.sourceDeviceReadingId) : undefined,
            enteredById: new Types.ObjectId(actorId),
            annotation: input.annotation,
            status: input.source === FlowEntrySource.DEVICE ? 'PENDING_REVIEW' : 'CONFIRMED',
        });
    }
    async recalculateScores(hospitalId, actorId, input) {
        await this.assertHospitalMember(hospitalId, actorId);
        return icuScoringService.recalculate(hospitalId, actorId, input);
    }
    async recalculateScoresFromUnderlyingData(hospitalId, actorId, admissionId) {
        await this.assertHospitalMember(hospitalId, actorId);
        return icuScoringService.recalculateFromUnderlyingData(hospitalId, actorId, admissionId);
    }
    async getScores(hospitalId, admissionId, scoreType) {
        this.validateObjectId(hospitalId, 'hospital ID');
        const admission = await this.getAdmissionOrThrow(admissionId, hospitalId);
        const filter = {
            hospitalId: new Types.ObjectId(hospitalId),
            admissionId: admission._id,
        };
        if (scoreType)
            filter.scoreType = scoreType;
        return ICUScoreModel.find(filter).sort({ calculatedAt: -1 }).limit(100).lean();
    }
    async addFamilyCommunication(hospitalId, actorId, input) {
        await this.assertHospitalMember(hospitalId, actorId);
        const admission = await this.getAdmissionOrThrow(input.admissionId, hospitalId);
        if (!input.contactName?.trim())
            throw new Error('Family contact name is required.');
        if (!input.summary?.trim())
            throw new Error('Communication summary is required.');
        return FamilyCommunicationLogModel.create({
            hospitalId: new Types.ObjectId(hospitalId),
            admissionId: admission._id,
            patientId: admission.patientId,
            communicatedById: new Types.ObjectId(actorId),
            contactName: input.contactName.trim(),
            relationship: input.relationship?.trim(),
            contactMethod: input.contactMethod,
            topics: input.topics || [],
            summary: input.summary.trim(),
            questionsOrConcerns: input.questionsOrConcerns?.trim(),
            followUpRequired: Boolean(input.followUpRequired),
            followUpPlan: input.followUpPlan?.trim(),
        });
    }
    async getFamilyCommunications(hospitalId, admissionId) {
        this.validateObjectId(hospitalId, 'hospital ID');
        const admission = await this.getAdmissionOrThrow(admissionId, hospitalId);
        return FamilyCommunicationLogModel.find({
            hospitalId: new Types.ObjectId(hospitalId),
            admissionId: admission._id,
        })
            .sort({ communicatedAt: -1 })
            .populate('communicatedById', 'firstName lastName role')
            .lean();
    }
    async getDashboard(hospitalId, admissionId) {
        const admission = await this.getAdmissionById(admissionId, hospitalId);
        if (!admission) {
            throw new Error('ICU admission not found.');
        }
        this.validateObjectId(hospitalId, 'hospital ID');
        this.validateObjectId(admissionId, 'ICU admission ID');
        const hospitalObjectId = new Types.ObjectId(hospitalId);
        const admissionObjectId = new Types.ObjectId(admissionId);
        const [latestReadings, recentFlowsheet, latestScores, familyCommunications,] = await Promise.all([
            DeviceReadingModel.find({
                hospitalId: hospitalObjectId,
                admissionId: admissionObjectId,
            })
                .sort({ recordedAt: -1 })
                .limit(100)
                .exec(),
            FlowsheetEntryModel.find({
                hospitalId: hospitalObjectId,
                admissionId: admissionObjectId,
            })
                .sort({ recordedAt: -1 })
                .limit(250)
                .populate('enteredById', 'firstName lastName role')
                .populate('reviewedById', 'firstName lastName role')
                .exec(),
            ICUScoreModel.find({
                hospitalId: hospitalObjectId,
                admissionId: admissionObjectId,
            })
                .sort({ calculatedAt: -1 })
                .limit(100)
                .exec(),
            FamilyCommunicationLogModel.find({
                hospitalId: hospitalObjectId,
                admissionId: admissionObjectId,
            })
                .sort({ communicatedAt: -1 })
                .populate('communicatedById', 'firstName lastName role')
                .exec(),
        ]);
        return {
            admission,
            latestReadings,
            recentFlowsheet,
            latestScores,
            familyCommunications,
        };
    }
}
export const icuService = new ICUService();
