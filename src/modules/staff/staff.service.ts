import { Staff } from './staff.model.js';
import { CreateStaffDTO, UpdateStaffDTO, StaffRole } from './staff.types.js';

export class StaffService {
  public static async createStaff(hospitalId: string, dto: CreateStaffDTO) {
    const staff = await Staff.create({
      ...dto,
      hospitalId,
    });
    return staff;
  }

  public static async getHospitalStaff(
    hospitalId: string,
    filters: { role?: StaffRole; search?: string; isActive?: boolean }
  ) {
    const query: any = { hospitalId };

    if (filters.role) {
      query.role = filters.role;
    }

    if (typeof filters.isActive === 'boolean') {
      query.isActive = filters.isActive;
    }

    if (filters.search) {
      query.$or = [
        { firstName: { $regex: filters.search, $options: 'i' } },
        { lastName: { $regex: filters.search, $options: 'i' } },
        { department: { $regex: filters.search, $options: 'i' } },
        { licenseNumber: { $regex: filters.search, $options: 'i' } },
      ];
    }

    return Staff.find(query).sort({ lastName: 1, firstName: 1 });
  }

  public static async getStaffById(staffId: string, hospitalId: string) {
    const staff = await Staff.findOne({ _id: staffId, hospitalId });
    if (!staff) {
      throw new Error('Staff member not found');
    }
    return staff;
  }

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