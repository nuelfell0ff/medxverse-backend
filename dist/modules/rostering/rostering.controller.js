import * as RosteringService from './rostering.service.js';
const getUserId = (req) => {
    const user = req.user;
    return (user?._id ||
        user?.id ||
        user?.staffId ||
        user?.userId ||
        user?.sub);
};
const handleError = (res, error) => {
    const message = error instanceof Error
        ? error.message
        : 'An unexpected error occurred.';
    const status = message.includes('not found')
        ? 404
        : message.includes('already')
            ? 409
            : 400;
    return res.status(status).json({
        success: false,
        message,
    });
};
/* =========================================================
   ROSTERS
========================================================= */
export const createRoster = async (req, res) => {
    try {
        const roster = await RosteringService.createRoster(req.body, getUserId(req));
        return res.status(201).json({
            success: true,
            message: 'Roster created successfully.',
            data: roster,
        });
    }
    catch (error) {
        return handleError(res, error);
    }
};
export const getRosters = async (req, res) => {
    try {
        const result = await RosteringService.getRosters({
            status: req.query.status,
            areaType: req.query.areaType,
            departmentId: req.query.departmentId,
            wardId: req.query.wardId,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            page: Number(req.query.page || 1),
            limit: Number(req.query.limit || 20),
        });
        return res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        return handleError(res, error);
    }
};
export const getRosterById = async (req, res) => {
    try {
        const roster = await RosteringService.getRosterById(req.params.id);
        return res.json({
            success: true,
            data: roster,
        });
    }
    catch (error) {
        return handleError(res, error);
    }
};
export const updateRoster = async (req, res) => {
    try {
        const roster = await RosteringService.updateRoster(req.params.id, req.body, getUserId(req));
        return res.json({
            success: true,
            message: 'Roster updated successfully.',
            data: roster,
        });
    }
    catch (error) {
        return handleError(res, error);
    }
};
/* =========================================================
   SHIFTS
========================================================= */
export const createShift = async (req, res) => {
    try {
        const shift = await RosteringService.createShift(req.body, getUserId(req));
        return res.status(201).json({
            success: true,
            message: 'Shift created successfully.',
            data: shift,
        });
    }
    catch (error) {
        return handleError(res, error);
    }
};
export const updateShift = async (req, res) => {
    try {
        const shift = await RosteringService.updateShift(req.params.rosterId, req.params.shiftId, req.body, getUserId(req));
        return res.json({
            success: true,
            message: 'Shift updated successfully.',
            data: shift,
        });
    }
    catch (error) {
        return handleError(res, error);
    }
};
export const assignStaff = async (req, res) => {
    try {
        const shift = await RosteringService.assignStaffToShift(req.params.rosterId, req.params.shiftId, req.body, getUserId(req));
        return res.json({
            success: true,
            message: 'Staff assigned successfully.',
            data: shift,
        });
    }
    catch (error) {
        return handleError(res, error);
    }
};
export const removeStaff = async (req, res) => {
    try {
        const shift = await RosteringService.removeStaffFromShift(req.params.rosterId, req.params.shiftId, req.params.staffId);
        return res.json({
            success: true,
            message: 'Staff removed from shift.',
            data: shift,
        });
    }
    catch (error) {
        return handleError(res, error);
    }
};
export const acceptShift = async (req, res) => {
    try {
        const shift = await RosteringService.acceptShift(req.params.rosterId, req.params.shiftId, req.params.staffId);
        return res.json({
            success: true,
            message: 'Shift accepted.',
            data: shift,
        });
    }
    catch (error) {
        return handleError(res, error);
    }
};
export const declineShift = async (req, res) => {
    try {
        const shift = await RosteringService.declineShift(req.params.rosterId, req.params.shiftId, req.params.staffId, req.body?.notes);
        return res.json({
            success: true,
            message: 'Shift declined.',
            data: shift,
        });
    }
    catch (error) {
        return handleError(res, error);
    }
};
export const publishRoster = async (req, res) => {
    try {
        const roster = await RosteringService.publishRoster(req.params.id, getUserId(req));
        return res.json({
            success: true,
            message: 'Roster published successfully.',
            data: roster,
        });
    }
    catch (error) {
        return handleError(res, error);
    }
};
/* =========================================================
   AVAILABILITY
========================================================= */
export const setAvailability = async (req, res) => {
    try {
        const availability = await RosteringService.setStaffAvailability(req.body);
        return res.json({
            success: true,
            message: 'Staff availability saved.',
            data: availability,
        });
    }
    catch (error) {
        return handleError(res, error);
    }
};
export const getAvailability = async (req, res) => {
    try {
        const availability = await RosteringService.getStaffAvailability(req.params.staffId, req.query.startDate, req.query.endDate);
        return res.json({
            success: true,
            data: availability,
        });
    }
    catch (error) {
        return handleError(res, error);
    }
};
/* =========================================================
   OPEN SHIFTS
========================================================= */
export const getOpenShifts = async (req, res) => {
    try {
        const shifts = await RosteringService.getOpenShifts(req.query.startDate, req.query.endDate, req.query.areaType);
        return res.json({
            success: true,
            data: shifts,
        });
    }
    catch (error) {
        return handleError(res, error);
    }
};
/* =========================================================
   SWAPS
========================================================= */
export const createShiftSwap = async (req, res) => {
    try {
        const swap = await RosteringService.createShiftSwap(req.body);
        return res.status(201).json({
            success: true,
            message: 'Shift swap request submitted.',
            data: swap,
        });
    }
    catch (error) {
        return handleError(res, error);
    }
};
export const approveShiftSwap = async (req, res) => {
    try {
        const swap = await RosteringService.approveShiftSwap(req.params.swapId, req.body, getUserId(req));
        return res.json({
            success: true,
            message: req.body.approved
                ? 'Shift swap approved.'
                : 'Shift swap rejected.',
            data: swap,
        });
    }
    catch (error) {
        return handleError(res, error);
    }
};
/* =========================================================
   HANDOVERS
========================================================= */
export const createHandover = async (req, res) => {
    try {
        const handover = await RosteringService.createHandover(req.body);
        return res.status(201).json({
            success: true,
            message: 'Shift handover created.',
            data: handover,
        });
    }
    catch (error) {
        return handleError(res, error);
    }
};
export const completeHandover = async (req, res) => {
    try {
        const handover = await RosteringService.completeHandover(req.params.handoverId);
        return res.json({
            success: true,
            message: 'Shift handover completed.',
            data: handover,
        });
    }
    catch (error) {
        return handleError(res, error);
    }
};
/* =========================================================
   SHIFT ATTENDANCE
========================================================= */
export const signInToShift = async (req, res) => {
    try {
        const assignment = await RosteringService.signInToShift(req.params.shiftId, {
            ...(req.body || {}),
            staffId: req.body?.staffId || getUserId(req),
        });
        return res.json({
            success: true,
            message: 'Staff signed in successfully.',
            data: assignment,
        });
    }
    catch (error) {
        return handleError(res, error);
    }
};
export const signOutOfShift = async (req, res) => {
    try {
        const assignment = await RosteringService.signOutOfShift(req.params.shiftId, {
            ...(req.body || {}),
            staffId: req.body?.staffId || getUserId(req),
        });
        return res.json({
            success: true,
            message: 'Staff signed out successfully.',
            data: assignment,
        });
    }
    catch (error) {
        return handleError(res, error);
    }
};
export const getAttendanceReport = async (req, res) => {
    try {
        const report = await RosteringService.getAttendanceReport({
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            staffId: req.query.staffId,
            rosterId: req.query.rosterId,
            areaType: req.query.areaType,
        });
        return res.json({
            success: true,
            data: report,
        });
    }
    catch (error) {
        return handleError(res, error);
    }
};
/* =========================================================
   STAFF ROSTER
========================================================= */
export const getStaffRoster = async (req, res) => {
    try {
        const roster = await RosteringService.getStaffRoster(req.params.staffId, req.query.startDate, req.query.endDate);
        return res.json({
            success: true,
            data: roster,
        });
    }
    catch (error) {
        return handleError(res, error);
    }
};
