import { Types } from 'mongoose';

import {
  RosterModel,
  StaffAvailabilityModel,
  ShiftSwapModel,
  ShiftHandoverModel,
} from './rostering.model.js';

import {
  AssignmentStatus,
  AvailabilityStatus,
  HandoverStatus,
  RosterStatus,
  ShiftStatus,
  SwapStatus,
  CreateRosterDto,
  UpdateRosterDto,
  CreateShiftDto,
  AssignStaffDto,
  SetAvailabilityDto,
  CreateSwapDto,
  ApproveSwapDto,
  CreateHandoverDto,
} from './rostering.types.js';

const toObjectId = (id: string) =>
  new Types.ObjectId(id);

const assertObjectId = (
  value: string,
  field = 'id'
) => {
  if (!Types.ObjectId.isValid(value)) {
    throw new Error(`Invalid ${field}.`);
  }
};

/* =========================================================
   ROSTERS
========================================================= */

export const createRoster = async (
  payload: CreateRosterDto,
  userId?: string
) => {
  if (
    new Date(payload.startDate) >
    new Date(payload.endDate)
  ) {
    throw new Error(
      'Roster start date cannot be after end date.'
    );
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

export const getRosters = async (
  filters: {
    status?: string;
    areaType?: string;
    departmentId?: string;
    wardId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  } = {}
) => {
  const page = Math.max(filters.page || 1, 1);
  const limit = Math.min(
    Math.max(filters.limit || 20, 1),
    100
  );

  const query: Record<string, any> = {};

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.areaType) {
    query.areaType = filters.areaType;
  }

  if (filters.departmentId) {
    assertObjectId(
      filters.departmentId,
      'departmentId'
    );

    query.departmentId = toObjectId(
      filters.departmentId
    );
  }

  if (filters.wardId) {
    assertObjectId(
      filters.wardId,
      'wardId'
    );

    query.wardId = toObjectId(
      filters.wardId
    );
  }

  if (
    filters.startDate ||
    filters.endDate
  ) {
    query.startDate = {};

    if (filters.startDate) {
      query.startDate.$gte = new Date(
        filters.startDate
      );
    }

    if (filters.endDate) {
      query.startDate.$lte = new Date(
        filters.endDate
      );
    }
  }

  const [rosters, total] =
    await Promise.all([
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

export const getRosterById = async (
  rosterId: string
) => {
  assertObjectId(rosterId, 'rosterId');

  const roster = await RosterModel.findById(
    rosterId
  ).lean();

  if (!roster) {
    throw new Error('Roster not found.');
  }

  return roster;
};

export const updateRoster = async (
  rosterId: string,
  payload: UpdateRosterDto,
  userId?: string
) => {
  assertObjectId(rosterId, 'rosterId');

  const roster =
    await RosterModel.findById(rosterId);

  if (!roster) {
    throw new Error('Roster not found.');
  }

  if (
    roster.status === RosterStatus.PUBLISHED
  ) {
    throw new Error(
      'Published rosters cannot be directly edited. Create a new version instead.'
    );
  }

  Object.assign(roster, payload);

  if (payload.startDate) {
    roster.startDate = new Date(
      payload.startDate
    );
  }

  if (payload.endDate) {
    roster.endDate = new Date(
      payload.endDate
    );
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

export const createShift = async (
  payload: CreateShiftDto,
  userId?: string
) => {
  assertObjectId(
    payload.rosterId,
    'rosterId'
  );

  const roster =
    await RosterModel.findById(
      payload.rosterId
    );

  if (!roster) {
    throw new Error('Roster not found.');
  }

  if (
    roster.status === RosterStatus.PUBLISHED
  ) {
    throw new Error(
      'Cannot add shifts to a published roster.'
    );
  }

  const date = new Date(payload.date);

  if (
    date < roster.startDate ||
    date > roster.endDate
  ) {
    throw new Error(
      'Shift date must fall within the roster date range.'
    );
  }

  roster.shifts.push({
    date,

    startTime: payload.startTime,
    endTime: payload.endTime,

    shiftType: payload.shiftType,

    status: ShiftStatus.OPEN,

    areaType:
      payload.areaType ||
      roster.areaType,

    departmentId:
      payload.departmentId
        ? toObjectId(payload.departmentId)
        : roster.departmentId,

    departmentName:
      payload.departmentName ||
      roster.departmentName,

    wardId:
      payload.wardId
        ? toObjectId(payload.wardId)
        : roster.wardId,

    wardName:
      payload.wardName ||
      roster.wardName,

    location: payload.location,

    requiredStaffCount:
      payload.requiredStaffCount || 1,

    notes: payload.notes,

    isOpenShift:
      payload.isOpenShift ?? true,

    assignedStaff: [],
  });

  roster.updatedBy = userId
    ? toObjectId(userId)
    : undefined;

  await roster.save();

  return roster.shifts[
    roster.shifts.length - 1
  ];
};

export const updateShift = async (
  rosterId: string,
  shiftId: string,
  updates: Record<string, unknown>,
  userId?: string
) => {
  assertObjectId(rosterId, 'rosterId');
  assertObjectId(shiftId, 'shiftId');

  const roster =
    await RosterModel.findById(rosterId);

  if (!roster) {
    throw new Error('Roster not found.');
  }

  if (
    roster.status === RosterStatus.PUBLISHED
  ) {
    throw new Error(
      'Published rosters cannot be edited.'
    );
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
    if (
      Object.prototype.hasOwnProperty.call(
        updates,
        field
      )
    ) {
      (shift as any)[field] =
        updates[field];
    }
  }

  roster.updatedBy = userId
    ? toObjectId(userId)
    : undefined;

  await roster.save();

  return shift;
};

export const assignStaffToShift = async (
  rosterId: string,
  shiftId: string,
  payload: AssignStaffDto,
  userId?: string
) => {
  assertObjectId(rosterId, 'rosterId');
  assertObjectId(shiftId, 'shiftId');
  assertObjectId(
    payload.staffId,
    'staffId'
  );

  const roster =
    await RosterModel.findById(rosterId);

  if (!roster) {
    throw new Error('Roster not found.');
  }

  if (
    roster.status === RosterStatus.PUBLISHED
  ) {
    throw new Error(
      'Published rosters cannot be modified.'
    );
  }

  const shift = roster.shifts.id(shiftId);

  if (!shift) {
    throw new Error('Shift not found.');
  }

  const alreadyAssigned =
    shift.assignedStaff.some(
      (assignment: any) =>
        assignment.staffId.toString() ===
        payload.staffId
    );

  if (alreadyAssigned) {
    throw new Error(
      'Staff member is already assigned to this shift.'
    );
  }

  /* -------------------------------------------------------
     Prevent duplicate active assignment
  ------------------------------------------------------- */

  shift.assignedStaff.push({
    staffId: toObjectId(
      payload.staffId
    ),

    role: payload.role,

    status: AssignmentStatus.PENDING,

    notes: payload.notes,

    assignedAt: new Date(),

    assignedBy: userId
      ? toObjectId(userId)
      : undefined,
  } as any);

  shift.isOpenShift = false;

  if (
    shift.assignedStaff.length >=
    (shift.requiredStaffCount || 1)
  ) {
    shift.status =
      ShiftStatus.ASSIGNED;
  }

  await roster.save();

  return shift;
};

export const removeStaffFromShift =
  async (
    rosterId: string,
    shiftId: string,
    staffId: string
  ) => {
    assertObjectId(rosterId, 'rosterId');
    assertObjectId(shiftId, 'shiftId');
    assertObjectId(staffId, 'staffId');

    const roster =
      await RosterModel.findById(rosterId);

    if (!roster) {
      throw new Error('Roster not found.');
    }

    if (
      roster.status ===
      RosterStatus.PUBLISHED
    ) {
      throw new Error(
        'Published rosters cannot be modified.'
      );
    }

    const shift =
      roster.shifts.id(shiftId);

    if (!shift) {
      throw new Error('Shift not found.');
    }

    shift.assignedStaff =
      shift.assignedStaff.filter(
        (assignment: any) =>
          assignment.staffId.toString() !==
          staffId
      ) as any;

    if (
      shift.assignedStaff.length === 0
    ) {
      shift.status = ShiftStatus.OPEN;
      shift.isOpenShift = true;
    }

    await roster.save();

    return shift;
  };

/* =========================================================
   STAFF ACCEPTANCE
========================================================= */

export const acceptShift = async (
  rosterId: string,
  shiftId: string,
  staffId: string
) => {
  assertObjectId(rosterId, 'rosterId');
  assertObjectId(shiftId, 'shiftId');
  assertObjectId(staffId, 'staffId');

  const roster =
    await RosterModel.findById(
      rosterId
    );

  if (!roster) {
    throw new Error('Roster not found.');
  }

  const shift = roster.shifts.id(shiftId);

  if (!shift) {
    throw new Error('Shift not found.');
  }

  const assignment =
    shift.assignedStaff.find(
      (item: any) =>
        item.staffId.toString() ===
        staffId
    );

  if (!assignment) {
    throw new Error(
      'Staff member is not assigned to this shift.'
    );
  }

  assignment.status =
    AssignmentStatus.ACCEPTED;

  assignment.acceptedAt = new Date();

  shift.status =
    ShiftStatus.ACCEPTED;

  await roster.save();

  return shift;
};

export const declineShift = async (
  rosterId: string,
  shiftId: string,
  staffId: string,
  notes?: string
) => {
  assertObjectId(rosterId, 'rosterId');
  assertObjectId(shiftId, 'shiftId');
  assertObjectId(staffId, 'staffId');

  const roster =
    await RosterModel.findById(
      rosterId
    );

  if (!roster) {
    throw new Error('Roster not found.');
  }

  const shift = roster.shifts.id(shiftId);

  if (!shift) {
    throw new Error('Shift not found.');
  }

  const assignment =
    shift.assignedStaff.find(
      (item: any) =>
        item.staffId.toString() ===
        staffId
    );

  if (!assignment) {
    throw new Error(
      'Staff member is not assigned to this shift.'
    );
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

export const publishRoster = async (
  rosterId: string,
  userId?: string
) => {
  assertObjectId(rosterId, 'rosterId');

  const roster =
    await RosterModel.findById(
      rosterId
    );

  if (!roster) {
    throw new Error('Roster not found.');
  }

  if (
    roster.status ===
    RosterStatus.PUBLISHED
  ) {
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

export const setStaffAvailability =
  async (
    payload: SetAvailabilityDto
  ) => {
    assertObjectId(
      payload.staffId,
      'staffId'
    );

    const date = new Date(payload.date);

    const availability =
      await StaffAvailabilityModel.findOneAndUpdate(
        {
          staffId: toObjectId(
            payload.staffId
          ),
          date,
        },
        {
          $set: {
            status: payload.status,
            preferredShiftTypes:
              payload.preferredShiftTypes ||
              [],
            availableFrom:
              payload.availableFrom,
            availableTo:
              payload.availableTo,
            notes: payload.notes,
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );

    return availability;
  };

export const getStaffAvailability =
  async (
    staffId: string,
    startDate?: string,
    endDate?: string
  ) => {
    assertObjectId(
      staffId,
      'staffId'
    );

    const query: Record<string, any> = {
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

    return StaffAvailabilityModel.find(
      query
    )
      .sort({ date: 1 })
      .lean();
  };

/* =========================================================
   OPEN SHIFTS
========================================================= */

export const getOpenShifts = async (
  startDate?: string,
  endDate?: string,
  areaType?: string
) => {
  const query: Record<string, any> = {
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

  const rosters =
    await RosterModel.find({
      status: RosterStatus.PUBLISHED,
    }).lean();

  return rosters.flatMap(
    (roster: any) =>
      roster.shifts.filter(
        (shift: any) => {
          if (
            shift.status !==
            ShiftStatus.OPEN
          ) {
            return false;
          }

          if (
            areaType &&
            shift.areaType !== areaType
          ) {
            return false;
          }

          if (
            startDate &&
            new Date(shift.date) <
              new Date(startDate)
          ) {
            return false;
          }

          if (
            endDate &&
            new Date(shift.date) >
              new Date(endDate)
          ) {
            return false;
          }

          return true;
        }
      )
  );
};

/* =========================================================
   SHIFT SWAPS
========================================================= */

export const createShiftSwap =
  async (
    payload: CreateSwapDto
  ) => {
    assertObjectId(
      payload.shiftId,
      'shiftId'
    );

    assertObjectId(
      payload.requesterStaffId,
      'requesterStaffId'
    );

    if (
      payload.replacementStaffId
    ) {
      assertObjectId(
        payload.replacementStaffId,
        'replacementStaffId'
      );
    }

    return ShiftSwapModel.create({
      shiftId: toObjectId(
        payload.shiftId
      ),

      requesterStaffId:
        toObjectId(
          payload.requesterStaffId
        ),

      replacementStaffId:
        payload.replacementStaffId
          ? toObjectId(
              payload.replacementStaffId
            )
          : undefined,

      reason: payload.reason,

      status: SwapStatus.PENDING,
    });
  };

export const approveShiftSwap =
  async (
    swapId: string,
    payload: ApproveSwapDto,
    approverId?: string
  ) => {
    assertObjectId(
      swapId,
      'swapId'
    );

    const swap =
      await ShiftSwapModel.findById(
        swapId
      );

    if (!swap) {
      throw new Error(
        'Shift swap request not found.'
      );
    }

    if (
      swap.status !==
      SwapStatus.PENDING
    ) {
      throw new Error(
        'This shift swap has already been processed.'
      );
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

      const roster =
        await RosterModel.findOne({
          'shifts._id': swap.shiftId,
        });

      if (!roster) {
        throw new Error(
          'Roster containing the shift was not found.'
        );
      }

      const shift =
        roster.shifts.id(
          swap.shiftId
        );

      if (!shift) {
        throw new Error(
          'Shift not found.'
        );
      }

      const oldAssignment =
        shift.assignedStaff.find(
          (assignment: any) =>
            assignment.staffId.toString() ===
            swap.requesterStaffId.toString()
        );

      if (!oldAssignment) {
        throw new Error(
          'Requester is not assigned to this shift.'
        );
      }

      if (
        swap.replacementStaffId
      ) {
        oldAssignment.staffId =
          swap.replacementStaffId;

        oldAssignment.status =
          AssignmentStatus.PENDING;

        oldAssignment.acceptedAt =
          undefined;
      }
      
      await roster.save();
    } else {
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

export const createHandover =
  async (
    payload: CreateHandoverDto
  ) => {
    assertObjectId(
      payload.shiftId,
      'shiftId'
    );

    assertObjectId(
      payload.outgoingStaffId,
      'outgoingStaffId'
    );

    if (payload.incomingStaffId) {
      assertObjectId(
        payload.incomingStaffId,
        'incomingStaffId'
      );
    }

    return ShiftHandoverModel.create({
      shiftId: toObjectId(
        payload.shiftId
      ),

      outgoingStaffId:
        toObjectId(
          payload.outgoingStaffId
        ),

      incomingStaffId:
        payload.incomingStaffId
          ? toObjectId(
              payload.incomingStaffId
            )
          : undefined,

      summary: payload.summary,

      pendingTasks:
        payload.pendingTasks || [],

      importantNotes:
        payload.importantNotes || [],

      status:
        HandoverStatus.PENDING,
    });
  };

export const completeHandover =
  async (
    handoverId: string
  ) => {
    assertObjectId(
      handoverId,
      'handoverId'
    );

    const handover =
      await ShiftHandoverModel.findById(
        handoverId
      );

    if (!handover) {
      throw new Error(
        'Handover not found.'
      );
    }

    handover.status =
      HandoverStatus.COMPLETED;

    handover.completedAt =
      new Date();

    await handover.save();

    return handover;
  };

/* =========================================================
   STAFF ROSTER VIEW
========================================================= */

export const getStaffRoster =
  async (
    staffId: string,
    startDate?: string,
    endDate?: string
  ) => {
    assertObjectId(
      staffId,
      'staffId'
    );

    const rosters =
      await RosterModel.find({
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
                      $lte: new Date(
                        endDate ||
                          startDate
                      ),
                    }
                  : {}),
              },
              endDate: {
                ...(endDate
                  ? {
                      $gte: new Date(
                        startDate ||
                          endDate
                      ),
                    }
                  : {}),
              },
            }
          : {}),
      }).lean();

    return rosters.map(
      (roster: any) => ({
        ...roster,
        shifts:
          roster.shifts.filter(
            (shift: any) =>
              shift.assignedStaff.some(
                (assignment: any) =>
                  assignment.staffId.toString() ===
                  staffId
              )
          ),
      })
    ).filter(
      (roster: any) =>
        roster.shifts.length > 0
    );
  };