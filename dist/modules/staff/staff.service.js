import { Staff } from './staff.model.js';
export class StaffService {
    /**
     * Create a new staff member for a hospital
     */
    static async createStaff(hospitalId, dto) {
        const staff = await Staff.create({
            ...dto,
            hospitalId,
        });
        return staff;
    }
    /**
     * Fetch hospital staff with optional filters (role, search term, active status)
     */
    static async getHospitalStaff(hospitalId, filters) {
        const query = { hospitalId };
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
    static async getStaffById(staffId, hospitalId) {
        const staff = await Staff.findOne({ _id: staffId, hospitalId }).lean();
        if (!staff) {
            throw new Error('Staff member not found');
        }
        return staff;
    }
    /**
     * Update staff member details
     */
    static async updateStaff(staffId, hospitalId, dto) {
        const staff = await Staff.findOneAndUpdate({ _id: staffId, hospitalId }, { $set: dto }, { new: true, runValidators: true });
        if (!staff) {
            throw new Error('Staff member not found');
        }
        return staff;
    }
    /**
     * Toggle active/inactive status for a staff member
     */
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
