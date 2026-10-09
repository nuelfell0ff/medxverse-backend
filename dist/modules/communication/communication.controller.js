import { CommunicationService } from './communication.service.js';
import { MessageType } from './communication.types.js';
function requireStaff(req) {
    const hospitalId = req.user?.hospitalId || req.account?.accountId;
    const userId = req.user?._id;
    if (!hospitalId || !userId || req.user?.userType !== 'STAFF') {
        throw new Error('An authenticated staff account is required');
    }
    return { hospitalId, userId };
}
export class CommunicationController {
    static async inbox(req, res) {
        try {
            const { hospitalId, userId } = requireStaff(req);
            const data = await CommunicationService.listInbox(hospitalId, userId, Number(req.query.page) || 1, Number(req.query.limit) || 30);
            res.json({ success: true, data });
        }
        catch (error) {
            res.status(error.message.includes('required') ? 401 : 400).json({ success: false, message: error.message });
        }
    }
    static async setPresence(req, res) {
        try {
            const { hospitalId, userId } = requireStaff(req);
            const data = await CommunicationService.setPresence(hospitalId, userId, String(req.body.status));
            res.json({ success: true, data });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async myPatients(req, res) {
        try {
            const { hospitalId, userId } = requireStaff(req);
            const data = await CommunicationService.myPatients(hospitalId, userId, typeof req.query.q === 'string' ? req.query.q : undefined);
            res.json({ success: true, data });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async searchMessages(req, res) {
        try {
            const { hospitalId, userId } = requireStaff(req);
            const data = await CommunicationService.searchMessages(hospitalId, userId, String(req.query.q || ''), Number(req.query.limit) || 50);
            res.json({ success: true, data });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async searchStaff(req, res) {
        try {
            const { hospitalId, userId } = requireStaff(req);
            const data = await CommunicationService.searchStaff(hospitalId, userId, String(req.query.q || ''), Number(req.query.limit) || 30);
            res.json({ success: true, data });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async createDirect(req, res) {
        try {
            const { hospitalId, userId } = requireStaff(req);
            const data = await CommunicationService.createDirectConversation(hospitalId, userId, String(req.body.targetUserId));
            res.status(201).json({ success: true, data });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async createGroup(req, res) {
        try {
            const { hospitalId, userId } = requireStaff(req);
            const data = await CommunicationService.createGroupConversation(hospitalId, userId, String(req.body.title || ''), Array.isArray(req.body.memberIds) ? req.body.memberIds : []);
            res.status(201).json({ success: true, data });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async getConversation(req, res) {
        try {
            const { hospitalId, userId } = requireStaff(req);
            const data = await CommunicationService.getConversation(hospitalId, userId, String(req.params.id));
            res.json({ success: true, data });
        }
        catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }
    static async messages(req, res) {
        try {
            const { hospitalId, userId } = requireStaff(req);
            const data = await CommunicationService.listMessages(hospitalId, userId, String(req.params.id), Number(req.query.page) || 1, Number(req.query.limit) || 50);
            res.json({ success: true, data });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async sendMessage(req, res) {
        try {
            const { hospitalId, userId } = requireStaff(req);
            const data = await CommunicationService.sendMessage(hospitalId, userId, String(req.params.id), typeof req.body.body === 'string' ? req.body.body : '', req.body.type || MessageType.TEXT, Array.isArray(req.body.attachments) ? req.body.attachments : []);
            res.status(201).json({ success: true, data });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async markRead(req, res) {
        try {
            const { hospitalId, userId } = requireStaff(req);
            const data = await CommunicationService.markConversationRead(hospitalId, userId, String(req.params.id));
            res.json({ success: true, data });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async createPatientCare(req, res) {
        try {
            const { hospitalId, userId } = requireStaff(req);
            const data = await CommunicationService.createPatientCareConversation(hospitalId, userId, String(req.body.patientId), Array.isArray(req.body.memberIds) ? req.body.memberIds : [], req.body.title);
            res.status(201).json({ success: true, data });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async listDepartments(req, res) {
        try {
            const { hospitalId, userId } = requireStaff(req);
            const data = await CommunicationService.listDepartments(hospitalId, userId);
            res.json({ success: true, data });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async createDepartment(req, res) {
        try {
            const { hospitalId, userId } = requireStaff(req);
            const data = await CommunicationService.createDepartment(hospitalId, userId, String(req.body.name || ''), String(req.body.code || ''), req.body.description);
            res.status(201).json({ success: true, data });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async createDepartmentConversation(req, res) {
        try {
            const { hospitalId, userId } = requireStaff(req);
            const data = await CommunicationService.createDepartmentConversation(hospitalId, userId, String(req.body.departmentId), req.body.title);
            res.status(201).json({ success: true, data });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async joinDepartment(req, res) {
        try {
            const { hospitalId, userId } = requireStaff(req);
            const data = await CommunicationService.joinDepartmentConversation(hospitalId, userId, String(req.params.id));
            res.json({ success: true, data });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async createTicket(req, res) {
        try {
            const { hospitalId, userId } = requireStaff(req);
            const data = await CommunicationService.createTicket(hospitalId, userId, req.body);
            res.status(201).json({ success: true, data });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async updateTicket(req, res) {
        try {
            const { hospitalId, userId } = requireStaff(req);
            const data = await CommunicationService.updateTicket(hospitalId, userId, String(req.params.id), req.body);
            res.json({ success: true, data });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async listTickets(req, res) {
        try {
            const { hospitalId, userId } = requireStaff(req);
            const data = await CommunicationService.listTickets(hospitalId, userId, req.query);
            res.json({ success: true, data });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}
