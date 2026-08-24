import { Types } from 'mongoose';

import { Staff } from './staff.model.js';

import {
  CreateStaffDTO,
  StaffCategory,
  StaffClassification,
  StaffListFilters,
  StaffRole,
  StaffStatus,
  UpdateStaffDTO,
} from './staff.types.js';

export class StaffService {
  /**
   * Generate the hospital's universal staff ID.
   *
   * Example:
   * ST-000001
   * ST-000002
   */
  private static async generateStaffId(hospitalId: string): Promise<string> {
    const lastStaff = await Staff.findOne({ hospitalId })
      .sort({ createdAt: -1 })
      .select({ staffId: 1 })
      .lean<{ staffId?: string }>();

    let nextNumber = 1;

    if (lastStaff?.staffId) {
      const match = lastStaff.staffId.match(/(\d+)$/);

      if (match) {
        nextNumber = Number(match[1]) + 1;
      }
    }

    return `ST-${String(nextNumber).padStart(6, '0')}`;
  }

  /**
   * Create a healthcare worker.
   */
  public static async createStaff(
    hospitalId: string,
    dto: CreateStaffDTO
  ) {
    if (!Types.ObjectId.isValid(hospitalId)) {
      throw new Error('Invalid hospital ID');
    }

    let staffId = await this.generateStaffId(hospitalId);

    /**
     * Protect against a race condition where two staff
     * records are created simultaneously.
     */
    let existing = await Staff.findOne({
      hospitalId,
      staffId,
    })
      .select({ _id: 1 })
      .lean();

    while (existing) {
      staffId = await this.generateStaffId(hospitalId);

      existing = await Staff.findOne({
        hospitalId,
        staffId,
      })
        .select({ _id: 1 })
        .lean();
    }

    const clinicalRoles: StaffRole[] = [
      StaffRole.DOCTOR,
      StaffRole.NURSE,
      StaffRole.PHARMACIST,
      StaffRole.LAB_TECH,
      StaffRole.RADIOLOGY_TECH,
      StaffRole.PHYSIOTHERAPIST,
      StaffRole.DENTIST,
      StaffRole.MIDWIFE,
      StaffRole.DIETITIAN,
      StaffRole.PSYCHOLOGIST,
      StaffRole.HEALTHCARE_ASSISTANT,
    ];

    const category =
      dto.category ||
      (clinicalRoles.includes(dto.role)
        ? StaffCategory.CLINICAL
        : StaffCategory.ADMINISTRATIVE);

    const staff = await Staff.create({
      ...dto,

      hospitalId,
      staffId,

      category,

      classification:
        dto.classification || StaffClassification.GENERAL,

      specialties: dto.specialties || [],

      professionalRegistrations:
        dto.professionalRegistrations || [],

      qualifications:
        dto.qualifications || [],

      certifications:
        dto.certifications || [],

      professionalExperience:
        dto.professionalExperience || [],

      clinicalPrivileges:
        dto.clinicalPrivileges || [],

      trainingRecords:
        dto.trainingRecords || [],

      performanceRecords:
        dto.performanceRecords || [],

      availability:
        dto.availability || [],

      onCallAssignments:
        dto.onCallAssignments || [],

      leaveRecords:
        dto.leaveRecords || [],

      attendanceRecords:
        dto.attendanceRecords || [],

      incidents:
        dto.incidents || [],

      communications:
        dto.communications || [],

      clinicalActivityCount: 0,

      activePatientCaseload: 0,

      status: StaffStatus.ACTIVE,

      isActive: true,
    });

    return staff;
  }

  /**
   * Fetch hospital staff with filters.
   */
  public static async getHospitalStaff(
    hospitalId: string,
    filters: StaffListFilters
  ) {
    if (!Types.ObjectId.isValid(hospitalId)) {
      throw new Error('Invalid hospital ID');
    }

    const query: Record<string, any> = {
      hospitalId,
    };

    if (filters.role) {
      query.role = filters.role;
    }

    if (filters.category) {
      query.category = filters.category;
    }

    if (filters.classification) {
      query.classification = filters.classification;
    }

    if (filters.departmentId) {
      query['employment.departmentId'] = filters.departmentId;
    }

    if (filters.unitId) {
      query['employment.unitId'] = filters.unitId;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (typeof filters.isActive === 'boolean') {
      query.isActive = filters.isActive;
    }

    if (filters.search?.trim()) {
      const searchTerm = filters.search.trim();

      query.$or = [
        {
          firstName: {
            $regex: searchTerm,
            $options: 'i',
          },
        },
        {
          middleName: {
            $regex: searchTerm,
            $options: 'i',
          },
        },
        {
          lastName: {
            $regex: searchTerm,
            $options: 'i',
          },
        },
        {
          staffId: {
            $regex: searchTerm,
            $options: 'i',
          },
        },
        {
          'contact.phone': {
            $regex: searchTerm,
            $options: 'i',
          },
        },
        {
          'contact.email': {
            $regex: searchTerm,
            $options: 'i',
          },
        },
        {
          'employment.employeeNumber': {
            $regex: searchTerm,
            $options: 'i',
          },
        },
        {
          'employment.jobTitle': {
            $regex: searchTerm,
            $options: 'i',
          },
        },
        {
          'specialties.specialty': {
            $regex: searchTerm,
            $options: 'i',
          },
        },
        {
          'specialties.subSpecialty': {
            $regex: searchTerm,
            $options: 'i',
          },
        },
        {
          'professionalRegistrations.registrationNumber': {
            $regex: searchTerm,
            $options: 'i',
          },
        },
      ];
    }

    return Staff.find(query)
      .sort({
        lastName: 1,
        firstName: 1,
      })
      .lean();
  }

  /**
   * Get a single staff profile.
   */
  public static async getStaffById(
    staffId: string,
    hospitalId: string
  ) {
    if (!Types.ObjectId.isValid(staffId)) {
      throw new Error('Invalid staff ID');
    }

    if (!Types.ObjectId.isValid(hospitalId)) {
      throw new Error('Invalid hospital ID');
    }

    const staff = await Staff.findOne({
      _id: staffId,
      hospitalId,
    }).lean();

    if (!staff) {
      throw new Error('Staff member not found');
    }

    return staff;
  }

  /**
   * Update staff profile.
   */
  public static async updateStaff(
    staffId: string,
    hospitalId: string,
    dto: UpdateStaffDTO
  ) {
    if (!Types.ObjectId.isValid(staffId)) {
      throw new Error('Invalid staff ID');
    }

    if (!Types.ObjectId.isValid(hospitalId)) {
      throw new Error('Invalid hospital ID');
    }

    /**
     * Never allow tenant ownership or generated staff ID
     * to be changed through this method.
     */
    const safeUpdate: Record<string, any> = {
      ...dto,
    };

    delete safeUpdate.hospitalId;
    delete safeUpdate.staffId;

    const staff = await Staff.findOneAndUpdate(
      {
        _id: staffId,
        hospitalId,
      },
      {
        $set: safeUpdate,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!staff) {
      throw new Error('Staff member not found');
    }

    return staff;
  }

  /**
   * Toggle active status.
   */
  public static async toggleStaffStatus(
    staffId: string,
    hospitalId: string
  ) {
    if (!Types.ObjectId.isValid(staffId)) {
      throw new Error('Invalid staff ID');
    }

    if (!Types.ObjectId.isValid(hospitalId)) {
      throw new Error('Invalid hospital ID');
    }

    const staff = await Staff.findOne({
      _id: staffId,
      hospitalId,
    });

    if (!staff) {
      throw new Error('Staff member not found');
    }

    staff.isActive = !staff.isActive;

    staff.status = staff.isActive
      ? StaffStatus.ACTIVE
      : StaffStatus.INACTIVE;

    await staff.save();

    return staff;
  }

  /**
   * Get staff dashboard statistics.
   */
  public static async getStaffDashboard(hospitalId: string) {
    if (!Types.ObjectId.isValid(hospitalId)) {
      throw new Error('Invalid hospital ID');
    }

    const [
      total,
      active,
      inactive,
      doctors,
      nurses,
      alliedHealth,
      consultants,
      residents,
      interns,
    ] = await Promise.all([
      Staff.countDocuments({
        hospitalId,
      }),

      Staff.countDocuments({
        hospitalId,
        isActive: true,
      }),

      Staff.countDocuments({
        hospitalId,
        isActive: false,
      }),

      Staff.countDocuments({
        hospitalId,
        role: StaffRole.DOCTOR,
        isActive: true,
      }),

      Staff.countDocuments({
        hospitalId,
        role: StaffRole.NURSE,
        isActive: true,
      }),

      Staff.countDocuments({
        hospitalId,
        category: StaffCategory.ALLIED_HEALTH,
        isActive: true,
      }),

      Staff.countDocuments({
        hospitalId,
        classification: StaffClassification.CONSULTANT,
        isActive: true,
      }),

      Staff.countDocuments({
        hospitalId,
        classification: StaffClassification.RESIDENT,
        isActive: true,
      }),

      Staff.countDocuments({
        hospitalId,
        classification: StaffClassification.INTERN,
        isActive: true,
      }),
    ]);

    return {
      total,
      active,
      inactive,
      doctors,
      nurses,
      alliedHealth,
      consultants,
      residents,
      interns,
    };
  }

  /**
   * Get credentials that are expired or expiring soon.
   *
   * Default: next 30 days.
   */
  public static async getExpiringCredentials(
    hospitalId: string,
    days = 30
  ) {
    if (!Types.ObjectId.isValid(hospitalId)) {
      throw new Error('Invalid hospital ID');
    }

    if (days < 0) {
      throw new Error('Days must be zero or greater');
    }

    const now = new Date();

    const expiryDate = new Date(now);

    expiryDate.setDate(
      expiryDate.getDate() + days
    );

    return Staff.find({
      hospitalId,
      isActive: true,

      $or: [
        {
          'professionalRegistrations.expiryDate': {
            $gte: now,
            $lte: expiryDate,
          },
        },
        {
          'certifications.expiryDate': {
            $gte: now,
            $lte: expiryDate,
          },
        },
        {
          'clinicalPrivileges.expiryDate': {
            $gte: now,
            $lte: expiryDate,
          },
        },
              {
        'trainingRecords.expiryDate': {
          $gte: now,
          $lte: expiryDate,
        },
      },
    ],
  })
      .sort({
        'professionalRegistrations.expiryDate': 1,
        'certifications.expiryDate': 1,
        'clinicalPrivileges.expiryDate': 1,
        'trainingRecords.expiryDate': 1,
      })
      .lean();
  }
}