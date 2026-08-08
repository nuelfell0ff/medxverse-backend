import { StaffService } from './staff.service.js';
export class StaffController {
    static async createStaff(req, res) {
        try {
            const hospitalId = req.account?.accountId;
            if (!hospitalId) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const staff = await StaffService.createStaff(hospitalId, req.body);
            res.status(201).json({
                success: true,
                message: 'Staff member created successfully',
                data: staff,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to create staff member',
            });
        }
    }
    static async getStaff(req, res) {
        try {
            const hospitalId = req.account?.accountId;
            if (!hospitalId) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const { role, search, isActive } = req.query;
            const filters = {
                role: role ? role : undefined,
                search: search ? String(search) : undefined,
                isActive: isActive !== undefined ? isActive === 'true' : undefined,
            };
            const staff = await StaffService.getHospitalStaff(hospitalId, filters);
            res.status(200).json({
                success: true,
                count: staff.length,
                data: staff,
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to fetch staff list',
            });
        }
    }
    static async getStaffById(req, res) {
        try {
            const hospitalId = req.account?.accountId;
            if (!hospitalId) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const id = req.params.id;
            const staff = await StaffService.getStaffById(id, hospitalId);
            res.status(200).json({
                success: true,
                data: staff,
            });
        }
        catch (error) {
            res.status(404).json({
                success: false,
                message: error.message || 'Staff member not found',
            });
        }
    }
    static async updateStaff(req, res) {
        try {
            const hospitalId = req.account?.accountId;
            if (!hospitalId) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const id = req.params.id;
            const staff = await StaffService.updateStaff(id, hospitalId, req.body);
            res.status(200).json({
                success: true,
                message: 'Staff member updated successfully',
                data: staff,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to update staff member',
            });
        }
    }
    static async toggleStaffStatus(req, res) {
        try {
            const hospitalId = req.account?.accountId;
            if (!hospitalId) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const id = req.params.id;
            const staff = await StaffService.toggleStaffStatus(id, hospitalId);
            res.status(200).json({
                success: true,
                message: `Staff status updated to ${staff.isActive ? 'Active' : 'Inactive'}`,
                data: staff,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to update status',
            });
        }
    }
}
