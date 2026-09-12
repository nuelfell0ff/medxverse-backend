import crypto from 'node:crypto';
import mongoose, { Types } from 'mongoose';
import { PatientModel, EncounterModel, ObservationModel, ConditionModel, MedicationStatementModel, DocumentReferenceModel, EhrEventModel, ConsentRecordModel, EhrAuditLogModel, PatientEhrViewModel, } from './patient.model.js';
const RESOURCE_MODELS = {
    Encounter: EncounterModel,
    Observation: ObservationModel,
    Condition: ConditionModel,
    MedicationStatement: MedicationStatementModel,
    DocumentReference: DocumentReferenceModel,
};
const RESTRICTED_CODES = new Set(['MENTAL_HEALTH', 'HIV', 'HIV_STATUS', 'PSYCHIATRIC']);
export class PatientService {
    static generateMRN() {
        return `MRN-${crypto.randomInt(100000, 1000000)}`;
    }
    static generateUniversalPatientId() {
        return `MPI-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    }
    static assertObjectId(value, fieldName) {
        if (!Types.ObjectId.isValid(value)) {
            const error = new Error(`Invalid ${fieldName}.`);
            error.statusCode = 400;
            throw error;
        }
    }
    static bad(message, statusCode = 400) {
        const error = new Error(message);
        error.statusCode = statusCode;
        throw error;
    }
    static normalizePhone(value) {
        return String(value || '').replace(/\s+/g, '').toLowerCase();
    }
    static normalizeName(value) {
        return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
    }
    static isSensitive(code, sensitive) {
        return Boolean(sensitive || (code && RESTRICTED_CODES.has(code.toUpperCase())));
    }
    static resourceModel(resourceType) {
        const model = RESOURCE_MODELS[resourceType];
        if (!model)
            this.bad(`Unsupported EHR resource type: ${resourceType}`);
        return model;
    }
    static async appendEvent(data, session) {
        const last = await EhrEventModel.findOne({
            patientId: new Types.ObjectId(data.patientId),
            resourceType: data.resourceType,
            resourceId: data.resourceId,
        }).sort({ version: -1 }).session(session || null);
        const version = (last?.version || 0) + 1;
        return EhrEventModel.create([{
                hospitalId: new Types.ObjectId(data.hospitalId),
                patientId: new Types.ObjectId(data.patientId),
                resourceType: data.resourceType,
                resourceId: data.resourceId,
                version,
                previousVersion: last?.version,
                action: data.action,
                recordedBy: new Types.ObjectId(data.recordedBy),
                department: data.department,
                encounterId: data.encounterId ? new Types.ObjectId(data.encounterId) : undefined,
                reason: data.reason,
                sensitive: Boolean(data.sensitive),
                sensitivityCode: data.sensitivityCode,
                changedFields: data.changedFields || [],
                resource: data.resource,
                occurredAt: new Date(),
            }], { session }).then((rows) => rows[0]);
    }
    static toFhirResource(resourceType, id, version, resource, lastUpdated, sensitive = false, sensitivityCode) {
        const normalized = { ...resource };
        delete normalized.resourceType;
        delete normalized.id;
        delete normalized.meta;
        return {
            resourceType,
            id,
            meta: {
                versionId: String(version),
                lastUpdated,
                security: sensitive
                    ? [{ system: 'urn:medxverse:security', code: sensitivityCode || 'RESTRICTED' }]
                    : [],
            },
            ...normalized,
        };
    }
    static async canViewSensitive(hospitalId, patientId, resourceType, sensitivityCode, actor) {
        const now = new Date();
        const query = {
            hospitalId: new Types.ObjectId(hospitalId),
            patientId: new Types.ObjectId(patientId),
            status: 'ACTIVE',
            resourceTypes: { $in: ['ALL', resourceType] },
            $or: [
                { grantedToUsers: new Types.ObjectId(actor.userId) },
                { grantedToRoles: actor.role || '__NONE__' },
            ],
            $and: [
                {
                    $or: [
                        { sensitivityCode: { $exists: false } },
                        { sensitivityCode: null },
                        { sensitivityCode: sensitivityCode || '__NONE__' },
                    ],
                },
                {
                    $or: [{ validFrom: { $exists: false } }, { validFrom: null }, { validFrom: { $lte: now } }],
                },
                {
                    $or: [{ validUntil: { $exists: false } }, { validUntil: null }, { validUntil: { $gte: now } }],
                },
            ],
        };
        return Boolean(await ConsentRecordModel.exists(query));
    }
    static async audit(hospitalId, patientId, actor, action, fields, allowed, reason, resourceType, resourceId) {
        if (!Types.ObjectId.isValid(actor.userId))
            return;
        await EhrAuditLogModel.create({
            hospitalId: new Types.ObjectId(hospitalId),
            patientId: new Types.ObjectId(patientId),
            actorId: new Types.ObjectId(actor.userId),
            action,
            fields,
            allowed,
            reason,
            resourceType,
            resourceId,
            occurredAt: new Date(),
        });
    }
    static async assertPatient(hospitalId, patientId) {
        this.assertObjectId(hospitalId, 'hospital ID');
        this.assertObjectId(patientId, 'patient ID');
        const patient = await PatientModel.findOne({
            _id: new Types.ObjectId(patientId),
            hospitalId: new Types.ObjectId(hospitalId),
        }).exec();
        if (!patient)
            this.bad('Patient record not found.', 404);
        if (!patient.active && patient.mergedInto) {
            this.bad(`Patient record has been merged into ${patient.mergedInto.toString()}.`, 409);
        }
        return patient;
    }
    static async registerPatient(hospitalId, dto, actor) {
        this.assertObjectId(hospitalId, 'hospital ID');
        if (!dto.firstName?.trim() || !dto.lastName?.trim())
            this.bad('First name and last name are required.');
        const dob = new Date(dto.dateOfBirth);
        if (Number.isNaN(dob.getTime()))
            this.bad('Invalid date of birth provided.');
        if (!Types.ObjectId.isValid(hospitalId))
            this.bad('Invalid hospital ID.');
        const duplicateCandidates = await this.findDuplicatePatients(hospitalId, {
            firstName: dto.firstName,
            lastName: dto.lastName,
            dateOfBirth: dto.dateOfBirth,
            phone: dto.phone,
            email: dto.email,
        });
        if (duplicateCandidates.length) {
            this.bad(`Potential duplicate patient detected. Use the duplicate-check/merge workflow before creating another canonical record. Candidate IDs: ${duplicateCandidates.map((x) => x.patient._id.toString()).join(', ')}`, 409);
        }
        let mrn = this.generateMRN();
        while (await PatientModel.exists({ mrn }))
            mrn = this.generateMRN();
        let universalPatientId = this.generateUniversalPatientId();
        while (await PatientModel.exists({ universalPatientId })) {
            universalPatientId = this.generateUniversalPatientId();
        }
        const patient = await PatientModel.create({
            hospitalId: new Types.ObjectId(hospitalId),
            universalPatientId,
            mrn,
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            dateOfBirth: dob,
            gender: dto.gender,
            phone: dto.phone.trim(),
            email: dto.email?.trim().toLowerCase(),
            address: dto.address,
            maritalStatus: dto.maritalStatus,
            occupation: dto.occupation,
            nextOfKin: dto.nextOfKin,
            informant: dto.informant,
            bloodGroup: dto.bloodGroup,
            genotype: dto.genotype,
            policyNumber: dto.policyNumber,
            hmoId: dto.hmoId ? new Types.ObjectId(dto.hmoId) : undefined,
            active: true,
        });
        if (actor) {
            await this.appendEvent({
                hospitalId,
                patientId: patient._id.toString(),
                resourceType: 'Patient',
                resourceId: patient._id.toString(),
                action: 'CREATE',
                recordedBy: actor.userId,
                resource: this.patientToFhir(patient),
            });
            await this.refreshEhrView(hospitalId, patient._id.toString());
        }
        return patient;
    }
    static async updatePatient(hospitalId, patientId, actor, dto) {
        const patient = await this.assertPatient(hospitalId, patientId);
        const fields = [
            'firstName', 'lastName', 'gender', 'phone', 'email', 'address',
            'maritalStatus', 'occupation', 'nextOfKin', 'informant',
            'bloodGroup', 'genotype', 'policyNumber', 'isFlagged', 'flagReason',
        ];
        for (const field of fields) {
            if (dto[field] !== undefined)
                patient[field] = dto[field];
        }
        if (dto.dateOfBirth !== undefined) {
            const date = new Date(dto.dateOfBirth);
            if (Number.isNaN(date.getTime()))
                this.bad('Invalid date of birth provided.');
            patient.dateOfBirth = date;
        }
        if (dto.hmoId !== undefined) {
            if (!Types.ObjectId.isValid(dto.hmoId))
                this.bad('Invalid HMO provider ID.');
            patient.hmoId = new Types.ObjectId(dto.hmoId);
        }
        await patient.save();
        await this.appendEvent({
            hospitalId,
            patientId,
            resourceType: 'Patient',
            resourceId: patientId,
            action: 'UPDATE',
            recordedBy: actor.userId,
            reason: dto.reason,
            changedFields: Object.keys(dto).filter((key) => key !== 'reason'),
            resource: this.patientToFhir(patient),
        });
        await this.audit(hospitalId, patientId, actor, 'WRITE', Object.keys(dto).filter((key) => key !== 'reason'), true, dto.reason, 'Patient', patientId);
        await this.refreshEhrView(hospitalId, patientId);
        return patient;
    }
    static async getPatients(hospitalId, query) {
        this.assertObjectId(hospitalId, 'hospital ID');
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
        const skip = (page - 1) * limit;
        const filter = {
            hospitalId: new Types.ObjectId(hospitalId),
            active: true,
        };
        if (query.search?.trim()) {
            const escaped = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filter.$or = [
                { firstName: { $regex: escaped, $options: 'i' } },
                { lastName: { $regex: escaped, $options: 'i' } },
                { mrn: { $regex: escaped, $options: 'i' } },
                { universalPatientId: { $regex: escaped, $options: 'i' } },
                { phone: { $regex: escaped, $options: 'i' } },
                { email: { $regex: escaped, $options: 'i' } },
            ];
        }
        const [patients, total] = await Promise.all([
            PatientModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
            PatientModel.countDocuments(filter).exec(),
        ]);
        return { patients, total, page, limit, pages: Math.ceil(total / limit) };
    }
    static async getPatientById(hospitalId, patientId) {
        return this.assertPatient(hospitalId, patientId);
    }
    static async addVitals(hospitalId, patientId, userId, dto) {
        this.assertObjectId(userId, 'user ID');
        const patient = await this.assertPatient(hospitalId, patientId);
        const vitals = {
            ...dto,
            recordedBy: new Types.ObjectId(userId),
            recordedAt: new Date(),
            encounterId: dto.encounterId && Types.ObjectId.isValid(dto.encounterId)
                ? new Types.ObjectId(dto.encounterId)
                : undefined,
        };
        // Keep the legacy history for compatibility, while the EHR Observation is authoritative.
        patient.vitalsHistory.push(vitals);
        await patient.save();
        await this.appendEvent({
            hospitalId,
            patientId,
            resourceType: 'Observation',
            resourceId: new Types.ObjectId().toString(),
            action: 'CREATE',
            recordedBy: userId,
            encounterId: dto.encounterId,
            reason: 'Vital signs recorded',
            changedFields: Object.keys(dto),
            resource: {
                status: 'final',
                category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
                code: { coding: [{ system: 'http://loinc.org', code: 'vital-sign-panel', display: 'Vital signs panel' }] },
                subject: { reference: `Patient/${patientId}` },
                encounter: dto.encounterId ? { reference: `Encounter/${dto.encounterId}` } : undefined,
                effectiveDateTime: new Date().toISOString(),
                value: dto,
            },
        });
        await this.refreshEhrView(hospitalId, patientId);
        return patient;
    }
    static async createEncounter(hospitalId, actor, dto) {
        await this.assertPatient(hospitalId, dto.patientId);
        if (dto.practitionerId)
            this.assertObjectId(dto.practitionerId, 'practitioner ID');
        const resourceId = new Types.ObjectId().toString();
        const sensitive = this.isSensitive(undefined, dto.sensitive);
        const data = {
            resourceType: 'Encounter',
            id: resourceId,
            status: dto.status || 'in-progress',
            class: { code: dto.class || 'AMB', display: dto.class || 'Ambulatory' },
            type: [{ text: dto.encounterType }],
            subject: { reference: `Patient/${dto.patientId}` },
            participant: dto.practitionerId
                ? [{ individual: { reference: `Practitioner/${dto.practitionerId}` } }]
                : [],
            period: {
                start: dto.start || new Date().toISOString(),
                ...(dto.end ? { end: dto.end } : {}),
            },
            reasonCode: dto.reason ? [{ text: dto.reason }] : [],
            diagnosis: dto.diagnosis ? [{ condition: { display: dto.diagnosis } }] : [],
            extension: [
                { url: 'urn:medxverse:department', valueString: dto.department || 'GENERAL' },
                ...(dto.metadata ? [{ url: 'urn:medxverse:metadata', valueJson: dto.metadata }] : []),
            ],
        };
        const model = EncounterModel;
        await model.create({
            hospitalId: new Types.ObjectId(hospitalId),
            patientId: new Types.ObjectId(dto.patientId),
            resourceId,
            version: 1,
            status: dto.status || 'in-progress',
            data,
            recordedBy: new Types.ObjectId(actor.userId),
            department: dto.department,
            sensitive,
        });
        await this.appendEvent({
            hospitalId,
            patientId: dto.patientId,
            resourceType: 'Encounter',
            resourceId,
            action: 'CREATE',
            recordedBy: actor.userId,
            department: dto.department,
            sensitive,
            changedFields: Object.keys(data),
            resource: data,
        });
        await this.audit(hospitalId, dto.patientId, actor, 'WRITE', Object.keys(data), true, 'Encounter created', 'Encounter', resourceId);
        await this.refreshEhrView(hospitalId, dto.patientId);
        return data;
    }
    static async createEHRResource(hospitalId, actor, dto) {
        if (dto.resourceType === 'Patient')
            this.bad('Patient resources must be changed through the Patient endpoint.');
        const patientId = dto.patientId;
        await this.assertPatient(hospitalId, patientId);
        if (dto.encounterId)
            await this.assertEncounterBelongsToPatient(hospitalId, dto.encounterId, patientId);
        const resourceId = dto.id || new Types.ObjectId().toString();
        const sensitive = this.isSensitive(dto.sensitivityCode, dto.sensitive);
        const now = new Date();
        const resource = this.toFhirResource(dto.resourceType, resourceId, 1, dto.resource, now, sensitive, dto.sensitivityCode);
        const model = this.resourceModel(dto.resourceType);
        await model.create({
            hospitalId: new Types.ObjectId(hospitalId),
            patientId: new Types.ObjectId(patientId),
            encounterId: dto.encounterId ? new Types.ObjectId(dto.encounterId) : undefined,
            resourceId,
            version: 1,
            status: dto.status || resource.status,
            code: dto.code || resource.code?.coding?.[0],
            sensitive,
            sensitivityCode: dto.sensitivityCode,
            data: resource,
            recordedBy: new Types.ObjectId(actor.userId),
            department: dto.department,
        });
        await this.appendEvent({
            hospitalId,
            patientId,
            resourceType: dto.resourceType,
            resourceId,
            action: 'CREATE',
            recordedBy: actor.userId,
            department: dto.department,
            encounterId: dto.encounterId,
            reason: dto.reason,
            sensitive,
            sensitivityCode: dto.sensitivityCode,
            changedFields: Object.keys(dto.resource),
            resource,
        });
        await this.audit(hospitalId, patientId, actor, 'WRITE', Object.keys(dto.resource), true, dto.reason, dto.resourceType, resourceId);
        await this.refreshEhrView(hospitalId, patientId);
        return resource;
    }
    static async updateEHRResource(hospitalId, actor, resourceType, resourceId, dto) {
        const model = this.resourceModel(resourceType);
        const current = await model.findOne({
            hospitalId: new Types.ObjectId(hospitalId),
            resourceId,
        }).sort({ version: -1 }).exec();
        if (!current)
            this.bad('EHR resource not found.', 404);
        const nextVersion = current.version + 1;
        const sensitive = this.isSensitive(dto.sensitivityCode || current.sensitivityCode, dto.sensitive ?? current.sensitive);
        const resource = this.toFhirResource(resourceType, resourceId, nextVersion, dto.resource, new Date(), sensitive, dto.sensitivityCode || current.sensitivityCode);
        await model.create({
            hospitalId: current.hospitalId,
            patientId: current.patientId,
            encounterId: current.encounterId,
            resourceId,
            version: nextVersion,
            status: resource.status,
            code: resource.code?.coding?.[0],
            sensitive,
            sensitivityCode: dto.sensitivityCode || current.sensitivityCode,
            data: resource,
            recordedBy: new Types.ObjectId(actor.userId),
            department: current.department,
        });
        await this.appendEvent({
            hospitalId,
            patientId: current.patientId.toString(),
            resourceType,
            resourceId,
            action: 'UPDATE',
            recordedBy: actor.userId,
            department: current.department,
            encounterId: current.encounterId?.toString(),
            reason: dto.reason,
            sensitive,
            sensitivityCode: dto.sensitivityCode || current.sensitivityCode,
            changedFields: Object.keys(dto.resource),
            resource,
        });
        await this.audit(hospitalId, current.patientId.toString(), actor, 'WRITE', Object.keys(dto.resource), true, dto.reason, resourceType, resourceId);
        await this.refreshEhrView(hospitalId, current.patientId.toString());
        return resource;
    }
    static async getEHRChart(hospitalId, patientId, actor, options) {
        const patient = await this.assertPatient(hospitalId, patientId);
        const events = await EhrEventModel.find({
            hospitalId: new Types.ObjectId(hospitalId),
            patientId: new Types.ObjectId(patientId),
        }).sort({ occurredAt: 1, version: 1 }).lean().exec();
        const latest = new Map();
        for (const event of events) {
            if (event.resourceType === 'Patient')
                continue;
            const key = `${event.resourceType}:${event.resourceId}`;
            if (event.action === 'DELETE')
                latest.delete(key);
            else
                latest.set(key, event.resource);
        }
        const resources = {
            Patient: [this.patientToFhir(patient)],
            Encounter: [],
            Observation: [],
            Condition: [],
            MedicationStatement: [],
            DocumentReference: [],
        };
        const timeline = [];
        for (const event of events) {
            if (event.resourceType === 'Patient')
                continue;
            const allowed = !event.sensitive || (options?.includeSensitive !== false &&
                await this.canViewSensitive(hospitalId, patientId, event.resourceType, event.sensitivityCode, actor));
            if (!allowed)
                continue;
            const resource = event.resource;
            timeline.push({
                eventId: String(event._id),
                resourceType: event.resourceType,
                resourceId: event.resourceId,
                version: event.version,
                action: event.action,
                occurredAt: event.occurredAt,
                recordedBy: String(event.recordedBy),
                department: event.department,
                resource,
            });
        }
        for (const [key, resource] of latest.entries()) {
            const [resourceType] = key.split(':');
            const event = events.find((item) => item.resourceType === resourceType && item.resourceId === key.split(':')[1] && item.version === Number(resource.meta?.versionId));
            if (resourceType && resources[resourceType]) {
                const allowed = !event?.sensitive || await this.canViewSensitive(hospitalId, patientId, resourceType, event?.sensitivityCode, actor);
                if (allowed)
                    resources[resourceType].push(resource);
            }
        }
        await this.audit(hospitalId, patientId, actor, 'READ', ['*'], true, options?.includeSensitive === false ? 'Clinical chart requested without sensitive segments.' : 'Clinical chart requested.');
        return {
            patient,
            resources,
            timeline: timeline.sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()),
            resourceCount: Object.values(resources).reduce((sum, list) => sum + list.length, 0) - 1,
        };
    }
    static async getResourceVersions(hospitalId, patientId, resourceType, resourceId, actor) {
        await this.assertPatient(hospitalId, patientId);
        const events = await EhrEventModel.find({
            hospitalId: new Types.ObjectId(hospitalId),
            patientId: new Types.ObjectId(patientId),
            resourceType,
            resourceId,
        }).sort({ version: 1 }).lean().exec();
        if (!events.length)
            this.bad('EHR resource history not found.', 404);
        const allowed = !events.some((e) => e.sensitive) ||
            await this.canViewSensitive(hospitalId, patientId, resourceType, events.find((e) => e.sensitive)?.sensitivityCode, actor);
        if (!allowed) {
            await this.audit(hospitalId, patientId, actor, 'READ', ['*'], false, 'Additional consent required.', resourceType, resourceId);
            this.bad('Additional consent is required to view this clinical segment.', 403);
        }
        await this.audit(hospitalId, patientId, actor, 'READ', ['*'], true, 'Resource version history requested.', resourceType, resourceId);
        return events;
    }
    static async createConsent(hospitalId, actor, dto) {
        await this.assertPatient(hospitalId, dto.patientId);
        const grantedToUsers = (dto.grantedToUsers || []).map((id) => {
            this.assertObjectId(id, 'granted user ID');
            return new Types.ObjectId(id);
        });
        const consent = await ConsentRecordModel.create({
            hospitalId: new Types.ObjectId(hospitalId),
            patientId: new Types.ObjectId(dto.patientId),
            status: dto.status,
            resourceTypes: dto.resourceTypes,
            sensitivityCode: dto.sensitivityCode,
            grantedToRoles: dto.grantedToRoles || [],
            grantedToUsers,
            validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
            validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
            purpose: dto.purpose,
            notes: dto.notes,
            createdBy: new Types.ObjectId(actor.userId),
        });
        await this.audit(hospitalId, dto.patientId, actor, 'CONSENT', ['consent'], true, 'Consent record created.');
        return consent;
    }
    static async revokeConsent(hospitalId, consentId, actor) {
        this.assertObjectId(consentId, 'consent ID');
        const consent = await ConsentRecordModel.findOne({
            _id: new Types.ObjectId(consentId),
            hospitalId: new Types.ObjectId(hospitalId),
        }).exec();
        if (!consent)
            this.bad('Consent record not found.', 404);
        consent.status = 'REVOKED';
        await consent.save();
        await this.appendEvent({
            hospitalId,
            patientId: consent.patientId.toString(),
            resourceType: 'Patient',
            resourceId: consent.patientId.toString(),
            action: 'AMEND',
            recordedBy: actor.userId,
            reason: `Consent ${consentId} revoked`,
            resource: this.patientToFhir(await this.assertPatient(hospitalId, consent.patientId.toString())),
        });
        await this.audit(hospitalId, consent.patientId.toString(), actor, 'CONSENT', ['status'], true, `Consent ${consentId} revoked.`);
        return consent;
    }
    static async findDuplicatePatients(hospitalId, input) {
        this.assertObjectId(hospitalId, 'hospital ID');
        const clauses = [];
        const firstName = this.normalizeName(input.firstName);
        const lastName = this.normalizeName(input.lastName);
        const phone = this.normalizePhone(input.phone);
        const email = String(input.email || '').trim().toLowerCase();
        const dob = input.dateOfBirth ? new Date(input.dateOfBirth) : undefined;
        if (phone)
            clauses.push({ phone });
        if (email)
            clauses.push({ email });
        if (firstName && lastName && dob && !Number.isNaN(dob.getTime())) {
            clauses.push({
                firstName: new RegExp(`^${firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
                lastName: new RegExp(`^${lastName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
                dateOfBirth: dob,
            });
        }
        if (!clauses.length)
            return [];
        const filter = {
            hospitalId: new Types.ObjectId(hospitalId),
            active: true,
            $or: clauses,
        };
        if (input.patientId && Types.ObjectId.isValid(input.patientId)) {
            filter._id = { $ne: new Types.ObjectId(input.patientId) };
        }
        const patients = await PatientModel.find(filter).limit(20).exec();
        return patients.map((patient) => {
            let score = 0;
            const reasons = [];
            if (phone && this.normalizePhone(patient.phone) === phone) {
                score += 50;
                reasons.push('phone');
            }
            if (email && String(patient.email || '').toLowerCase() === email) {
                score += 40;
                reasons.push('email');
            }
            if (firstName && this.normalizeName(patient.firstName) === firstName) {
                score += 15;
                reasons.push('firstName');
            }
            if (lastName && this.normalizeName(patient.lastName) === lastName) {
                score += 15;
                reasons.push('lastName');
            }
            if (dob && patient.dateOfBirth.getTime() === dob.getTime()) {
                score += 25;
                reasons.push('dateOfBirth');
            }
            return { patient, score: Math.min(100, score), reasons };
        }).sort((a, b) => b.score - a.score);
    }
    static async mergePatients(hospitalId, actor, sourcePatientId, targetPatientId, reason) {
        this.assertObjectId(sourcePatientId, 'source patient ID');
        this.assertObjectId(targetPatientId, 'target patient ID');
        if (sourcePatientId === targetPatientId)
            this.bad('A patient cannot be merged into itself.');
        const session = await mongoose.startSession();
        try {
            session.startTransaction();
            const source = await PatientModel.findOne({
                _id: new Types.ObjectId(sourcePatientId),
                hospitalId: new Types.ObjectId(hospitalId),
                active: true,
            }).session(session).exec();
            const target = await PatientModel.findOne({
                _id: new Types.ObjectId(targetPatientId),
                hospitalId: new Types.ObjectId(hospitalId),
                active: true,
            }).session(session).exec();
            if (!source || !target)
                this.bad('Both source and target patient records must exist and be active.', 404);
            // Move patient references in all currently registered collections that expose patientId.
            for (const [name, model] of Object.entries(mongoose.models)) {
                if (['Patient', 'EhrEvent', 'ConsentRecord', 'PatientEhrView'].includes(name))
                    continue;
                if (!model.schema.path('patientId'))
                    continue;
                await model.updateMany({
                    hospitalId: new Types.ObjectId(hospitalId),
                    patientId: new Types.ObjectId(sourcePatientId),
                }, { $set: { patientId: new Types.ObjectId(targetPatientId) } }, { session });
            }
            await EhrEventModel.updateMany({
                hospitalId: new Types.ObjectId(hospitalId),
                patientId: new Types.ObjectId(sourcePatientId),
            }, { $set: { patientId: new Types.ObjectId(targetPatientId) } }, { session });
            source.active = false;
            source.mergedInto = target._id;
            await source.save({ session });
            await this.appendEvent({
                hospitalId,
                patientId: targetPatientId,
                resourceType: 'Patient',
                resourceId: targetPatientId,
                action: 'MERGE',
                recordedBy: actor.userId,
                reason,
                resource: {
                    ...this.patientToFhir(target),
                    extension: [{ url: 'urn:medxverse:merged-patient', valueReference: { reference: `Patient/${sourcePatientId}` } }],
                },
            }, session);
            await session.commitTransaction();
            await this.refreshEhrView(hospitalId, targetPatientId);
            return { sourcePatientId, targetPatientId, status: 'MERGED' };
        }
        catch (error) {
            await session.abortTransaction();
            throw error;
        }
        finally {
            await session.endSession();
        }
    }
    static async getClinicalSummary(hospitalId, patientId, actor) {
        const chart = await this.getEHRChart(hospitalId, patientId, actor);
        const legacy = await this.getLegacyClinicalSummary(hospitalId, patientId, actor);
        return {
            encounters: chart.resources.Encounter.map((r) => this.resourceSummary('Encounter', r)),
            observations: chart.resources.Observation.map((r) => this.resourceSummary('Observation', r)),
            conditions: chart.resources.Condition.map((r) => this.resourceSummary('Condition', r)),
            medications: chart.resources.MedicationStatement.map((r) => this.resourceSummary('MedicationStatement', r)),
            documents: chart.resources.DocumentReference.map((r) => this.resourceSummary('DocumentReference', r)),
            legacy,
        };
    }
    static patientToFhir(patient) {
        return {
            resourceType: 'Patient',
            id: patient._id.toString(),
            identifier: [
                { system: 'urn:medxverse:mpi', value: patient.universalPatientId },
                { system: 'urn:medxverse:mrn', value: patient.mrn },
            ],
            active: patient.active,
            name: [{ family: patient.lastName, given: [patient.firstName] }],
            birthDate: patient.dateOfBirth.toISOString().slice(0, 10),
            gender: patient.gender.toLowerCase(),
            telecom: [
                { system: 'phone', value: patient.phone },
                ...(patient.email ? [{ system: 'email', value: patient.email }] : []),
            ],
            address: patient.address ? [{ text: patient.address }] : [],
            extension: [
                ...(patient.bloodGroup ? [{ url: 'urn:medxverse:blood-group', valueString: patient.bloodGroup }] : []),
                ...(patient.genotype ? [{ url: 'urn:medxverse:genotype', valueString: patient.genotype }] : []),
                ...(patient.mergedInto ? [{ url: 'urn:medxverse:merged-into', valueReference: { reference: `Patient/${patient.mergedInto}` } }] : []),
            ],
            meta: { versionId: 'latest', lastUpdated: patient.updatedAt },
        };
    }
    static resourceSummary(resourceType, resource) {
        const title = resource.code?.coding?.[0]?.display ||
            resource.type?.[0]?.text ||
            resource.medicationCodeableConcept?.text ||
            resource.description ||
            resource.content?.[0]?.attachment?.title ||
            resourceType;
        const date = resource.effectiveDateTime ||
            resource.period?.start ||
            resource.authoredOn ||
            resource.date ||
            resource.meta?.lastUpdated;
        return {
            id: resource.id,
            resourceType,
            date,
            title: String(title),
            status: resource.status,
            summary: resource.note?.[0]?.text || resource.text?.div || resource.description,
            details: resource,
        };
    }
    static async refreshEhrView(hospitalId, patientId) {
        const events = await EhrEventModel.find({
            hospitalId: new Types.ObjectId(hospitalId),
            patientId: new Types.ObjectId(patientId),
        }).sort({ occurredAt: 1, version: 1 }).lean().exec();
        const latest = new Map();
        const timeline = [];
        for (const event of events) {
            const key = `${event.resourceType}:${event.resourceId}`;
            if (event.action === 'DELETE')
                latest.delete(key);
            else if (event.resourceType !== 'Patient')
                latest.set(key, event.resource);
            if (event.resourceType !== 'Patient') {
                timeline.push({
                    eventId: String(event._id),
                    resourceType: event.resourceType,
                    resourceId: event.resourceId,
                    version: event.version,
                    action: event.action,
                    occurredAt: event.occurredAt,
                    department: event.department,
                    sensitive: event.sensitive,
                    sensitivityCode: event.sensitivityCode,
                    resource: event.resource,
                });
            }
        }
        const patient = await PatientModel.findById(patientId).lean().exec();
        if (!patient)
            return;
        const resources = {
            Patient: [this.patientToFhir(patient)],
            Encounter: [],
            Observation: [],
            Condition: [],
            MedicationStatement: [],
            DocumentReference: [],
        };
        for (const resource of latest.values()) {
            if (resources[resource.resourceType])
                resources[resource.resourceType].push(resource);
        }
        await PatientEhrViewModel.findOneAndUpdate({ 'patient._id': new Types.ObjectId(patientId) }, {
            $set: {
                patient,
                resources,
                timeline,
                resourceCount: latest.size,
            },
        }, { upsert: true, new: true, setDefaultsOnInsert: true }).exec();
    }
    static async assertEncounterBelongsToPatient(hospitalId, encounterId, patientId) {
        this.assertObjectId(encounterId, 'encounter ID');
        const encounter = await EncounterModel.findOne({
            hospitalId: new Types.ObjectId(hospitalId),
            patientId: new Types.ObjectId(patientId),
            resourceId: encounterId,
        }).exec();
        if (!encounter)
            this.bad('Encounter does not belong to this patient.', 400);
    }
    static async getLegacyClinicalSummary(hospitalId, patientId, actor) {
        const [surgery, radiology, laboratory, pharmacy, outpatient, billing] = await Promise.all([
            this.getDepartmentSummary('surgery', hospitalId, patientId, actor),
            this.getDepartmentSummary('radiology', hospitalId, patientId, actor),
            this.getDepartmentSummary('laboratory', hospitalId, patientId, actor),
            this.getDepartmentSummary('pharmacy', hospitalId, patientId, actor),
            this.getDepartmentSummary('outpatient', hospitalId, patientId, actor),
            this.getBillingSummary(hospitalId, patientId),
        ]);
        return { surgery, radiology, laboratory, pharmacy, outpatient, billing };
    }
    static async getDepartmentSummary(department, hospitalId, patientId, actor) {
        const modelNames = {
            surgery: ['Surgery', 'SurgeryRecord', 'SurgicalProcedure'],
            radiology: ['RadiologyOrder', 'Radiology'],
            laboratory: ['LabOrder', 'LabTest', 'LaboratoryTest', 'Laboratory'],
            pharmacy: ['DispenseRecord', 'PharmacyDispense', 'PharmacyPrescription', 'Prescription', 'Dispense'],
            outpatient: ['Outpatient', 'OutpatientEncounter', 'Consultation'],
        };
        const model = modelNames[department].map((name) => mongoose.models[name]).find(Boolean);
        if (!model)
            return [];
        try {
            const rows = await model.find({
                hospitalId: new Types.ObjectId(hospitalId),
                patientId: new Types.ObjectId(patientId),
            }).sort({ createdAt: -1 }).limit(50).lean().exec();
            return rows.map((row) => ({
                id: row._id ? String(row._id) : undefined,
                resourceType: department,
                date: row.createdAt || row.updatedAt || row.reportedAt || row.completedAt || row.date,
                title: String(row.testName || row.procedureName || row.medicationName || row.drugName ||
                    row.reasonForVisit || row.visitReason || row.serviceName || department),
                status: row.status || row.resultStatus,
                summary: row.impression || row.findings || row.resultSummary || row.result ||
                    row.consultationNotes || row.clinicalNotes || row.notes || row.assessment || row.plan,
                details: row,
            }));
        }
        catch {
            return [];
        }
    }
    static async getBillingSummary(hospitalId, patientId) {
        const model = ['BillingCharge', 'Charge', 'Billing'].map((name) => mongoose.models[name]).find(Boolean);
        if (!model)
            return { totalCharges: 0, totalPaid: 0, balance: 0, items: [] };
        try {
            const rows = await model.find({
                hospitalId: new Types.ObjectId(hospitalId),
                patientId: new Types.ObjectId(patientId),
            }).sort({ createdAt: -1 }).limit(100).lean().exec();
            const amount = (row) => Number(row.totalAmount ?? row.amount ?? row.chargeAmount ?? row.price ?? row.total ?? 0) || 0;
            const paid = (row) => Number(row.amountPaid ?? row.paidAmount ?? row.paid ?? row.paymentAmount ?? 0) || 0;
            const totalCharges = rows.reduce((sum, row) => sum + amount(row), 0);
            const totalPaid = rows.reduce((sum, row) => sum + paid(row), 0);
            return {
                totalCharges,
                totalPaid,
                balance: Math.max(0, totalCharges - totalPaid),
                items: rows.map((row) => ({
                    id: row._id ? String(row._id) : undefined,
                    resourceType: 'billing',
                    date: row.chargeDate || row.createdAt,
                    title: String(row.description || row.serviceName || row.serviceCode || 'Patient charge'),
                    status: row.status,
                    summary: `Charged: ${amount(row)}; Paid: ${paid(row)}; Balance: ${Math.max(0, amount(row) - paid(row))}`,
                    details: row,
                })),
            };
        }
        catch {
            return { totalCharges: 0, totalPaid: 0, balance: 0, items: [] };
        }
    }
}
