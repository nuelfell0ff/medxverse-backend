import { StaffService } from './staff.service.js';
export class StaffController {
    /**
     * POST /
     */
    static async createStaff(req, res) {
        try {
            const hospitalId = req.account?.accountId;
            if (!hospitalId) {
                res.status(401).json({
                    success: false,
                    message: 'Unauthorized',
                });
                return;
            }
            const staff = await StaffService.createStaff(hospitalId, req.body);
            res.status(201).json({
                success: true,
                message: 'Healthcare worker created successfully',
                data: staff,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message ||
                    'Failed to create healthcare worker',
            });
        }
    }
    /**
     * GET /
     */
    static async getStaff(req, res) {
        try {
            const hospitalId = req.account?.accountId;
            if (!hospitalId) {
                res.status(401).json({
                    success: false,
                    message: 'Unauthorized',
                });
                return;
            }
            const { role, category, classification, departmentId, unitId, status, search, isActive, } = req.query;
            const filters = {
                role: role
                    ? String(role)
                    : undefined,
                category: category
                    ? String(category)
                    : undefined,
                classification: classification
                    ? String(classification)
                    : undefined,
                departmentId: departmentId
                    ? String(departmentId)
                    : undefined,
                unitId: unitId
                    ? String(unitId)
                    : undefined,
                status: status
                    ? String(status)
                    : undefined,
                search: search
                    ? String(search)
                    : undefined,
                isActive: isActive !== undefined
                    ? String(isActive) === 'true'
                    : undefined,
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
                message: error.message ||
                    'Failed to fetch staff list',
            });
        }
    }
    /**
     * GET /dashboard
     */
    static async getDashboard(req, res) {
        try {
            const hospitalId = req.account?.accountId;
            if (!hospitalId) {
                res.status(401).json({
                    success: false,
                    message: 'Unauthorized',
                });
                return;
            }
            const dashboard = await StaffService.getStaffDashboard(hospitalId);
            res.status(200).json({
                success: true,
                data: dashboard,
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: error.message ||
                    'Failed to fetch staff dashboard',
            });
        }
    }
    /**
     * GET /credentials/expiring
     */
    static async getExpiringCredentials(req, res) {
        try {
            const hospitalId = req.account?.accountId;
            if (!hospitalId) {
                res.status(401).json({
                    success: false,
                    message: 'Unauthorized',
                });
                return;
            }
            const days = req.query.days
                ? Number(req.query.days)
                : 30;
            const credentials = await StaffService.getExpiringCredentials(hospitalId, Number.isFinite(days) ? days : 30);
            res.status(200).json({
                success: true,
                count: credentials.length,
                data: credentials,
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: error.message ||
                    'Failed to fetch expiring credentials',
            });
        }
    }
    /**
     * GET /:id
     */
    static async getStaffById(req, res) {
        try {
            const hospitalId = req.account?.accountId;
            if (!hospitalId) {
                res.status(401).json({
                    success: false,
                    message: 'Unauthorized',
                });
                return;
            }
            const id = String(req.params.id);
            const staff = await StaffService.getStaffById(id, hospitalId);
            res.status(200).json({
                success: true,
                data: staff,
            });
        }
        catch (error) {
            res.status(404).json({
                success: false,
                message: error.message ||
                    'Staff member not found',
            });
        }
    }
    /**
     * PATCH /:id
     */
    static async updateStaff(req, res) {
        try {
            const hospitalId = req.account?.accountId;
            if (!hospitalId) {
                res.status(401).json({
                    success: false,
                    message: 'Unauthorized',
                });
                return;
            }
            const id = String(req.params.id);
            const staff = await StaffService.updateStaff(id, hospitalId, req.body);
            res.status(200).json({
                success: true,
                message: 'Healthcare worker updated successfully',
                data: staff,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message ||
                    'Failed to update healthcare worker',
            });
        }
    }
    /**
     * PATCH /:id/toggle-status
     */
    static async toggleStaffStatus(req, res) {
        try {
            const hospitalId = req.account?.accountId;
            if (!hospitalId) {
                res.status(401).json({
                    success: false,
                    message: 'Unauthorized',
                });
                return;
            }
            const id = String(req.params.id);
            const staff = await StaffService.toggleStaffStatus(id, hospitalId);
            res.status(200).json({
                success: true,
                message: `Staff status updated to ${staff.isActive
                    ? 'Active'
                    : 'Inactive'}`,
                data: staff,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message ||
                    'Failed to update staff status',
            });
        }
    }
}
