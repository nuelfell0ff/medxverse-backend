import { Types } from 'mongoose';
import { RosterModel, StaffAvailabilityModel, ShiftSwapModel, ShiftHandoverModel, } from './rostering.model.js';
import { AssignmentStatus, HandoverStatus, RosterStatus, ShiftStatus, SwapStatus, AttendanceStatus, } from './rostering.types.js';
const toObjectId = (id) => new Types.ObjectId(id);
const assertObjectId = (value, field = 'id') => {
    if (!Types.ObjectId.isValid(value)) {
        throw new Error(`Invalid ${field}.`);
    }
};
/* =========================================================
   ROSTERS
========================================================= */
export const createRoster = async (payload, userId) => {
    if (new Date(payload.startDate) >
        new Date(payload.endDate)) {
        throw new Error('Roster start date cannot be after end date.');
    }
    const roster = await RosterModel.create({
        ...payload,
        startDate: new Date(payload.startDate),
        endDate: new Date(payload.endDate),
        createdBy: userId
            ? toObjectId(userId)
            : undefined,
        updatedBy: userId
            ? toObjectId(userId)
            : undefined,
    });
    return roster;
};
export const getRosters = async (filters = {}) => {
    const page = Math.max(filters.page || 1, 1);
    const limit = Math.min(Math.max(filters.limit || 20, 1), 100);
    const query = {};
    if (filters.status) {
        query.status = filters.status;
    }
    if (filters.areaType) {
        query.areaType = filters.areaType;
    }
    if (filters.departmentId) {
        assertObjectId(filters.departmentId, 'departmentId');
        query.departmentId = toObjectId(filters.departmentId);
    }
    if (filters.wardId) {
        assertObjectId(filters.wardId, 'wardId');
        query.wardId = toObjectId(filters.wardId);
    }
    if (filters.startDate ||
        filters.endDate) {
        query.startDate = {};
        if (filters.startDate) {
            query.startDate.$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
            query.startDate.$lte = new Date(filters.endDate);
        }
    }
    const [rosters, total] = await Promise.all([
        RosterModel.find(query)
            .sort({
            startDate: -1,
            createdAt: -1,
        })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        RosterModel.countDocuments(query),
    ]);
    return {
        rosters,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
    };
};
export const getRosterById = async (rosterId) => {
    assertObjectId(rosterId, 'rosterId');
    const roster = await RosterModel.findById(rosterId).lean();
    if (!roster) {
        throw new Error('Roster not found.');
    }
    return roster;
};
export const updateRoster = async (rosterId, payload, userId) => {
    assertObjectId(rosterId, 'rosterId');
    const roster = await RosterModel.findById(rosterId);
    if (!roster) {
        throw new Error('Roster not found.');
    }
    if (roster.status === RosterStatus.PUBLISHED) {
        throw new Error('Published rosters cannot be directly edited. Create a new version instead.');
    }
    Object.assign(roster, payload);
    if (payload.startDate) {
        roster.startDate = new Date(payload.startDate);
    }
    if (payload.endDate) {
        roster.endDate = new Date(payload.endDate);
    }
    roster.updatedBy = userId
        ? toObjectId(userId)
        : undefined;
    await roster.save();
    return roster;
};
/* =========================================================
   SHIFTS
========================================================= */
export const createShift = async (payload, userId) => {
    assertObjectId(payload.rosterId, 'rosterId');
    const roster = await RosterModel.findById(payload.rosterId);
    if (!roster) {
        throw new Error('Roster not found.');
    }
    if (roster.status === RosterStatus.PUBLISHED) {
        throw new Error('Cannot add shifts to a published roster.');
    }
    const date = new Date(payload.date);
    if (date < roster.startDate ||
        date > roster.endDate) {
        throw new Error('Shift date must fall within the roster date range.');
    }
    roster.shifts.push({
        date,
        startTime: payload.startTime,
        endTime: payload.endTime,
        shiftType: payload.shiftType,
        status: ShiftStatus.OPEN,
        areaType: payload.areaType ||
            roster.areaType,
        departmentId: payload.departmentId
            ? toObjectId(payload.departmentId)
            : roster.departmentId,
        departmentName: payload.departmentName ||
            roster.departmentName,
        wardId: payload.wardId
            ? toObjectId(payload.wardId)
            : roster.wardId,
        wardName: payload.wardName ||
            roster.wardName,
        location: payload.location,
        requiredStaffCount: payload.requiredStaffCount || 1,
        notes: payload.notes,
        isOpenShift: payload.isOpenShift ?? true,
        assignedStaff: [],
    });
    roster.updatedBy = userId
        ? toObjectId(userId)
        : undefined;
    await roster.save();
    return roster.shifts[roster.shifts.length - 1];
};
export const updateShift = async (rosterId, shiftId, updates, userId) => {
    assertObjectId(rosterId, 'rosterId');
    assertObjectId(shiftId, 'shiftId');
    const roster = await RosterModel.findById(rosterId);
    if (!roster) {
        throw new Error('Roster not found.');
    }
    if (roster.status === RosterStatus.PUBLISHED) {
        throw new Error('Published rosters cannot be edited.');
    }
    const shift = roster.shifts.id(shiftId);
    if (!shift) {
        throw new Error('Shift not found.');
    }
    const allowedFields = [
        'date',
        'startTime',
        'endTime',
        'shiftType',
        'areaType',
        'departmentId',
        'departmentName',
        'wardId',
        'wardName',
        'location',
        'requiredStaffCount',
        'notes',
        'isOpenShift',
    ];
    for (const field of allowedFields) {
        if (Object.prototype.hasOwnProperty.call(updates, field)) {
            shift[field] =
                updates[field];
        }
    }
    roster.updatedBy = userId
        ? toObjectId(userId)
        : undefined;
    await roster.save();
    return shift;
};
export const assignStaffToShift = async (rosterId, shiftId, payload, userId) => {
    assertObjectId(rosterId, 'rosterId');
    assertObjectId(shiftId, 'shiftId');
    assertObjectId(payload.staffId, 'staffId');
    const roster = await RosterModel.findById(rosterId);
    if (!roster) {
        throw new Error('Roster not found.');
    }
    if (roster.status === RosterStatus.PUBLISHED) {
        throw new Error('Published rosters cannot be modified.');
    }
    const shift = roster.shifts.id(shiftId);
    if (!shift) {
        throw new Error('Shift not found.');
    }
    const alreadyAssigned = shift.assignedStaff.some((assignment) => assignment.staffId.toString() ===
        payload.staffId);
    if (alreadyAssigned) {
        throw new Error('Staff member is already assigned to this shift.');
    }
    /* -------------------------------------------------------
       Prevent duplicate active assignment
    ------------------------------------------------------- */
    shift.assignedStaff.push({
        staffId: toObjectId(payload.staffId),
        role: payload.role,
        status: AssignmentStatus.PENDING,
        notes: payload.notes,
        assignedAt: new Date(),
        assignedBy: userId
            ? toObjectId(userId)
            : undefined,
    });
    shift.isOpenShift = false;
    if (shift.assignedStaff.length >=
        (shift.requiredStaffCount || 1)) {
        shift.status =
            ShiftStatus.ASSIGNED;
    }
    await roster.save();
    return shift;
};
export const removeStaffFromShift = async (rosterId, shiftId, staffId) => {
    assertObjectId(rosterId, 'rosterId');
    assertObjectId(shiftId, 'shiftId');
    assertObjectId(staffId, 'staffId');
    const roster = await RosterModel.findById(rosterId);
    if (!roster) {
        throw new Error('Roster not found.');
    }
    if (roster.status ===
        RosterStatus.PUBLISHED) {
        throw new Error('Published rosters cannot be modified.');
    }
    const shift = roster.shifts.id(shiftId);
    if (!shift) {
        throw new Error('Shift not found.');
    }
    shift.assignedStaff =
        shift.assignedStaff.filter((assignment) => assignment.staffId.toString() !==
            staffId);
    if (shift.assignedStaff.length === 0) {
        shift.status = ShiftStatus.OPEN;
        shift.isOpenShift = true;
    }
    await roster.save();
    return shift;
};
/* =========================================================
   STAFF ACCEPTANCE
========================================================= */
export const acceptShift = async (rosterId, shiftId, staffId) => {
    assertObjectId(rosterId, 'rosterId');
    assertObjectId(shiftId, 'shiftId');
    assertObjectId(staffId, 'staffId');
    const roster = await RosterModel.findById(rosterId);
    if (!roster) {
        throw new Error('Roster not found.');
    }
    const shift = roster.shifts.id(shiftId);
    if (!shift) {
        throw new Error('Shift not found.');
    }
    const assignment = shift.assignedStaff.find((item) => item.staffId.toString() ===
        staffId);
    if (!assignment) {
        throw new Error('Staff member is not assigned to this shift.');
    }
    assignment.status =
        AssignmentStatus.ACCEPTED;
    assignment.acceptedAt = new Date();
    shift.status =
        ShiftStatus.ACCEPTED;
    await roster.save();
    return shift;
};
export const declineShift = async (rosterId, shiftId, staffId, notes) => {
    assertObjectId(rosterId, 'rosterId');
    assertObjectId(shiftId, 'shiftId');
    assertObjectId(staffId, 'staffId');
    const roster = await RosterModel.findById(rosterId);
    if (!roster) {
        throw new Error('Roster not found.');
    }
    const shift = roster.shifts.id(shiftId);
    if (!shift) {
        throw new Error('Shift not found.');
    }
    const assignment = shift.assignedStaff.find((item) => item.staffId.toString() ===
        staffId);
    if (!assignment) {
        throw new Error('Staff member is not assigned to this shift.');
    }
    assignment.status =
        AssignmentStatus.DECLINED;
    assignment.declinedAt = new Date();
    assignment.notes = notes;
    await roster.save();
    return shift;
};
/* =========================================================
   PUBLISH ROSTER
========================================================= */
export const publishRoster = async (rosterId, userId) => {
    assertObjectId(rosterId, 'rosterId');
    const roster = await RosterModel.findById(rosterId);
    if (!roster) {
        throw new Error('Roster not found.');
    }
    if (roster.status ===
        RosterStatus.PUBLISHED) {
        return roster;
    }
    roster.status =
        RosterStatus.PUBLISHED;
    roster.isPublished = true;
    roster.publishedAt = new Date();
    roster.publishedBy = userId
        ? toObjectId(userId)
        : undefined;
    await roster.save();
    return roster;
};
/* =========================================================
   STAFF AVAILABILITY
========================================================= */
export const setStaffAvailability = async (payload) => {
    assertObjectId(payload.staffId, 'staffId');
    const date = new Date(payload.date);
    const availability = await StaffAvailabilityModel.findOneAndUpdate({
        staffId: toObjectId(payload.staffId),
        date,
    }, {
        $set: {
            status: payload.status,
            preferredShiftTypes: payload.preferredShiftTypes ||
                [],
            availableFrom: payload.availableFrom,
            availableTo: payload.availableTo,
            notes: payload.notes,
        },
    }, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
    });
    return availability;
};
export const getStaffAvailability = async (staffId, startDate, endDate) => {
    assertObjectId(staffId, 'staffId');
    const query = {
        staffId: toObjectId(staffId),
    };
    if (startDate || endDate) {
        query.date = {};
        if (startDate) {
            query.date.$gte =
                new Date(startDate);
        }
        if (endDate) {
            query.date.$lte =
                new Date(endDate);
        }
    }
    return StaffAvailabilityModel.find(query)
        .sort({ date: 1 })
        .lean();
};
/* =========================================================
   OPEN SHIFTS
========================================================= */
export const getOpenShifts = async (startDate, endDate, areaType) => {
    const query = {
        status: ShiftStatus.OPEN,
        isOpenShift: true,
    };
    if (areaType) {
        query.areaType = areaType;
    }
    if (startDate || endDate) {
        query.date = {};
        if (startDate) {
            query.date.$gte =
                new Date(startDate);
        }
        if (endDate) {
            query.date.$lte =
                new Date(endDate);
        }
    }
    const rosters = await RosterModel.find({
        status: RosterStatus.PUBLISHED,
    }).lean();
    return rosters.flatMap((roster) => roster.shifts.filter((shift) => {
        if (shift.status !==
            ShiftStatus.OPEN) {
            return false;
        }
        if (areaType &&
            shift.areaType !== areaType) {
            return false;
        }
        if (startDate &&
            new Date(shift.date) <
                new Date(startDate)) {
            return false;
        }
        if (endDate &&
            new Date(shift.date) >
                new Date(endDate)) {
            return false;
        }
        return true;
    }));
};
/* =========================================================
   SHIFT SWAPS
========================================================= */
export const createShiftSwap = async (payload) => {
    assertObjectId(payload.shiftId, 'shiftId');
    assertObjectId(payload.requesterStaffId, 'requesterStaffId');
    if (payload.replacementStaffId) {
        assertObjectId(payload.replacementStaffId, 'replacementStaffId');
    }
    return ShiftSwapModel.create({
        shiftId: toObjectId(payload.shiftId),
        requesterStaffId: toObjectId(payload.requesterStaffId),
        replacementStaffId: payload.replacementStaffId
            ? toObjectId(payload.replacementStaffId)
            : undefined,
        reason: payload.reason,
        status: SwapStatus.PENDING,
    });
};
export const approveShiftSwap = async (swapId, payload, approverId) => {
    assertObjectId(swapId, 'swapId');
    const swap = await ShiftSwapModel.findById(swapId);
    if (!swap) {
        throw new Error('Shift swap request not found.');
    }
    if (swap.status !==
        SwapStatus.PENDING) {
        throw new Error('This shift swap has already been processed.');
    }
    if (payload.approved) {
        swap.status =
            SwapStatus.APPROVED;
        swap.approvedAt = new Date();
        swap.approvedBy = approverId
            ? toObjectId(approverId)
            : undefined;
        /*
         * Perform the actual staff replacement.
         */
        const roster = await RosterModel.findOne({
            'shifts._id': swap.shiftId,
        });
        if (!roster) {
            throw new Error('Roster containing the shift was not found.');
        }
        const shift = roster.shifts.id(swap.shiftId);
        if (!shift) {
            throw new Error('Shift not found.');
        }
        const oldAssignment = shift.assignedStaff.find((assignment) => assignment.staffId.toString() ===
            swap.requesterStaffId.toString());
        if (!oldAssignment) {
            throw new Error('Requester is not assigned to this shift.');
        }
        if (swap.replacementStaffId) {
            oldAssignment.staffId =
                swap.replacementStaffId;
            oldAssignment.status =
                AssignmentStatus.PENDING;
            oldAssignment.acceptedAt =
                undefined;
        }
        await roster.save();
    }
    else {
        swap.status =
            SwapStatus.REJECTED;
        swap.rejectionReason =
            payload.rejectionReason;
    }
    await swap.save();
    return swap;
};
/* =========================================================
   HANDOVER
========================================================= */
export const createHandover = async (payload) => {
    assertObjectId(payload.shiftId, 'shiftId');
    assertObjectId(payload.outgoingStaffId, 'outgoingStaffId');
    if (payload.incomingStaffId) {
        assertObjectId(payload.incomingStaffId, 'incomingStaffId');
    }
    return ShiftHandoverModel.create({
        shiftId: toObjectId(payload.shiftId),
        outgoingStaffId: toObjectId(payload.outgoingStaffId),
        incomingStaffId: payload.incomingStaffId
            ? toObjectId(payload.incomingStaffId)
            : undefined,
        summary: payload.summary,
        pendingTasks: payload.pendingTasks || [],
        importantNotes: payload.importantNotes || [],
        status: HandoverStatus.PENDING,
    });
};
export const completeHandover = async (handoverId) => {
    assertObjectId(handoverId, 'handoverId');
    const handover = await ShiftHandoverModel.findById(handoverId);
    if (!handover) {
        throw new Error('Handover not found.');
    }
    handover.status =
        HandoverStatus.COMPLETED;
    handover.completedAt =
        new Date();
    await handover.save();
    return handover;
};
/* =========================================================
   SHIFT ATTENDANCE / SIGN IN / SIGN OUT
========================================================= */
const ATTENDANCE_GRACE_MINUTES = 10;
const getShiftDateTime = (date, time) => {
    const base = new Date(date);
    const [hours, minutes] = String(time || '00:00').split(':').map(Number);
    const result = new Date(base);
    result.setHours(hours || 0, minutes || 0, 0, 0);
    return result;
};
const getShiftEndDateTime = (date, startTime, endTime) => {
    const start = getShiftDateTime(date, startTime);
    const end = getShiftDateTime(date, endTime);
    if (end <= start)
        end.setDate(end.getDate() + 1);
    return end;
};
const findAssignedShift = async (shiftId, staffId) => {
    assertObjectId(shiftId, 'shiftId');
    assertObjectId(staffId, 'staffId');
    const roster = await RosterModel.findOne({ 'shifts._id': shiftId });
    if (!roster)
        throw new Error('Roster containing the shift was not found.');
    const shift = roster.shifts.id(shiftId);
    if (!shift)
        throw new Error('Shift not found.');
    const assignment = shift.assignedStaff.find((item) => item.staffId.toString() === staffId);
    if (!assignment)
        throw new Error('Staff member is not assigned to this shift.');
    return { roster, shift, assignment };
};
export const signInToShift = async (shiftId, payload) => {
    const { roster, shift, assignment } = await findAssignedShift(shiftId, payload.staffId);
    if (assignment.signedInAt) {
        throw new Error('Staff member has already signed in for this shift.');
    }
    const now = new Date();
    const shiftStart = getShiftDateTime(shift.date, shift.startTime);
    const graceEnd = new Date(shiftStart.getTime() + ATTENDANCE_GRACE_MINUTES * 60000);
    const lateByMinutes = Math.max(0, Math.floor((now.getTime() - shiftStart.getTime()) / 60000));
    assignment.signedInAt = now;
    assignment.attendanceStatus = now > graceEnd
        ? AttendanceStatus.LATE
        : AttendanceStatus.PRESENT;
    assignment.lateByMinutes = lateByMinutes;
    if (payload.notes !== undefined)
        assignment.attendanceNotes = payload.notes;
    assignment.status = AssignmentStatus.ACCEPTED;
    assignment.acceptedAt = assignment.acceptedAt || now;
    shift.status = ShiftStatus.IN_PROGRESS;
    await roster.save();
    return assignment;
};
export const signOutOfShift = async (shiftId, payload) => {
    const { roster, shift, assignment } = await findAssignedShift(shiftId, payload.staffId);
    if (!assignment.signedInAt) {
        throw new Error('Staff member must sign in before signing out.');
    }
    if (assignment.signedOutAt) {
        throw new Error('Staff member has already signed out for this shift.');
    }
    assignment.signedOutAt = new Date();
    assignment.attendanceStatus = assignment.attendanceStatus === AttendanceStatus.LATE
        ? AttendanceStatus.LATE
        : AttendanceStatus.PRESENT;
    if (payload.notes !== undefined)
        assignment.attendanceNotes = payload.notes;
    assignment.status = AssignmentStatus.COMPLETED;
    const everyoneSignedOut = shift.assignedStaff.length > 0 &&
        shift.assignedStaff.every((item) => !!item.signedOutAt);
    if (everyoneSignedOut)
        shift.status = ShiftStatus.COMPLETED;
    await roster.save();
    return assignment;
};
export const getAttendanceReport = async (filters) => {
    if (filters.staffId)
        assertObjectId(filters.staffId, 'staffId');
    if (filters.rosterId)
        assertObjectId(filters.rosterId, 'rosterId');
    const start = new Date(filters.startDate);
    const end = new Date(filters.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new Error('Invalid attendance report date range.');
    }
    if (start > end)
        throw new Error('Report start date cannot be after end date.');
    end.setHours(23, 59, 59, 999);
    const query = {
        status: { $in: [RosterStatus.DRAFT, RosterStatus.PUBLISHED] },
        startDate: { $lte: end },
        endDate: { $gte: start },
    };
    if (filters.rosterId)
        query._id = toObjectId(filters.rosterId);
    if (filters.areaType)
        query.areaType = filters.areaType;
    const rosters = await RosterModel.find(query).lean();
    const now = new Date();
    const rows = [];
    for (const roster of rosters) {
        for (const shift of roster.shifts || []) {
            const shiftDate = new Date(shift.date);
            if (shiftDate < start || shiftDate > end)
                continue;
            if (filters.staffId && !shift.assignedStaff?.some((a) => a.staffId.toString() === filters.staffId))
                continue;
            const shiftStart = getShiftDateTime(shift.date, shift.startTime);
            const shiftEnd = getShiftEndDateTime(shift.date, shift.startTime, shift.endTime);
            const graceEnd = new Date(shiftStart.getTime() + ATTENDANCE_GRACE_MINUTES * 60000);
            for (const assignment of shift.assignedStaff || []) {
                if (filters.staffId && assignment.staffId.toString() !== filters.staffId)
                    continue;
                let attendanceStatus = assignment.attendanceStatus || AttendanceStatus.SCHEDULED;
                if (!assignment.signedInAt && now > graceEnd)
                    attendanceStatus = AttendanceStatus.ABSENT;
                else if (assignment.signedInAt && !assignment.signedOutAt && now > shiftEnd)
                    attendanceStatus = AttendanceStatus.MISSED_SIGN_OUT;
                rows.push({
                    rosterId: roster._id,
                    rosterName: roster.name,
                    shiftId: shift._id,
                    date: shift.date,
                    startTime: shift.startTime,
                    endTime: shift.endTime,
                    shiftType: shift.shiftType,
                    areaType: shift.areaType,
                    departmentName: shift.departmentName,
                    wardName: shift.wardName,
                    location: shift.location,
                    staffId: assignment.staffId,
                    role: assignment.role,
                    attendanceStatus,
                    signedInAt: assignment.signedInAt,
                    signedOutAt: assignment.signedOutAt,
                    lateByMinutes: assignment.lateByMinutes || 0,
                    attendanceNotes: assignment.attendanceNotes,
                });
            }
        }
    }
    return {
        startDate: filters.startDate,
        endDate: filters.endDate,
        graceMinutes: ATTENDANCE_GRACE_MINUTES,
        total: rows.length,
        summary: {
            scheduled: rows.filter(r => r.attendanceStatus === AttendanceStatus.SCHEDULED).length,
            present: rows.filter(r => r.attendanceStatus === AttendanceStatus.PRESENT).length,
            late: rows.filter(r => r.attendanceStatus === AttendanceStatus.LATE).length,
            absent: rows.filter(r => r.attendanceStatus === AttendanceStatus.ABSENT).length,
            missedSignOut: rows.filter(r => r.attendanceStatus === AttendanceStatus.MISSED_SIGN_OUT).length,
        },
        rows,
    };
};
/* =========================================================
   STAFF ROSTER VIEW
========================================================= */
export const getStaffRoster = async (staffId, startDate, endDate) => {
    assertObjectId(staffId, 'staffId');
    const rosters = await RosterModel.find({
        status: {
            $in: [
                RosterStatus.DRAFT,
                RosterStatus.PUBLISHED,
            ],
            ...(startDate ||
                endDate
                ? {}
                : {}),
        },
        ...(startDate ||
            endDate
            ? {
                startDate: {
                    ...(startDate
                        ? {
                            $lte: new Date(endDate ||
                                startDate),
                        }
                        : {}),
                },
                endDate: {
                    ...(endDate
                        ? {
                            $gte: new Date(startDate ||
                                endDate),
                        }
                        : {}),
                },
            }
            : {}),
    }).lean();
    return rosters.map((roster) => ({
        ...roster,
        shifts: roster.shifts.filter((shift) => shift.assignedStaff.some((assignment) => assignment.staffId.toString() ===
            staffId)),
    })).filter((roster) => roster.shifts.length > 0);
};
