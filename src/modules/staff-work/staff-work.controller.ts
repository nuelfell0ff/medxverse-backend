import { Request, Response, NextFunction } from 'express';
import { StaffWorkService } from './staff-work.service.js';

interface WorkAuthRequest extends Request {
  user?: {
    _id?: string;
    hospitalId?: string;
    accountId?: string;
    userType?: string;
    [key: string]: unknown;
  };
}

const getAuth = (req: Request) => {
  const user = (req as WorkAuthRequest).user;
  const userId = user?._id;
  const hospitalId = user?.hospitalId || user?.accountId;
  if (!userId || !hospitalId) throw new Error('Authenticated hospital context is missing');
  return { userId: String(userId), hospitalId: String(hospitalId), userType: user?.userType };
};

const staffContext = async (req: Request) => {
  const auth = getAuth(req);
  return StaffWorkService.resolveStaffContext(auth.userId, auth.hospitalId);
};

export class StaffWorkController {
  static async listTasks(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = await staffContext(req);
      res.json({ success: true, data: await StaffWorkService.listTasks(ctx.hospitalId, ctx.staffId, req.query) });
    } catch (error) { next(error); }
  }

  static async getTask(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = await staffContext(req);
      const task = await StaffWorkService.getTaskById(ctx.hospitalId, ctx.staffId, req.params.id);
      if (!task) { res.status(404).json({ success: false, message: 'Task not found' }); return; }
      res.json({ success: true, data: task });
    } catch (error) { next(error); }
  }

  static async createTask(req: Request, res: Response, next: NextFunction) {
    try {
      const auth = getAuth(req);
      const actor = await StaffWorkService.resolveActor(auth.userId, auth.hospitalId, auth.userType);
      res.status(201).json({ success: true, data: await StaffWorkService.createTask(actor, req.body) });
    } catch (error) { next(error); }
  }

  static async updateTask(req: Request, res: Response, next: NextFunction) {
    try {
      const auth = getAuth(req);
      const actor = await StaffWorkService.resolveActor(auth.userId, auth.hospitalId, auth.userType);
      res.json({ success: true, data: await StaffWorkService.updateTask(actor, req.params.id, req.body) });
    } catch (error) { next(error); }
  }

  static async listTickets(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = await staffContext(req);
      res.json({ success: true, data: await StaffWorkService.listTickets(ctx.hospitalId, ctx.staffId, req.query) });
    } catch (error) { next(error); }
  }

  static async getTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = await staffContext(req);
      const ticket = await StaffWorkService.getTicketById(ctx.hospitalId, ctx.staffId, req.params.id);
      if (!ticket) { res.status(404).json({ success: false, message: 'Ticket not found' }); return; }
      res.json({ success: true, data: ticket });
    } catch (error) { next(error); }
  }

  static async createTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const auth = getAuth(req);
      const actor = await StaffWorkService.resolveActor(auth.userId, auth.hospitalId, auth.userType);
      res.status(201).json({ success: true, data: await StaffWorkService.createTicket(actor, req.body) });
    } catch (error) { next(error); }
  }

  static async updateTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const auth = getAuth(req);
      const actor = await StaffWorkService.resolveActor(auth.userId, auth.hospitalId, auth.userType);
      res.json({ success: true, data: await StaffWorkService.updateTicket(actor, req.params.id, req.body) });
    } catch (error) { next(error); }
  }

  static async addTicketComment(req: Request, res: Response, next: NextFunction) {
    try {
      const auth = getAuth(req);
      const actor = await StaffWorkService.resolveActor(auth.userId, auth.hospitalId, auth.userType);
      res.json({ success: true, data: await StaffWorkService.addTicketComment(actor, req.params.id, String(req.body?.body || '')) });
    } catch (error) { next(error); }
  }

  static async activity(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = await staffContext(req);
      res.json({ success: true, data: await StaffWorkService.getWorkActivity(ctx.hospitalId, ctx.staffId, req.query as any) });
    } catch (error) { next(error); }
  }
}
