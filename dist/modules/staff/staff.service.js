import { Staff } from './staff.model.js';
export class StaffService {
    static async createStaff(hospitalId, dto) {
        const staff = await Staff.create({
            ...dto,
            hospitalId,
        });
        return staff;
    }
    static async getHospitalStaff(hospitalId, filters) {
        const query = { hospitalId };
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
    static async getStaffById(staffId, hospitalId) {
        const staff = await Staff.findOne({ _id: staffId, hospitalId });
        if (!staff) {
            throw new Error('Staff member not found');
        }
        return staff;
    }
    static async updateStaff(staffId, hospitalId, dto) {
        const staff = await Staff.findOneAndUpdate({ _id: staffId, hospitalId }, { $set: dto }, { new: true, runValidators: true });
        if (!staff) {
            throw new Error('Staff member not found');
        }
        return staff;
    }
    static async toggleStaffStatus(staffId, hospitalId) {
        const staff = await Staff.findOne({ _id: staffId, hospitalId });
        if (!staff) {
            throw new Error('Staff member not found');
        }
        staff.isActive = !staff.isActive;
        await staff.save();
        return staff;
    }
}
