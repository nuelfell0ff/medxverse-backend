import { Types } from 'mongoose';
import { PatientModel } from '../patient/patient.model.js';
import { Staff } from '../staff/staff.model.js';
import { StaffRole, StaffStatus } from '../staff/staff.types.js';
import { StaffUser } from '../staff-auth/staff-user.model.js';
import { Department } from '../communication/department.model.js';
import { AppointmentModel } from '../appointment/appointment.model.js';
import { AppointmentStatus, } from '../appointment/appointment.types.js';
import { PatientAssignmentModel } from './patient-assignment.model.js';
import { PatientAssignmentRole, PatientAssignmentSource, PatientAssignmentStatus, } from './patient-assignment.types.js';
const error = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
function objectId(value, field) {
    if (!Types.ObjectId.isValid(value)) {
        throw error(`Invalid ${field}.`);
    }
    return new Types.ObjectId(value);
}
function cleanDate(value, field) {
    if (!value)
        return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw error(`Invalid ${field}.`);
    }
    return date;
}
function assignmentRoleForStaff(role) {
    switch (role) {
        case StaffRole.DOCTOR:
            return PatientAssignmentRole.PRIMARY_PHYSICIAN;
        case StaffRole.NURSE:
            return PatientAssignmentRole.PRIMARY_NURSE;
        case StaffRole.PHARMACIST:
            return PatientAssignmentRole.PHARMACIST;
        case StaffRole.LAB_TECH:
            return PatientAssignmentRole.LAB_TECHNICIAN;
        case StaffRole.RADIOLOGY_TECH:
            return PatientAssignmentRole.RADIOLOGIST;
        default:
            return PatientAssignmentRole.CARE_TEAM;
    }
}
export class PatientAssignmentService {
    static async resolveStaffId(userId, hospitalId) {
        const user = await StaffUser.findOne({
            _id: objectId(userId, 'user ID'),
            hospitalId: objectId(hospitalId, 'hospital ID'),
            isActive: true,
            status: 'ACTIVE',
        })
            .select('staffId')
            .lean();
        if (!user) {
            throw error('Active staff account not found.', 403);
        }
        return objectId(String(user.staffId), 'staff ID');
    }
    static async assertPatient(hospitalId, patientId) {
        const patient = await PatientModel.findOne({
            _id: objectId(patientId, 'patient ID'),
            hospitalId: objectId(hospitalId, 'hospital ID'),
            active: true,
        })
            .select('_id firstName lastName mrn universalPatientId')
            .lean();
        if (!patient) {
            throw error('Patient not found in this hospital.', 404);
        }
        return patient;
    }
    static async assertStaff(hospitalId, staffId) {
        const staff = await Staff.findOne({
            _id: objectId(staffId, 'staff ID'),
            hospitalId: objectId(hospitalId, 'hospital ID'),
            isActive: true,
            status: StaffStatus.ACTIVE,
        })
            .select('_id firstName lastName staffId role employment specialties')
            .lean();
        if (!staff) {
            throw error('Active staff member not found in this hospital.', 404);
        }
        return staff;
    }
    static async resolveDepartment(hospitalId, departmentId) {
        if (!departmentId) {
            return undefined;
        }
        const department = await Department.findOne({
            _id: objectId(departmentId, 'department ID'),
            hospitalId: objectId(hospitalId, 'hospital ID'),
            isActive: true,
        })
            .select('_id name code')
            .lean();
        if (!department) {
            throw error('Department not found in this hospital.', 404);
        }
        return department;
    }
    static async createAssignment(hospitalId, actorId, actorUserType, dto) {
        const hospitalObjectId = objectId(hospitalId, 'hospital ID');
        const patient = await this.assertPatient(hospitalId, dto.patientId);
        const staff = await this.assertStaff(hospitalId, dto.staffId);
        const department = await this.resolveDepartment(hospitalId, dto.departmentId ||
            (staff.employment?.departmentId
                ? String(staff.employment.departmentId)
                : undefined));
        const startAt = cleanDate(dto.startAt, 'startAt') || new Date();
        const endAt = cleanDate(dto.endAt, 'endAt');
        if (endAt && endAt <= startAt) {
            throw error('endAt must be later than startAt.');
        }
        const source = dto.source || PatientAssignmentSource.MANUAL;
        const role = dto.role || assignmentRoleForStaff(staff.role);
        if (dto.appointmentId) {
            const appointment = await AppointmentModel.findOne({
                _id: objectId(dto.appointmentId, 'appointment ID'),
                hospitalId: hospitalObjectId,
                patientId: patient._id,
                doctorId: staff._id,
            })
                .select('_id department')
                .lean();
            if (!appointment) {
                throw error('Appointment does not belong to this patient, staff member, and hospital.', 400);
            }
        }
        const existing = await PatientAssignmentModel.findOne({
            hospitalId: hospitalObjectId,
            patientId: patient._id,
            staffId: staff._id,
            role,
            status: PatientAssignmentStatus.ACTIVE,
        }).lean();
        if (existing) {
            return this.getAssignmentById(hospitalId, String(existing._id));
        }
        const assignment = await PatientAssignmentModel.create({
            hospitalId: hospitalObjectId,
            patientId: patient._id,
            staffId: staff._id,
            role,
            status: PatientAssignmentStatus.ACTIVE,
            departmentId: department?._id,
            departmentName: department?.name,
            source,
            appointmentId: dto.appointmentId
                ? objectId(dto.appointmentId, 'appointment ID')
                : undefined,
            assignedBy: objectId(actorId, 'actor ID'),
            assignedByUserType: actorUserType,
            startAt,
            endAt,
            notes: dto.notes,
        });
        await this.refreshStaffCaseload(hospitalId, String(staff._id));
        return this.getAssignmentById(hospitalId, String(assignment._id));
    }
    static async assignFromAppointment(hospitalId, appointmentId) {
        const appointment = (await AppointmentModel.findOne({
            _id: objectId(appointmentId, 'appointment ID'),
            hospitalId: objectId(hospitalId, 'hospital ID'),
        })
            .select('_id patientId doctorId department appointmentDate status')
            .lean());
        if (!appointment) {
            return null;
        }
        const staff = await Staff.findOne({
            _id: appointment.doctorId,
            hospitalId: objectId(hospitalId, 'hospital ID'),
            isActive: true,
            status: StaffStatus.ACTIVE,
        })
            .select('_id role employment')
            .lean();
        if (!staff) {
            throw error('The appointment doctor is not an active staff member in this hospital.', 409);
        }
        const role = assignmentRoleForStaff(staff.role);
        const existing = await PatientAssignmentModel.findOne({
            hospitalId: objectId(hospitalId, 'hospital ID'),
            appointmentId: appointment._id,
            staffId: staff._id,
            role,
        }).lean();
        if (existing) {
            return existing;
        }
        const departmentName = appointment.department;
        const assignment = await PatientAssignmentModel.create({
            hospitalId: objectId(hospitalId, 'hospital ID'),
            patientId: appointment.patientId,
            staffId: staff._id,
            role,
            status: PatientAssignmentStatus.ACTIVE,
            departmentName,
            source: PatientAssignmentSource.APPOINTMENT,
            appointmentId: appointment._id,
            startAt: appointment.appointmentDate,
            assignedByUserType: 'ACCOUNT',
        });
        await this.refreshStaffCaseload(hospitalId, String(staff._id));
        return assignment;
    }
    static async endAppointmentAssignment(hospitalId, appointmentId) {
        const assignments = await PatientAssignmentModel.find({
            hospitalId: objectId(hospitalId, 'hospital ID'),
            appointmentId: objectId(appointmentId, 'appointment ID'),
            status: PatientAssignmentStatus.ACTIVE,
            source: PatientAssignmentSource.APPOINTMENT,
        });
        if (!assignments.length) {
            return 0;
        }
        const endedAt = new Date();
        for (const assignment of assignments) {
            assignment.status = PatientAssignmentStatus.ENDED;
            assignment.endAt = endedAt;
            await assignment.save();
            await this.refreshStaffCaseload(hospitalId, String(assignment.staffId));
        }
        return assignments.length;
    }
    static async syncAppointmentAssignments(hospitalId) {
        const appointments = await AppointmentModel.find({
            hospitalId: objectId(hospitalId, 'hospital ID'),
            status: {
                $in: [
                    AppointmentStatus.SCHEDULED,
                    AppointmentStatus.CHECKED_IN,
                    AppointmentStatus.IN_PROGRESS,
                ],
            },
        })
            .select('_id')
            .lean();
        let created = 0;
        for (const appointment of appointments) {
            const before = await PatientAssignmentModel.exists({
                hospitalId: objectId(hospitalId, 'hospital ID'),
                appointmentId: appointment._id,
            });
            await this.assignFromAppointment(hospitalId, String(appointment._id));
            if (!before) {
                created += 1;
            }
        }
        return {
            scanned: appointments.length,
            created,
        };
    }
    static async endAssignment(hospitalId, assignmentId, dto) {
        const assignment = await PatientAssignmentModel.findOne({
            _id: objectId(assignmentId, 'assignment ID'),
            hospitalId: objectId(hospitalId, 'hospital ID'),
        });
        if (!assignment) {
            throw error('Patient assignment not found.', 404);
        }
        if (dto.role) {
            assignment.role = dto.role;
        }
        if (dto.status) {
            assignment.status = dto.status;
        }
        if (dto.notes !== undefined) {
            assignment.notes = dto.notes;
        }
        if (dto.endAt !== undefined) {
            const endAt = cleanDate(dto.endAt, 'endAt');
            if (!endAt) {
                throw error('endAt is required when provided.');
            }
            if (endAt <= assignment.startAt) {
                throw error('endAt must be later than startAt.');
            }
            assignment.endAt = endAt;
        }
        if (assignment.status ===
            PatientAssignmentStatus.ENDED &&
            !assignment.endAt) {
            assignment.endAt = new Date();
        }
        if (dto.departmentId !== undefined) {
            const department = await this.resolveDepartment(hospitalId, dto.departmentId);
            assignment.departmentId =
                department?._id;
            assignment.departmentName =
                department?.name;
        }
        await assignment.save();
        await this.refreshStaffCaseload(hospitalId, String(assignment.staffId));
        return this.getAssignmentById(hospitalId, assignmentId);
    }
    static async getAssignmentById(hospitalId, assignmentId) {
        const assignment = await PatientAssignmentModel.findOne({
            _id: objectId(assignmentId, 'assignment ID'),
            hospitalId: objectId(hospitalId, 'hospital ID'),
        })
            .populate('patientId', 'firstName lastName mrn universalPatientId dateOfBirth gender phone email active isFlagged flagReason')
            .populate('staffId', 'firstName lastName staffId role jobTitle professionalTitle profilePhotoUrl employment specialties')
            .populate('departmentId', 'name code')
            .lean();
        if (!assignment) {
            throw error('Patient assignment not found.', 404);
        }
        return assignment;
    }
    static async getMyPatient(hospitalId, staffId, patientId) {
        const patient = await this.assertPatient(hospitalId, patientId);
        const assignmentFilter = {
            hospitalId: objectId(hospitalId, 'hospital ID'),
            patientId: patient._id,
            staffId: objectId(staffId, 'staff ID'),
            status: PatientAssignmentStatus.ACTIVE,
        };
        const assignments = await PatientAssignmentModel.find(assignmentFilter)
            .sort({ startAt: -1 })
            .populate('departmentId', 'name code')
            .lean();
        if (!assignments.length) {
            throw error('You are not assigned to this patient.', 403);
        }
        return {
            patient,
            assignments,
        };
    }
    static async listPatientAssignments(hospitalId, patientId) {
        await this.assertPatient(hospitalId, patientId);
        return PatientAssignmentModel.find({
            hospitalId: objectId(hospitalId, 'hospital ID'),
            patientId: objectId(patientId, 'patient ID'),
        })
            .sort({
            status: 1,
            startAt: -1,
        })
            .populate('staffId', 'firstName lastName staffId role jobTitle professionalTitle profilePhotoUrl employment specialties')
            .populate('departmentId', 'name code')
            .lean();
    }
    static async listMyPatients(hospitalId, staffId, query) {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
        const skip = (page - 1) * limit;
        const hospitalObjectId = objectId(hospitalId, 'hospital ID');
        const staffObjectId = objectId(staffId, 'staff ID');
        const assignmentFilter = {
            hospitalId: hospitalObjectId,
            staffId: staffObjectId,
            status: query.status ||
                PatientAssignmentStatus.ACTIVE,
        };
        if (query.role) {
            assignmentFilter.role = query.role;
        }
        const assignments = await PatientAssignmentModel.find(assignmentFilter)
            .sort({ startAt: -1 })
            .select('patientId role status departmentId departmentName source appointmentId startAt endAt notes')
            .lean();
        const patientIds = [
            ...new Set(assignments.map((assignment) => String(assignment.patientId))),
        ].map((id) => objectId(id, 'patient ID'));
        if (!patientIds.length) {
            return {
                patients: [],
                total: 0,
                page,
                limit,
                pages: 0,
            };
        }
        const patientFilter = {
            _id: { $in: patientIds },
            hospitalId: hospitalObjectId,
            active: true,
        };
        if (query.search?.trim()) {
            const escaped = query.search
                .trim()
                .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            patientFilter.$or = [
                {
                    firstName: {
                        $regex: escaped,
                        $options: 'i',
                    },
                },
                {
                    lastName: {
                        $regex: escaped,
                        $options: 'i',
                    },
                },
                {
                    mrn: {
                        $regex: escaped,
                        $options: 'i',
                    },
                },
                {
                    universalPatientId: {
                        $regex: escaped,
                        $options: 'i',
                    },
                },
                {
                    phone: {
                        $regex: escaped,
                        $options: 'i',
                    },
                },
            ];
        }
        const [patients, total] = await Promise.all([
            PatientModel.find(patientFilter)
                .select('_id firstName lastName mrn universalPatientId dateOfBirth gender phone email bloodGroup isFlagged flagReason active createdAt updatedAt')
                .sort({
                lastName: 1,
                firstName: 1,
            })
                .skip(skip)
                .limit(limit)
                .lean(),
            PatientModel.countDocuments(patientFilter),
        ]);
        const assignmentMap = new Map();
        for (const assignment of assignments) {
            const key = String(assignment.patientId);
            const existing = assignmentMap.get(key) || [];
            existing.push(assignment);
            assignmentMap.set(key, existing);
        }
        const hydratedPatients = patients.map((patient) => ({
            ...patient,
            assignments: assignmentMap.get(String(patient._id)) || [],
        }));
        return {
            patients: hydratedPatients,
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        };
    }
    static async refreshStaffCaseload(hospitalId, staffId) {
        const count = await PatientAssignmentModel.countDocuments({
            hospitalId: objectId(hospitalId, 'hospital ID'),
            staffId: objectId(staffId, 'staff ID'),
            status: PatientAssignmentStatus.ACTIVE,
        });
        await Staff.updateOne({
            _id: objectId(staffId, 'staff ID'),
            hospitalId: objectId(hospitalId, 'hospital ID'),
        }, {
            $set: {
                activePatientCaseload: count,
            },
        });
        return count;
    }
}
