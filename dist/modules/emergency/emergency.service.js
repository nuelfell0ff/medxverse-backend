import { Types } from 'mongoose';
import { BayAssignmentStatus, TriageScale, DispositionType, EDBayStatus, EDOrderStatus, EDVisitStatus, WorkflowStatus, } from './emergency.types.js';
import { EDVisitModel, TriageAssessmentModel, EDBayModel, BayAssignmentModel, EDOrderModel, DispositionRecordModel, } from './emergency.model.js';
import { publishEhrResource } from '../patient/ehr.publisher.js';
import { emergencyEvents } from './emergency.events.js';
const ACTIVE_VISIT_STATUSES = [
    EDVisitStatus.ARRIVED,
    EDVisitStatus.TRIAGED,
    EDVisitStatus.WAITING_FOR_BAY,
    EDVisitStatus.IN_BAY,
    EDVisitStatus.IN_TREATMENT,
    EDVisitStatus.AWAITING_RESULTS,
    EDVisitStatus.READY_FOR_DISPOSITION,
];
const TERMINAL_STATUSES = [
    EDVisitStatus.ADMITTED,
    EDVisitStatus.DISCHARGED,
    EDVisitStatus.TRANSFERRED,
    EDVisitStatus.DECEASED,
    EDVisitStatus.LEFT_WITHOUT_BEING_SEEN,
    EDVisitStatus.LEFT_AGAINST_MEDICAL_ADVICE,
];
const ALLOWED_TRANSITIONS = {
    [EDVisitStatus.ARRIVED]: [EDVisitStatus.TRIAGED, EDVisitStatus.LEFT_WITHOUT_BEING_SEEN],
    [EDVisitStatus.TRIAGED]: [EDVisitStatus.WAITING_FOR_BAY, EDVisitStatus.IN_BAY, EDVisitStatus.LEFT_WITHOUT_BEING_SEEN],
    [EDVisitStatus.WAITING_FOR_BAY]: [EDVisitStatus.IN_BAY, EDVisitStatus.LEFT_WITHOUT_BEING_SEEN],
    [EDVisitStatus.IN_BAY]: [EDVisitStatus.IN_TREATMENT, EDVisitStatus.LEFT_WITHOUT_BEING_SEEN],
    [EDVisitStatus.IN_TREATMENT]: [EDVisitStatus.AWAITING_RESULTS, EDVisitStatus.READY_FOR_DISPOSITION, EDVisitStatus.IN_BAY],
    [EDVisitStatus.AWAITING_RESULTS]: [EDVisitStatus.IN_TREATMENT, EDVisitStatus.READY_FOR_DISPOSITION],
    [EDVisitStatus.READY_FOR_DISPOSITION]: [EDVisitStatus.ADMITTED, EDVisitStatus.DISCHARGED, EDVisitStatus.TRANSFERRED, EDVisitStatus.DECEASED, EDVisitStatus.LEFT_AGAINST_MEDICAL_ADVICE],
    [EDVisitStatus.ADMITTED]: [],
    [EDVisitStatus.DISCHARGED]: [],
    [EDVisitStatus.TRANSFERRED]: [],
    [EDVisitStatus.DECEASED]: [],
    [EDVisitStatus.LEFT_WITHOUT_BEING_SEEN]: [],
    [EDVisitStatus.LEFT_AGAINST_MEDICAL_ADVICE]: [],
};
function toObjectId(id) {
    if (!Types.ObjectId.isValid(id))
        throw new Error(`Invalid ObjectId: ${id}`);
    return new Types.ObjectId(id);
}
function calculatePriorityScore(acuityLevel, arrivalAt) {
    const acuityWeight = acuityLevel ? (6 - Number(acuityLevel)) * 1000 : 0;
    const waitMinutes = Math.max(0, Math.floor((Date.now() - arrivalAt.getTime()) / 60000));
    return acuityWeight + waitMinutes;
}
function resourceMatches(required, capabilities) {
    return Object.entries(required).every(([key, value]) => value !== true || capabilities[key] === true);
}
export class EmergencyService {
    async createVisit(input) {
        const hospitalId = toObjectId(input.hospitalId);
        const visitNumber = await this.generateVisitNumber(input.hospitalId);
        const arrivalAt = new Date();
        const visit = await EDVisitModel.create({
            hospitalId,
            patientId: input.patientId ? toObjectId(input.patientId) : undefined,
            visitNumber,
            isUnidentified: Boolean(input.isUnidentified),
            temporaryIdentifier: input.temporaryIdentifier,
            arrivalAt,
            arrivalMode: input.arrivalMode,
            chiefComplaint: input.chiefComplaint,
            traumaType: input.traumaType,
            status: EDVisitStatus.ARRIVED,
            attendingClinicianId: input.attendingClinicianId ? toObjectId(input.attendingClinicianId) : undefined,
            resourceNeeds: input.resourceNeeds || {},
            priorityScore: calculatePriorityScore(undefined, arrivalAt),
            statusTransitions: [{ to: EDVisitStatus.ARRIVED, changedAt: arrivalAt, changedBy: toObjectId(input.actorId), reason: 'ED visit created.' }],
            notes: input.notes,
        });
        await this.publishVisitToEhr(visit, input.actorId);
        this.emitBoardChanged(input.hospitalId, 'ED_VISIT_CREATED', String(visit._id));
        return visit;
    }
    async createTriage(visitId, hospitalId, actorId, input) {
        // Validate identifiers before querying MongoDB so malformed IDs return a
        // useful 400 instead of an opaque Mongoose CastError/ValidationError.
        const visitObjectId = toObjectId(visitId);
        const hospitalObjectId = toObjectId(hospitalId);
        const actorObjectId = toObjectId(actorId);
        const visit = await EDVisitModel.findOne({
            _id: visitObjectId,
            hospitalId: hospitalObjectId,
        });
        if (!visit)
            throw new Error('ED visit not found.');
        if (TERMINAL_STATUSES.includes(visit.status)) {
            throw new Error('Cannot triage a closed ED visit.');
        }
        const scale = typeof input.scale === 'string' ? input.scale.trim().toUpperCase() : '';
        if (!Object.values(TriageScale).includes(scale)) {
            throw new Error('Triage scale must be ESI or CTAS.');
        }
        const acuityLevel = Number(input.acuityLevel);
        if (!Number.isInteger(acuityLevel) || acuityLevel < 1 || acuityLevel > 5) {
            throw new Error('Acuity level must be an integer between 1 and 5.');
        }
        const chiefComplaint = String(input.chiefComplaint ?? visit.chiefComplaint ?? '').trim();
        if (!chiefComplaint) {
            throw new Error('Chief complaint is required before triage can be saved.');
        }
        // Only persist fields that exist in ResourceNeedsSchema. This prevents
        // frontend payloads with unknown resource keys from causing inconsistent
        // Mongo documents.
        const sourceNeeds = input.resourceNeeds ?? visit.resourceNeeds ?? {};
        const resourceNeeds = {
            resuscitation: sourceNeeds.resuscitation === true,
            cardiacMonitor: sourceNeeds.cardiacMonitor === true,
            oxygen: sourceNeeds.oxygen === true,
            isolation: sourceNeeds.isolation === true,
            negativePressure: sourceNeeds.negativePressure === true,
            bariatric: sourceNeeds.bariatric === true,
            pediatric: sourceNeeds.pediatric === true,
            mentalHealthSafeSpace: sourceNeeds.mentalHealthSafeSpace === true,
        };
        const safeVitals = input.vitals
            ? Object.fromEntries(Object.entries(input.vitals)
                .filter(([, value]) => value !== undefined &&
                value !== null &&
                value !== '' &&
                Number.isFinite(Number(value)))
                .map(([key, value]) => [key, Number(value)]))
            : undefined;
        // Build the document first and validate it explicitly. This gives us the
        // same Mongoose validation rules as save/create, but lets the controller
        // expose the exact field-level reason when validation fails.
        const triageDocument = new TriageAssessmentModel({
            hospitalId: hospitalObjectId,
            visitId: visitObjectId,
            patientId: visit.patientId,
            scale: scale,
            acuityLevel: acuityLevel,
            chiefComplaint,
            vitals: safeVitals,
            resourceNeeds,
            assessedById: actorObjectId,
            assessedAt: new Date(),
            isReassessment: Boolean(visit.currentTriageAssessmentId),
            notes: input.notes ? String(input.notes).trim() || undefined : undefined,
        });
        const validationError = triageDocument.validateSync();
        if (validationError) {
            const messages = Object.values(validationError.errors).map((error) => {
                const validation = error;
                return validation.message || 'Invalid triage data.';
            });
            throw new Error(`Triage validation failed: ${messages.join('; ')}`);
        }
        const triage = await triageDocument.save();
        visit.currentTriageAssessmentId = triage._id;
        visit.currentAcuityLevel = acuityLevel;
        visit.resourceNeeds = resourceNeeds;
        visit.priorityScore = calculatePriorityScore(acuityLevel, visit.arrivalAt);
        if (visit.status === EDVisitStatus.ARRIVED) {
            this.appendStatusTransition(visit, EDVisitStatus.TRIAGED, actorId, 'Initial triage completed.');
        }
        await visit.save();
        await this.publishTriageToEhr(visit, triage, actorId);
        this.emitBoardChanged(hospitalId, 'TRIAGE_UPDATED', String(visit._id));
        return triage;
    }
    async createBay(hospitalId, actorId, input) {
        void actorId;
        const capacity = Math.max(1, Math.floor(Number(input.capacity) || 1));
        return EDBayModel.create({
            hospitalId: toObjectId(hospitalId),
            bayCode: input.bayCode?.trim(),
            name: input.name?.trim(),
            zone: input.zone?.trim(),
            type: input.type?.trim(),
            capacity,
            occupiedCount: 0,
            status: EDBayStatus.AVAILABLE,
            supportedAcuityLevels: input.supportedAcuityLevels || [1, 2, 3, 4, 5],
            resourceCapabilities: input.resourceCapabilities || {},
            notes: input.notes?.trim(),
        });
    }
    async getBays(hospitalId) {
        const bays = await EDBayModel.find({ hospitalId }).sort({ zone: 1, bayCode: 1 }).lean().exec();
        if (!bays.length)
            return [];
        const bayIds = bays.map((bay) => bay._id);
        const assignments = await BayAssignmentModel.find({
            hospitalId,
            bayId: { $in: bayIds },
            status: BayAssignmentStatus.ASSIGNED,
        }).select('bayId').lean().exec();
        const occupancy = new Map();
        assignments.forEach((assignment) => {
            if (!assignment.bayId)
                return;
            const key = String(assignment.bayId);
            occupancy.set(key, (occupancy.get(key) || 0) + 1);
        });
        return bays.map((bay) => {
            const capacity = Math.max(1, Number(bay.capacity) || 1);
            const occupiedCount = occupancy.get(String(bay._id)) || 0;
            const availableCapacity = Math.max(0, capacity - occupiedCount);
            const status = availableCapacity > 0 ? EDBayStatus.AVAILABLE : EDBayStatus.OCCUPIED;
            return { ...bay, capacity, occupiedCount, availableCapacity, status };
        });
    }
    async assignBay(visitId, hospitalId, actorId, input) {
        const visit = await EDVisitModel.findOne({ _id: visitId, hospitalId });
        if (!visit)
            throw new Error('ED visit not found.');
        if (TERMINAL_STATUSES.includes(visit.status))
            throw new Error('Cannot assign a bay to a closed ED visit.');
        if (!visit.currentAcuityLevel)
            throw new Error('Complete triage before assigning a bay.');
        const existingAssignment = await BayAssignmentModel.findOne({
            hospitalId,
            visitId: visit._id,
            status: BayAssignmentStatus.ASSIGNED,
        }).sort({ assignedAt: -1 }).exec();
        if (existingAssignment && input.bayId && String(existingAssignment.bayId) === String(input.bayId)) {
            return existingAssignment;
        }
        if (existingAssignment && input.bayCode && existingAssignment.bayCode === input.bayCode) {
            return existingAssignment;
        }
        const bay = await this.selectBay(hospitalId, visit.currentAcuityLevel, visit.resourceNeeds, input);
        if (!bay)
            throw new Error('No suitable ED bay capacity is currently available.');
        // Release an old assignment only after a valid target bay has been selected.
        if (existingAssignment) {
            existingAssignment.status = BayAssignmentStatus.RELEASED;
            existingAssignment.releasedAt = new Date();
            existingAssignment.reason = 'Reassigned to another ED bay.';
            await existingAssignment.save();
            if (existingAssignment.bayId) {
                await this.recalculateBayOccupancy(existingAssignment.bayId, hospitalId);
            }
        }
        // Reserve one capacity slot atomically so two concurrent assignments cannot
        // consume the same final slot.
        const reservedBay = await EDBayModel.findOneAndUpdate({
            _id: bay._id,
            hospitalId,
            $expr: { $lt: [{ $ifNull: ['$occupiedCount', 0] }, { $ifNull: ['$capacity', 1] }] },
        }, { $inc: { occupiedCount: 1 } }, { new: true }).exec();
        if (!reservedBay)
            throw new Error('No suitable ED bay capacity is currently available.');
        try {
            const assignment = await BayAssignmentModel.create({
                hospitalId: toObjectId(hospitalId),
                visitId: visit._id,
                patientId: visit.patientId,
                bayId: reservedBay._id,
                bayCode: reservedBay.bayCode,
                assignedById: toObjectId(actorId),
                assignedAt: new Date(),
                status: BayAssignmentStatus.ASSIGNED,
                reason: input.reason,
            });
            const full = Number(reservedBay.occupiedCount) >= Math.max(1, Number(reservedBay.capacity) || 1);
            await EDBayModel.updateOne({ _id: reservedBay._id, hospitalId }, { $set: { status: full ? EDBayStatus.OCCUPIED : EDBayStatus.AVAILABLE } }).exec();
            visit.currentBayAssignmentId = assignment._id;
            if (visit.status === EDVisitStatus.TRIAGED || visit.status === EDVisitStatus.WAITING_FOR_BAY) {
                this.appendStatusTransition(visit, EDVisitStatus.IN_BAY, actorId, 'ED bay assigned.');
            }
            visit.priorityScore = calculatePriorityScore(visit.currentAcuityLevel, visit.arrivalAt);
            await visit.save();
            this.emitBoardChanged(hospitalId, 'BAY_ASSIGNED', String(visit._id));
            return assignment;
        }
        catch (error) {
            await EDBayModel.updateOne({ _id: reservedBay._id, hospitalId }, { $inc: { occupiedCount: -1 }, $set: { status: EDBayStatus.AVAILABLE } }).exec();
            throw error;
        }
    }
    async releaseBay(visitId, hospitalId, actorId, reason) {
        const assignment = await BayAssignmentModel.findOne({ hospitalId, visitId, status: BayAssignmentStatus.ASSIGNED }).sort({ assignedAt: -1 });
        if (!assignment)
            return null;
        assignment.status = BayAssignmentStatus.RELEASED;
        assignment.releasedAt = new Date();
        assignment.reason = reason || assignment.reason;
        await assignment.save();
        if (assignment.bayId) {
            await this.recalculateBayOccupancy(assignment.bayId, hospitalId);
        }
        await EDVisitModel.updateOne({ _id: visitId, hospitalId }, { $unset: { currentBayAssignmentId: 1 } });
        this.emitBoardChanged(hospitalId, 'BAY_RELEASED', visitId);
        void actorId;
        return assignment;
    }
    async createOrder(visitId, hospitalId, actorId, input) {
        const visit = await EDVisitModel.findOne({ _id: visitId, hospitalId });
        if (!visit)
            throw new Error('ED visit not found.');
        const order = await EDOrderModel.create({
            hospitalId: toObjectId(hospitalId),
            visitId: visit._id,
            patientId: visit.patientId,
            type: input.type,
            name: input.name,
            status: EDOrderStatus.ORDERED,
            sourceSystem: input.sourceSystem,
            sourceRecordId: input.sourceRecordId,
            orderedById: toObjectId(actorId),
            orderedAt: new Date(),
            notes: input.notes,
        });
        if (visit.status === EDVisitStatus.IN_TREATMENT) {
            this.appendStatusTransition(visit, EDVisitStatus.AWAITING_RESULTS, actorId, 'Pending ED order created.');
            await visit.save();
        }
        this.emitBoardChanged(hospitalId, 'ORDER_CREATED', String(visit._id));
        return order;
    }
    async updateOrder(orderId, hospitalId, actorId, input) {
        const order = await EDOrderModel.findOne({ _id: orderId, hospitalId });
        if (!order)
            return null;
        order.status = input.status;
        if (input.status === EDOrderStatus.IN_PROGRESS && !order.startedAt)
            order.startedAt = new Date();
        if ([EDOrderStatus.COMPLETED, EDOrderStatus.RESULTED].includes(input.status)) {
            order.completedAt = order.completedAt || new Date();
        }
        if (input.resultSummary !== undefined)
            order.resultSummary = input.resultSummary;
        if (input.notes !== undefined)
            order.notes = input.notes;
        await order.save();
        const pendingCount = await EDOrderModel.countDocuments({
            hospitalId,
            visitId: order.visitId,
            status: { $in: [EDOrderStatus.ORDERED, EDOrderStatus.IN_PROGRESS] },
        });
        if (pendingCount === 0) {
            const visit = await EDVisitModel.findOne({
                _id: order.visitId,
                hospitalId,
                status: EDVisitStatus.AWAITING_RESULTS,
            });
            if (visit) {
                this.appendStatusTransition(visit, EDVisitStatus.READY_FOR_DISPOSITION, actorId, 'All active ED orders completed or resulted.');
                await visit.save();
            }
        }
        this.emitBoardChanged(hospitalId, 'ORDER_UPDATED', order.visitId.toString());
        return order;
    }
    async updateStatus(visitId, hospitalId, actorId, input) {
        const visit = await EDVisitModel.findOne({ _id: visitId, hospitalId });
        if (!visit)
            return null;
        const currentStatus = visit.status;
        const nextStatus = input.status;
        if (currentStatus !== nextStatus && !ALLOWED_TRANSITIONS[currentStatus].includes(nextStatus)) {
            throw new Error(`Invalid ED status transition: ${currentStatus} -> ${nextStatus}`);
        }
        if (currentStatus !== nextStatus) {
            this.appendStatusTransition(visit, nextStatus, actorId, input.reason);
        }
        if (TERMINAL_STATUSES.includes(nextStatus))
            visit.closedAt = new Date();
        await visit.save();
        if (TERMINAL_STATUSES.includes(nextStatus))
            await this.releaseBay(visitId, hospitalId, actorId, 'ED visit closed.');
        await this.publishVisitToEhr(visit, actorId);
        this.emitBoardChanged(hospitalId, 'STATUS_CHANGED', String(visit._id));
        return visit;
    }
    async recordDisposition(visitId, hospitalId, actorId, input) {
        const visit = await EDVisitModel.findOne({ _id: visitId, hospitalId });
        if (!visit)
            throw new Error('ED visit not found.');
        if (TERMINAL_STATUSES.includes(visit.status))
            throw new Error('Disposition has already been completed.');
        const targetStatus = this.dispositionToStatus(input.disposition);
        const currentStatus = visit.status;
        if (!ALLOWED_TRANSITIONS[currentStatus].includes(targetStatus)) {
            throw new Error(`Visit is not ready for disposition from status ${visit.status}.`);
        }
        const workflow = this.workflowForDisposition(input.disposition);
        const record = await DispositionRecordModel.create({
            hospitalId: toObjectId(hospitalId),
            visitId: visit._id,
            patientId: visit.patientId,
            disposition: input.disposition,
            decidedById: toObjectId(actorId),
            decidedAt: new Date(),
            notes: input.notes,
            wardId: input.wardId ? toObjectId(input.wardId) : undefined,
            transferFacility: input.transferFacility,
            workflowStatus: workflow ? WorkflowStatus.TRIGGERED : WorkflowStatus.COMPLETED,
        });
        this.appendStatusTransition(visit, targetStatus, actorId, input.notes || `Disposition: ${input.disposition}`);
        if (workflow) {
            visit.downstreamWorkflows.push({ workflow, status: WorkflowStatus.TRIGGERED, triggeredAt: new Date(), referenceId: String(record._id) });
        }
        visit.closedAt = new Date();
        await visit.save();
        await this.publishDispositionToEhr(visit, record, actorId);
        this.emitBoardChanged(hospitalId, 'DISPOSITION_RECORDED', String(visit._id));
        // The event is the integration boundary. Bed Management, Discharge Planning and Referral
        // listeners can subscribe without coupling the ED module to those modules.
        if (workflow)
            emergencyEvents.emit('downstream.workflow', {
                hospitalId,
                visitId: String(visit._id),
                dispositionId: String(record._id),
                workflow,
                patientId: visit.patientId?.toString(),
                wardId: input.wardId ? String(input.wardId) : undefined,
                requirements: {
                    acuityLevel: visit.currentAcuityLevel,
                    ...(visit.resourceNeeds || {}),
                },
                decidedById: actorId,
            });
        return record;
    }
    async getBoard(hospitalId, query) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(100, Math.max(1, query.limit || 50));
        const filter = { hospitalId, status: { $in: ACTIVE_VISIT_STATUSES } };
        if (query.status)
            filter.status = query.status;
        if (query.acuityLevel)
            filter.currentAcuityLevel = query.acuityLevel;
        let visits = await EDVisitModel.find(filter)
            .populate('patientId', 'firstName lastName mrn dateOfBirth gender phone bloodGroup')
            .populate('attendingClinicianId', 'firstName lastName role')
            .sort({ priorityScore: -1, arrivalAt: 1 })
            .lean()
            .exec();
        if (query.zone) {
            const zoneBays = await EDBayModel.find({ hospitalId, zone: query.zone }).select('_id').lean().exec();
            const ids = new Set(zoneBays.map((bay) => String(bay._id)));
            const assignments = await BayAssignmentModel.find({ hospitalId, status: BayAssignmentStatus.ASSIGNED, bayId: { $in: zoneBays.map((b) => b._id) } }).select('visitId').lean().exec();
            const visitIds = new Set(assignments.map((a) => a.visitId.toString()));
            visits = visits.filter((v) => !v.currentBayAssignmentId || visitIds.has(String(v._id)));
            void ids;
        }
        const total = visits.length;
        const pagedVisits = visits.slice((page - 1) * limit, page * limit);
        const visitIds = pagedVisits.map((v) => v._id);
        const [triages, assignments, orders] = await Promise.all([
            TriageAssessmentModel.find({ hospitalId, visitId: { $in: visitIds } }).sort({ assessedAt: -1 }).lean().exec(),
            BayAssignmentModel.find({ hospitalId, visitId: { $in: visitIds }, status: BayAssignmentStatus.ASSIGNED }).sort({ assignedAt: -1 }).lean().exec(),
            EDOrderModel.find({ hospitalId, visitId: { $in: visitIds }, status: { $nin: [EDOrderStatus.CANCELLED] } }).sort({ orderedAt: -1 }).lean().exec(),
        ]);
        const latestTriage = new Map();
        triages.forEach((item) => { if (!latestTriage.has(item.visitId.toString()))
            latestTriage.set(item.visitId.toString(), item); });
        const latestBay = new Map();
        assignments.forEach((item) => { if (!latestBay.has(item.visitId.toString()))
            latestBay.set(item.visitId.toString(), item); });
        const orderMap = new Map();
        orders.forEach((item) => {
            const key = item.visitId.toString();
            const list = orderMap.get(key) || [];
            list.push(item);
            orderMap.set(key, list);
        });
        const items = pagedVisits.map((visit) => ({
            visit: visit,
            patient: visit.patientId,
            triage: latestTriage.get(String(visit._id)) || null,
            bay: latestBay.get(String(visit._id)) || null,
            orders: orderMap.get(String(visit._id)) || [],
            waitTimeMinutes: Math.max(0, Math.floor((Date.now() - new Date(visit.arrivalAt).getTime()) / 60000)),
            priorityScore: calculatePriorityScore(visit.currentAcuityLevel, new Date(visit.arrivalAt)),
        }));
        return {
            items,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            boardVersion: new Date().toISOString(),
            serverTime: new Date().toISOString(),
        };
    }
    async getVisits(hospitalId, query) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(100, Math.max(1, query.limit || 20));
        const filter = { hospitalId };
        if (query.status)
            filter.status = query.status;
        if (query.acuityLevel)
            filter.currentAcuityLevel = query.acuityLevel;
        if (query.patientId)
            filter.patientId = toObjectId(query.patientId);
        if (query.visitNumber)
            filter.visitNumber = { $regex: query.visitNumber, $options: 'i' };
        const [visits, total] = await Promise.all([
            EDVisitModel.find(filter)
                .populate('patientId', 'firstName lastName mrn dateOfBirth gender phone')
                .populate('attendingClinicianId', 'firstName lastName role')
                .sort({ arrivalAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .exec(),
            EDVisitModel.countDocuments(filter),
        ]);
        return { visits, total, page, totalPages: Math.ceil(total / limit) };
    }
    async getVisitById(visitId, hospitalId) {
        const visit = await EDVisitModel.findOne({ _id: visitId, hospitalId })
            .populate('patientId', 'firstName lastName mrn dateOfBirth gender phone bloodGroup genotype allergies')
            .populate('attendingClinicianId', 'firstName lastName role')
            .exec();
        if (!visit)
            return null;
        const [triages, assignments, orders, dispositions] = await Promise.all([
            TriageAssessmentModel.find({ hospitalId, visitId }).sort({ assessedAt: -1 }).exec(),
            BayAssignmentModel.find({ hospitalId, visitId }).sort({ assignedAt: -1 }).exec(),
            EDOrderModel.find({ hospitalId, visitId }).sort({ orderedAt: -1 }).exec(),
            DispositionRecordModel.find({ hospitalId, visitId }).sort({ decidedAt: -1 }).exec(),
        ]);
        return { visit, triages, assignments, orders, dispositions };
    }
    async getStatusHistory(visitId, hospitalId) {
        const visit = await EDVisitModel.findOne({ _id: visitId, hospitalId }).select('statusTransitions').lean().exec();
        const history = visit;
        return history?.statusTransitions ?? [];
    }
    async selectBay(hospitalId, acuity, resourceNeeds, input) {
        const filter = {
            hospitalId,
            supportedAcuityLevels: acuity,
        };
        if (input.bayId)
            filter._id = toObjectId(input.bayId);
        if (input.bayCode)
            filter.bayCode = input.bayCode;
        const bays = await EDBayModel.find(filter).sort({ zone: 1, bayCode: 1 }).exec();
        if (!bays.length)
            return null;
        const bayIds = bays.map((bay) => bay._id);
        const assignments = await BayAssignmentModel.find({
            hospitalId,
            bayId: { $in: bayIds },
            status: BayAssignmentStatus.ASSIGNED,
        }).select('bayId').lean().exec();
        const occupancy = new Map();
        assignments.forEach((assignment) => {
            if (!assignment.bayId)
                return;
            const key = String(assignment.bayId);
            occupancy.set(key, (occupancy.get(key) || 0) + 1);
        });
        return bays.find((bay) => {
            const capacity = Math.max(1, Number(bay.capacity) || 1);
            const occupiedCount = occupancy.get(String(bay._id)) || 0;
            return occupiedCount < capacity && resourceMatches(resourceNeeds, bay.resourceCapabilities || {});
        }) || null;
    }
    async recalculateBayOccupancy(bayId, hospitalId) {
        const occupiedCount = await BayAssignmentModel.countDocuments({
            hospitalId,
            bayId,
            status: BayAssignmentStatus.ASSIGNED,
        });
        const bay = await EDBayModel.findOne({ _id: bayId, hospitalId })
            .select('capacity')
            .lean()
            .exec();
        if (!bay)
            return;
        // Mongoose's lean() inference can widen findOne() to a document/array union
        // in this project. Narrow it explicitly because this query returns one bay.
        const bayCapacity = bay.capacity;
        const capacity = Math.max(1, Number(bayCapacity) || 1);
        await EDBayModel.updateOne({ _id: bayId, hospitalId }, {
            $set: {
                occupiedCount,
                status: occupiedCount >= capacity ? EDBayStatus.OCCUPIED : EDBayStatus.AVAILABLE,
            },
        }).exec();
    }
    appendStatusTransition(visit, to, actorId, reason) {
        const from = visit.status;
        visit.status = to;
        visit.statusTransitions.push({ from, to, changedAt: new Date(), changedBy: toObjectId(actorId), reason });
    }
    dispositionToStatus(disposition) {
        const map = {
            [DispositionType.ADMIT]: EDVisitStatus.ADMITTED,
            [DispositionType.DISCHARGE]: EDVisitStatus.DISCHARGED,
            [DispositionType.TRANSFER]: EDVisitStatus.TRANSFERRED,
            [DispositionType.DECEASED]: EDVisitStatus.DECEASED,
            [DispositionType.LEFT_WITHOUT_BEING_SEEN]: EDVisitStatus.LEFT_WITHOUT_BEING_SEEN,
            [DispositionType.LEFT_AGAINST_MEDICAL_ADVICE]: EDVisitStatus.LEFT_AGAINST_MEDICAL_ADVICE,
        };
        return map[disposition];
    }
    workflowForDisposition(disposition) {
        if (disposition === DispositionType.ADMIT)
            return 'BED_MANAGEMENT';
        if (disposition === DispositionType.DISCHARGE)
            return 'DISCHARGE_PLANNING';
        if (disposition === DispositionType.TRANSFER)
            return 'REFERRAL';
        return undefined;
    }
    async generateVisitNumber(hospitalId) {
        const date = new Date();
        const prefix = `ED-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
        const count = await EDVisitModel.countDocuments({ hospitalId, visitNumber: { $regex: `^${prefix}-` } });
        return `${prefix}-${String(count + 1).padStart(4, '0')}`;
    }
    async publishVisitToEhr(visit, actorId) {
        if (!visit.patientId)
            return;
        await publishEhrResource({
            hospitalId: visit.hospitalId.toString(),
            patientId: visit.patientId.toString(),
            actorId,
            role: 'EMERGENCY',
            resourceType: 'Encounter',
            resourceId: String(visit._id),
            status: visit.status,
            department: 'Emergency Department',
            resource: {
                resourceType: 'Encounter',
                id: String(visit._id),
                status: visit.status,
                class: 'EMERGENCY',
                type: { coding: [{ system: 'LOCAL', code: 'ED', display: 'Emergency Department visit' }] },
                period: { start: visit.arrivalAt, end: visit.closedAt },
                reason: visit.chiefComplaint,
                priority: visit.currentAcuityLevel,
                visitNumber: visit.visitNumber,
            },
            reason: 'Emergency Department visit published to Unified EHR.',
        });
    }
    async publishTriageToEhr(visit, triage, actorId) {
        if (!visit.patientId)
            return;
        await publishEhrResource({
            hospitalId: visit.hospitalId.toString(),
            patientId: visit.patientId.toString(),
            actorId,
            role: 'EMERGENCY',
            resourceType: 'Observation',
            resourceId: String(triage._id),
            status: 'FINAL',
            department: 'Emergency Department',
            resource: {
                resourceType: 'Observation',
                id: String(triage._id),
                status: 'FINAL',
                code: { coding: [{ system: 'LOCAL', code: `TRIAGE-${triage.scale}`, display: `${triage.scale} triage assessment` }] },
                valueInteger: triage.acuityLevel,
                effectiveDateTime: triage.assessedAt,
                vitals: triage.vitals,
                resourceNeeds: triage.resourceNeeds,
                encounterId: String(visit._id),
            },
            reason: 'ED triage assessment published to Unified EHR.',
        });
    }
    async publishDispositionToEhr(visit, record, actorId) {
        if (!visit.patientId)
            return;
        await publishEhrResource({
            hospitalId: visit.hospitalId.toString(),
            patientId: visit.patientId.toString(),
            actorId,
            role: 'EMERGENCY',
            resourceType: 'Encounter',
            resourceId: String(visit._id),
            status: visit.status,
            department: 'Emergency Department',
            resource: {
                resourceType: 'Encounter',
                id: String(visit._id),
                status: visit.status,
                disposition: record.disposition,
                dispositionNotes: record.notes,
                decidedAt: record.decidedAt,
                workflowStatus: record.workflowStatus,
            },
            reason: 'ED disposition published to Unified EHR.',
        });
    }
    emitBoardChanged(hospitalId, event, visitId) {
        emergencyEvents.emit('board.changed', { hospitalId, event, visitId, occurredAt: new Date().toISOString() });
    }
}
export const emergencyService = new EmergencyService();
