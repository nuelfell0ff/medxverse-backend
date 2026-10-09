import { Types } from 'mongoose';
import { StaffUser } from '../staff-auth/staff-user.model.js';
import { Staff } from '../staff/staff.model.js';
import { PatientModel } from '../patient/patient.model.js';
import { OutpatientModel } from '../outpatient/outpatient.model.js';
import { SurgeryCaseModel } from '../surgery/surgery.model.js';
import { RadiologyOrderModel } from '../radiology/radiology.model.js';
import { LabOrderModel } from '../lab/lab.model.js';
import { AppointmentModel } from '../appointment/appointment.model.js';
import { PrescriptionModel } from '../pharmacy/pharmacy.model.js';
import { EDVisitModel } from '../emergency/emergency.model.js';
import { ICUAdmissionModel } from '../icu/icu.model.js';
import { BedAssignmentModel, TransferRequestModel } from '../bed-ward/bed-ward.model.js';
import { WorkTaskModel, WorkTicketModel, isObjectId } from './staff-work.model.js';
import { WorkTaskCategory, WorkTaskPriority, WorkTaskStatus, WorkTicketCategory, WorkTicketPriority, WorkTicketStatus, } from './staff-work.types.js';
const asObjectId = (value, field) => {
    if (!Types.ObjectId.isValid(value))
        throw new Error(`Invalid ${field}`);
    return new Types.ObjectId(value);
};
const normalizeDate = (value, endOfDay = false) => {
    if (!value)
        return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        throw new Error('Invalid date filter');
    if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value))
        date.setUTCHours(23, 59, 59, 999);
    return date;
};
const patientInfo = (patient) => {
    if (!patient)
        return undefined;
    const id = String(patient._id ?? patient.id ?? '');
    if (!id)
        return undefined;
    return {
        id,
        mrn: patient.mrn,
        name: [patient.firstName, patient.lastName].filter(Boolean).join(' ') || undefined,
    };
};
const activityDate = (value, fallback = new Date()) => {
    const date = value instanceof Date ? value : value ? new Date(String(value)) : fallback;
    return Number.isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString();
};
const makeActivity = (sourceModule, sourceType, sourceRecordId, title, summary, occurredAt, details, extras = {}) => ({
    id: `${sourceModule}:${String(sourceRecordId)}`,
    sourceModule,
    sourceType,
    sourceRecordId: String(sourceRecordId),
    title,
    summary,
    status: extras.status,
    priority: extras.priority,
    occurredAt: activityDate(occurredAt),
    patient: extras.patient,
    readOnly: true,
    details,
});
export class StaffWorkService {
    static async resolveStaffContext(userId, hospitalId) {
        if (!isObjectId(userId) || !isObjectId(hospitalId))
            throw new Error('Invalid authentication context');
        const user = await StaffUser.findOne({
            _id: userId,
            hospitalId,
            isActive: true,
            status: 'ACTIVE',
        }).lean();
        if (!user)
            throw new Error('Active staff account not found');
        return {
            userId,
            hospitalId,
            staffId: String(user.staffId),
        };
    }
    static async resolveActor(userId, hospitalId, userType) {
        if (userType === 'STAFF') {
            const staff = await this.resolveStaffContext(userId, hospitalId);
            return { ...staff, isStaff: true };
        }
        return { userId, hospitalId, isStaff: false };
    }
    /**
     * Resolve either the MongoDB Staff document _id or the hospital's
     * human-readable Staff.staffId value to the canonical Staff._id.
     *
     * The Staff login response exposes the human-readable staffId for display,
     * while WorkTask/WorkTicket store references to Staff._id. Accepting both
     * here keeps the API compatible with the existing Staff portal.
     */
    static async resolveStaffObjectId(staffId, hospitalId) {
        if (!staffId || !isObjectId(hospitalId))
            throw new Error('Invalid staffId');
        if (isObjectId(staffId)) {
            const byObjectId = await Staff.findOne({ _id: staffId, hospitalId }).select('_id').lean();
            if (byObjectId?._id)
                return new Types.ObjectId(String(byObjectId._id));
        }
        const byStaffCode = await Staff.findOne({
            staffId: String(staffId).trim().toUpperCase(),
            hospitalId,
        }).select('_id').lean();
        if (byStaffCode?._id)
            return new Types.ObjectId(String(byStaffCode._id));
        throw new Error('Assigned staff member does not belong to this hospital');
    }
    static async assertStaffBelongsToHospital(staffId, hospitalId) {
        return this.resolveStaffObjectId(staffId, hospitalId);
    }
    static async getPatient(patientId, hospitalId) {
        asObjectId(patientId, 'patientId');
        return Boolean(await PatientModel.exists({ _id: patientId, hospitalId }));
    }
    static async listTasks(hospitalId, staffId, query) {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
        const filter = { hospitalId, assignedTo: staffId };
        if (query.status)
            filter.status = query.status;
        if (query.priority)
            filter.priority = query.priority;
        if (query.module)
            filter.relatedModule = query.module;
        if (query.search) {
            const regex = new RegExp(String(query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            filter.$or = [{ title: regex }, { description: regex }];
        }
        const [items, total] = await Promise.all([
            WorkTaskModel.find(filter)
                .populate('assignedTo', 'firstName lastName role department staffId')
                .populate('patientId', 'firstName lastName mrn')
                .sort({ dueAt: 1, createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            WorkTaskModel.countDocuments(filter),
        ]);
        return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
    }
    static async createTask(actor, input) {
        if (!input.title || !String(input.title).trim())
            throw new Error('Task title is required');
        if (!input.assignedTo)
            throw new Error('assignedTo is required');
        const assignedTo = await this.assertStaffBelongsToHospital(String(input.assignedTo), actor.hospitalId);
        if (input.patientId && !(await this.getPatient(String(input.patientId), actor.hospitalId)))
            throw new Error('Patient not found in this hospital');
        if (input.relatedRecordId && !isObjectId(String(input.relatedRecordId)))
            throw new Error('Invalid relatedRecordId');
        const task = await WorkTaskModel.create({
            hospitalId: asObjectId(actor.hospitalId, 'hospitalId'),
            title: String(input.title).trim(),
            description: input.description ? String(input.description).trim() : undefined,
            category: input.category || WorkTaskCategory.GENERAL,
            priority: input.priority || WorkTaskPriority.NORMAL,
            status: input.status || WorkTaskStatus.PENDING,
            assignedTo,
            createdByUserId: asObjectId(actor.userId, 'userId'),
            createdByStaffId: actor.staffId ? asObjectId(actor.staffId, 'staffId') : undefined,
            patientId: input.patientId ? asObjectId(String(input.patientId), 'patientId') : undefined,
            relatedModule: input.relatedModule,
            relatedRecordId: input.relatedRecordId ? asObjectId(String(input.relatedRecordId), 'relatedRecordId') : undefined,
            dueAt: input.dueAt ? normalizeDate(String(input.dueAt)) : undefined,
        });
        return WorkTaskModel.findById(task._id)
            .populate('assignedTo', 'firstName lastName role department staffId')
            .populate('patientId', 'firstName lastName mrn')
            .lean();
    }
    static async updateTask(actor, taskId, input) {
        asObjectId(taskId, 'taskId');
        const task = await WorkTaskModel.findOne({ _id: taskId, hospitalId: actor.hospitalId });
        if (!task)
            throw new Error('Task not found');
        const assignedTo = input.assignedTo
            ? await this.assertStaffBelongsToHospital(String(input.assignedTo), actor.hospitalId)
            : undefined;
        if (input.patientId && !(await this.getPatient(String(input.patientId), actor.hospitalId)))
            throw new Error('Patient not found in this hospital');
        const allowed = ['title', 'description', 'category', 'priority', 'status', 'assignedTo', 'patientId', 'relatedModule', 'relatedRecordId', 'dueAt'];
        for (const key of allowed) {
            if (!(key in input))
                continue;
            if (key === 'assignedTo') {
                task.assignedTo = assignedTo;
            }
            else if (key === 'patientId' || key === 'relatedRecordId') {
                task[key] = input[key] ? asObjectId(String(input[key]), key) : undefined;
            }
            else if (key === 'dueAt') {
                task[key] = input[key] ? normalizeDate(String(input[key])) : undefined;
            }
            else {
                task[key] = input[key];
            }
        }
        if (input.status === WorkTaskStatus.COMPLETED) {
            task.completedAt = new Date();
            task.completedBy = asObjectId(actor.userId, 'userId');
        }
        if (input.status === WorkTaskStatus.CANCELLED) {
            task.cancelledAt = new Date();
            task.cancelledBy = asObjectId(actor.userId, 'userId');
        }
        await task.save();
        return WorkTaskModel.findById(task._id)
            .populate('assignedTo', 'firstName lastName role department staffId')
            .populate('patientId', 'firstName lastName mrn')
            .lean();
    }
    static async listTickets(hospitalId, staffId, query) {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
        const filter = {
            hospitalId,
            $or: [{ assignedTo: staffId }, { requesterStaffId: staffId }],
        };
        if (query.status)
            filter.status = query.status;
        if (query.priority)
            filter.priority = query.priority;
        if (query.category)
            filter.category = query.category;
        if (query.module)
            filter.relatedModule = query.module;
        const [items, total] = await Promise.all([
            WorkTicketModel.find(filter)
                .populate('assignedTo', 'firstName lastName role department staffId')
                .populate('requesterStaffId', 'firstName lastName role department staffId')
                .populate('patientId', 'firstName lastName mrn')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            WorkTicketModel.countDocuments(filter),
        ]);
        return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
    }
    static async nextTicketNumber(hospitalId) {
        // Use time + randomness rather than countDocuments so concurrent ticket
        // creation cannot generate the same ticket number.
        const prefix = `TKT-${new Date().getFullYear()}`;
        const suffix = `${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
        return `${prefix}-${suffix}`;
    }
    static async createTicket(actor, input) {
        if (!input.subject || !String(input.subject).trim())
            throw new Error('Ticket subject is required');
        if (!input.description || !String(input.description).trim())
            throw new Error('Ticket description is required');
        const assignedTo = input.assignedTo
            ? await this.assertStaffBelongsToHospital(String(input.assignedTo), actor.hospitalId)
            : undefined;
        if (input.patientId && !(await this.getPatient(String(input.patientId), actor.hospitalId)))
            throw new Error('Patient not found in this hospital');
        const ticket = await WorkTicketModel.create({
            hospitalId: asObjectId(actor.hospitalId, 'hospitalId'),
            ticketNumber: await this.nextTicketNumber(actor.hospitalId),
            subject: String(input.subject).trim(),
            description: String(input.description).trim(),
            category: input.category || WorkTicketCategory.OTHER,
            priority: input.priority || WorkTicketPriority.NORMAL,
            status: input.assignedTo ? WorkTicketStatus.ASSIGNED : WorkTicketStatus.OPEN,
            requesterUserId: asObjectId(actor.userId, 'userId'),
            requesterStaffId: actor.staffId ? asObjectId(actor.staffId, 'staffId') : undefined,
            assignedTo,
            patientId: input.patientId ? asObjectId(String(input.patientId), 'patientId') : undefined,
            relatedModule: input.relatedModule,
            relatedRecordId: input.relatedRecordId ? asObjectId(String(input.relatedRecordId), 'relatedRecordId') : undefined,
        });
        return WorkTicketModel.findById(ticket._id)
            .populate('assignedTo', 'firstName lastName role department staffId')
            .populate('requesterStaffId', 'firstName lastName role department staffId')
            .populate('patientId', 'firstName lastName mrn')
            .lean();
    }
    static async updateTicket(actor, ticketId, input) {
        asObjectId(ticketId, 'ticketId');
        const ticket = await WorkTicketModel.findOne({
            _id: ticketId,
            hospitalId: actor.hospitalId,
            $or: actor.staffId ? [{ assignedTo: actor.staffId }, { requesterStaffId: actor.staffId }] : [{}],
        });
        if (!ticket)
            throw new Error('Ticket not found');
        const assignedTo = input.assignedTo
            ? await this.assertStaffBelongsToHospital(String(input.assignedTo), actor.hospitalId)
            : undefined;
        if (input.patientId && !(await this.getPatient(String(input.patientId), actor.hospitalId)))
            throw new Error('Patient not found in this hospital');
        for (const key of ['subject', 'description', 'category', 'priority', 'status', 'relatedModule']) {
            if (key in input)
                ticket[key] = input[key];
        }
        if ('assignedTo' in input)
            ticket.assignedTo = assignedTo;
        if ('patientId' in input)
            ticket.patientId = input.patientId ? asObjectId(String(input.patientId), 'patientId') : undefined;
        if ('relatedRecordId' in input)
            ticket.relatedRecordId = input.relatedRecordId ? asObjectId(String(input.relatedRecordId), 'relatedRecordId') : undefined;
        if (input.status === WorkTicketStatus.RESOLVED)
            ticket.resolvedAt = new Date();
        if (input.status === WorkTicketStatus.CLOSED)
            ticket.closedAt = new Date();
        await ticket.save();
        return WorkTicketModel.findById(ticket._id)
            .populate('assignedTo', 'firstName lastName role department staffId')
            .populate('requesterStaffId', 'firstName lastName role department staffId')
            .populate('patientId', 'firstName lastName mrn')
            .lean();
    }
    static async addTicketComment(actor, ticketId, body) {
        if (!body || !body.trim())
            throw new Error('Comment body is required');
        const ticket = await WorkTicketModel.findOne({
            _id: ticketId,
            hospitalId: actor.hospitalId,
            $or: actor.staffId ? [{ assignedTo: actor.staffId }, { requesterStaffId: actor.staffId }] : [{}],
        });
        if (!ticket)
            throw new Error('Ticket not found');
        ticket.comments.push({
            authorUserId: asObjectId(actor.userId, 'userId'),
            authorStaffId: actor.staffId ? asObjectId(actor.staffId, 'staffId') : undefined,
            body: body.trim(),
            createdAt: new Date(),
        });
        await ticket.save();
        return WorkTicketModel.findById(ticket._id)
            .populate('assignedTo', 'firstName lastName role department staffId')
            .populate('requesterStaffId', 'firstName lastName role department staffId')
            .populate('patientId', 'firstName lastName mrn')
            .lean();
    }
    static async getTaskById(hospitalId, staffId, taskId) {
        return WorkTaskModel.findOne({ _id: taskId, hospitalId, assignedTo: staffId })
            .populate('assignedTo', 'firstName lastName role department staffId')
            .populate('patientId', 'firstName lastName mrn')
            .lean();
    }
    static async getTicketById(hospitalId, staffId, ticketId) {
        return WorkTicketModel.findOne({ _id: ticketId, hospitalId, $or: [{ assignedTo: staffId }, { requesterStaffId: staffId }] })
            .populate('assignedTo', 'firstName lastName role department staffId')
            .populate('requesterStaffId', 'firstName lastName role department staffId')
            .populate('patientId', 'firstName lastName mrn')
            .lean();
    }
    static async getWorkActivity(hospitalId, staffId, query) {
        const staff = asObjectId(staffId, 'staffId');
        const hospital = asObjectId(hospitalId, 'hospitalId');
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 30));
        const from = normalizeDate(query.from);
        const to = normalizeDate(query.to, true);
        const dateFilter = {};
        if (from)
            dateFilter.$gte = from;
        if (to)
            dateFilter.$lte = to;
        const modules = query.module ? [query.module] : ['outpatient', 'surgery', 'radiology', 'lab', 'appointments', 'pharmacy', 'emergency', 'icu', 'bed_ward'];
        const candidateIds = [staff, new Types.ObjectId(staffId)];
        const user = await StaffUser.findOne({ _id: { $exists: true }, staffId: staff, hospitalId: hospital }).select('_id').lean();
        if (user?._id)
            candidateIds.push(user._id);
        const tasks = [];
        if (modules.includes('outpatient')) {
            const filter = { hospitalId: hospital, doctorId: staff };
            if (Object.keys(dateFilter).length)
                filter.updatedAt = dateFilter;
            if (query.status)
                filter.status = query.status;
            tasks.push(OutpatientModel.find(filter).populate('patientId', 'firstName lastName mrn').sort({ updatedAt: -1 }).limit(100).lean().then((rows) => rows.map((r) => makeActivity('outpatient', 'OutpatientEncounter', r._id, 'Outpatient consultation', r.chiefComplaint || 'Outpatient encounter', r.consultationEndedAt || r.updatedAt, { chiefComplaint: r.chiefComplaint, diagnoses: r.diagnoses || [], consultationCompleted: Boolean(r.consultationEndedAt), consultationStartedAt: r.consultationStartedAt, consultationEndedAt: r.consultationEndedAt }, { status: r.status, priority: r.triagePriority, patient: patientInfo(r.patientId) }))));
        }
        if (modules.includes('surgery')) {
            const filter = { hospitalId: hospital, $or: [{ leadSurgeonId: staff }, { 'surgicalTeam.userId': staff }] };
            if (Object.keys(dateFilter).length)
                filter.updatedAt = dateFilter;
            if (query.status)
                filter.status = query.status;
            tasks.push(SurgeryCaseModel.find(filter).populate('patientId', 'firstName lastName mrn').sort({ updatedAt: -1 }).limit(100).lean().then((rows) => rows.map((r) => makeActivity('surgery', 'SurgeryCase', r._id, r.procedureName || 'Surgical case', `Surgery ${String(r.status || '').toLowerCase().replace(/_/g, ' ')}`, r.actualEndTime || r.actualStartTime || r.scheduledStartTime || r.updatedAt, { procedureName: r.procedureName, theatreId: r.theatreId, urgency: r.urgency, scheduledStartTime: r.scheduledStartTime, scheduledEndTime: r.scheduledEndTime, actualStartTime: r.actualStartTime, actualEndTime: r.actualEndTime, postOpNotes: r.postOpNotes || null, role: r.leadSurgeonId?.toString() === staffId ? 'LEAD_SURGEON' : 'SURGICAL_TEAM' }, { status: r.status, priority: String(r.priority ?? ''), patient: patientInfo(r.patientId) }))));
        }
        if (modules.includes('radiology')) {
            const filter = { hospitalId: hospital, 'assignments.userId': staff };
            if (Object.keys(dateFilter).length)
                filter.updatedAt = dateFilter;
            if (query.status)
                filter.status = query.status;
            tasks.push(RadiologyOrderModel.find(filter).populate('patientId', 'firstName lastName mrn').sort({ updatedAt: -1 }).limit(100).lean().then((rows) => rows.map((r) => makeActivity('radiology', 'RadiologyOrder', r._id, r.procedureName || 'Radiology order', `${r.modality || 'Imaging'} ${String(r.status || '').toLowerCase().replace(/_/g, ' ')}`, r.report?.reportedAt || r.reportedAt || r.updatedAt, { procedureName: r.procedureName, modality: r.modality, bodyPart: r.bodyPart, accessionNumber: r.accessionNumber, clinicalIndication: r.clinicalIndication, findings: r.findings || r.report?.findings || null, impression: r.impression || r.report?.impression || null, reportedAt: r.reportedAt || r.report?.reportedAt || null }, { status: r.status, priority: r.priority, patient: patientInfo(r.patientId) }))));
        }
        if (modules.includes('lab')) {
            const filter = { hospitalId: hospital, doctorId: staff };
            if (Object.keys(dateFilter).length)
                filter.updatedAt = dateFilter;
            if (query.status)
                filter.status = query.status;
            tasks.push(LabOrderModel.find(filter).populate('patientId', 'firstName lastName mrn').sort({ updatedAt: -1 }).limit(100).lean().then((rows) => rows.map((r) => { const results = Array.isArray(r.results) ? r.results : []; const abnormal = results.filter((x) => x.flag && x.flag !== 'NORMAL').length; return makeActivity('lab', 'LabOrder', r._id, r.testName || 'Laboratory order', `${r.testName || 'Lab test'} ${String(r.status || '').toLowerCase().replace(/_/g, ' ')}`, r.verifiedAt || r.sampleCollectedAt || r.updatedAt, { testName: r.testName, testCategory: r.testCategory, accessionNumber: r.accessionNumber, sampleType: r.sampleType, resultCount: results.length, abnormalResultCount: abnormal, verifiedAt: r.verifiedAt || null, results: results.slice(0, 20).map((x) => ({ parameterName: x.parameterName, value: x.value, unit: x.unit, flag: x.flag })) }, { status: r.status, priority: r.priority, patient: patientInfo(r.patientId) }); })));
        }
        if (modules.includes('appointments')) {
            const filter = { hospitalId: hospital, doctorId: staff };
            if (Object.keys(dateFilter).length)
                filter.appointmentDate = dateFilter;
            if (query.status)
                filter.status = query.status;
            tasks.push(AppointmentModel.find(filter).populate('patientId', 'firstName lastName mrn').sort({ appointmentDate: -1, updatedAt: -1 }).limit(100).lean().then((rows) => rows.map((r) => makeActivity('appointments', 'Appointment', r._id, `${r.type || 'Appointment'} appointment`, `${r.type || 'Appointment'} ${String(r.status || '').toLowerCase().replace(/_/g, ' ')}`, r.appointmentDate || r.updatedAt, { appointmentDate: r.appointmentDate, startTime: r.startTime, endTime: r.endTime, durationMinutes: r.durationMinutes, type: r.type, reason: r.reason, notes: r.notes || null }, { status: r.status, priority: r.priority, patient: patientInfo(r.patientId) }))));
        }
        if (modules.includes('pharmacy')) {
            const filter = { hospitalId: hospital, prescriberId: { $in: candidateIds } };
            if (Object.keys(dateFilter).length)
                filter.updatedAt = dateFilter;
            if (query.status)
                filter.status = query.status;
            tasks.push(PrescriptionModel.find(filter).populate('patientId', 'firstName lastName mrn').sort({ requestedAt: -1 }).limit(100).lean().then((rows) => rows.map((r) => makeActivity('pharmacy', 'Prescription', r._id, r.prescriptionNumber || 'Prescription', `${r.medications?.length || 0} medication(s) — ${String(r.status || '').toLowerCase().replace(/_/g, ' ')}`, r.reviewedAt || r.requestedAt || r.updatedAt, { prescriptionNumber: r.prescriptionNumber, source: r.source, department: r.department, medicationCount: r.medications?.length || 0, medications: (r.medications || []).slice(0, 20).map((m) => ({ medicationName: m.medicationName, dose: m.dose, route: m.route, quantity: m.quantity, instructions: m.instructions })), screeningStatus: r.screeningStatus, screeningSummary: r.screeningSummary || null, requestedAt: r.requestedAt, reviewedAt: r.reviewedAt || null, approvedAt: r.approvedAt || null }, { status: r.status, patient: patientInfo(r.patientId) }))));
        }
        if (modules.includes('emergency')) {
            const filter = { hospitalId: hospital, attendingClinicianId: { $in: candidateIds } };
            if (Object.keys(dateFilter).length)
                filter.updatedAt = dateFilter;
            if (query.status)
                filter.status = query.status;
            tasks.push(EDVisitModel.find(filter).populate('patientId', 'firstName lastName mrn').sort({ updatedAt: -1 }).limit(100).lean().then((rows) => rows.map((r) => makeActivity('emergency', 'EDVisit', r._id, `Emergency visit ${r.visitNumber || ''}`.trim(), r.chiefComplaint || 'Emergency department case', r.closedAt || r.updatedAt, { visitNumber: r.visitNumber, chiefComplaint: r.chiefComplaint, arrivalAt: r.arrivalAt, arrivalMode: r.arrivalMode, acuityLevel: r.currentAcuityLevel, notes: r.notes || null, closedAt: r.closedAt || null }, { status: r.status, priority: r.currentAcuityLevel ? `ACUITY_${r.currentAcuityLevel}` : undefined, patient: patientInfo(r.patientId) }))));
        }
        if (modules.includes('icu')) {
            const filter = { hospitalId: hospital, attendingPhysicianId: staff };
            if (Object.keys(dateFilter).length)
                filter.updatedAt = dateFilter;
            if (query.status)
                filter.status = query.status;
            tasks.push(ICUAdmissionModel.find(filter).populate('patientId', 'firstName lastName mrn').sort({ updatedAt: -1 }).limit(100).lean().then((rows) => rows.map((r) => makeActivity('icu', 'ICUAdmission', r._id, 'ICU admission', r.primaryDiagnosis || r.admissionReason || 'ICU patient', r.dischargedAt || r.updatedAt, { bedNumber: r.bedNumber, careLevel: r.careLevel, primaryDiagnosis: r.primaryDiagnosis, admissionReason: r.admissionReason, admittedAt: r.admittedAt, dischargedAt: r.dischargedAt || null, dispositionNotes: r.dispositionNotes || null }, { status: r.status, patient: patientInfo(r.patientId) }))));
        }
        if (modules.includes('bed_ward')) {
            const [assignments, transfers] = await Promise.all([
                BedAssignmentModel.find({ hospitalId: hospital, assignedById: { $in: candidateIds }, ...(Object.keys(dateFilter).length ? { assignedAt: dateFilter } : {}) }).populate('patientId', 'firstName lastName mrn').sort({ assignedAt: -1 }).limit(100).lean(),
                TransferRequestModel.find({ hospitalId: hospital, requestedById: { $in: candidateIds }, ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}) }).populate('patientId', 'firstName lastName mrn').sort({ createdAt: -1 }).limit(100).lean(),
            ]);
            tasks.push(Promise.resolve([
                ...assignments.map((r) => makeActivity('bed_ward', 'BedAssignment', r._id, 'Bed assignment', `Bed ${r.bedId ? String(r.bedId) : ''} ${String(r.status || '').toLowerCase()}`.trim(), r.assignedAt || r.createdAt, { bedId: String(r.bedId), wardId: String(r.wardId), admissionId: r.admissionId ? String(r.admissionId) : null, assignedAt: r.assignedAt, releasedAt: r.releasedAt || null, reason: r.reason || null }, { status: r.status, patient: patientInfo(r.patientId) })),
                ...transfers.map((r) => makeActivity('bed_ward', 'TransferRequest', r._id, 'Ward transfer request', String(r.reason || r.status || 'Ward transfer'), r.completedAt || r.acceptedAt || r.createdAt, { fromWardId: r.fromWardId ? String(r.fromWardId) : null, fromBedId: r.fromBedId ? String(r.fromBedId) : null, toWardId: r.toWardId ? String(r.toWardId) : null, toBedId: r.toBedId ? String(r.toBedId) : null, requestedAt: r.createdAt, acceptedAt: r.acceptedAt || null, completedAt: r.completedAt || null, notes: r.notes || null }, { status: r.status, patient: patientInfo(r.patientId) })),
            ]));
        }
        const settled = await Promise.allSettled(tasks);
        const activities = settled.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
        activities.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
        const filtered = query.status ? activities.filter((item) => item.status === query.status) : activities;
        const total = filtered.length;
        const start = (page - 1) * limit;
        return {
            items: filtered.slice(start, start + limit),
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
            readOnly: true,
            modules,
        };
    }
}
