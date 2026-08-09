import { Staff } from './staff.model.js';
import { CreateStaffDTO, UpdateStaffDTO, StaffRole } from './staff.types.js';

export class StaffService {
  /**
   * Create a new staff member for a hospital
   */
  public static async createStaff(hospitalId: string, dto: CreateStaffDTO) {
    const staff = await Staff.create({
      ...dto,
      hospitalId,
    });
    return staff;
  }

  /**
   * Fetch hospital staff with optional filters (role, search term, active status)
   */
  public static async getHospitalStaff(
    hospitalId: string,
    filters: { role?: StaffRole; search?: string; isActive?: boolean }
  ) {
    const query: any = { hospitalId };

    // Filter by role if provided
    if (filters.role) {
      query.role = filters.role;
    }

    // Only filter by active status if explicitly passed (true or false)
    if (typeof filters.isActive === 'boolean') {
      query.isActive = filters.isActive;
    }

    // Search across name, department, and license number
    if (filters.search && filters.search.trim() !== '') {
      const searchTerm = filters.search.trim();
      query.$or = [
        { firstName: { $regex: searchTerm, $options: 'i' } },
        { lastName: { $regex: searchTerm, $options: 'i' } },
        { department: { $regex: searchTerm, $options: 'i' } },
        { licenseNumber: { $regex: searchTerm, $options: 'i' } },
      ];
    }

    return Staff.find(query).sort({ lastName: 1, firstName: 1 }).lean();
  }

  /**
   * Fetch a single staff member by ID
   */
  public static async getStaffById(staffId: string, hospitalId: string) {
    const staff = await Staff.findOne({ _id: staffId, hospitalId }).lean();
    if (!staff) {
      throw new Error('Staff member not found');
    }
    return staff;
  }

  /**
   * Update staff member details
   */
  public static async updateStaff(
    staffId: string,
    hospitalId: string,
    dto: UpdateStaffDTO
  ) {
    const staff = await Staff.findOneAndUpdate(
      { _id: staffId, hospitalId },
      { $set: dto },
      { new: true, runValidators: true }
    );

    if (!staff) {
      throw new Error('Staff member not found');
    }

    return staff;
  }

  /**
   * Toggle active/inactive status for a staff member
   */
  public static async toggleStaffStatus(staffId: string, hospitalId: string) {
    const staff = await Staff.findOne({ _id: staffId, hospitalId });
    if (!staff) {
      throw new Error('Staff member not found');
    }

    staff.isActive = !staff.isActive;
    await staff.save();
    return staff;
  }
}
