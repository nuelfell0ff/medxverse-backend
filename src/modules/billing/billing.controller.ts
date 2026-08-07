import { Request, Response, NextFunction } from 'express';
import { billingService } from './billing.service.js';
import { InvoiceStatus, LineItemCategory, PaymentMethod } from './billing.types.js';

export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    hospitalId: string;
    [key: string]: unknown;
  };
}

export class BillingController {
  public async createInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const createdById = authReq.user._id;

      const { patientId, items, discount, tax, dueDate, notes } = req.body;

      const invoice = await billingService.createInvoice({
        hospitalId,
        patientId,
        items: items as {
          description: string;
          category: LineItemCategory;
          quantity: number;
          unitPrice: number;
          referenceId?: string;
        }[],
        discount,
        tax,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        createdById,
        notes,
      });

      res.status(201).json({ success: true, data: invoice });
    } catch (error) {
      next(error);
    }
  }

  public async getInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const status = req.query.status as InvoiceStatus | undefined;
      const patientId = req.query.patientId as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const result = await billingService.getInvoices(hospitalId, {
        page,
        limit,
        status,
        patientId,
        startDate,
        endDate,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public async getInvoiceById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;

      const invoice = await billingService.getInvoiceById(id, hospitalId);

      if (!invoice) {
        res.status(404).json({ success: false, message: 'Invoice not found' });
        return;
      }

      res.status(200).json({ success: true, data: invoice });
    } catch (error) {
      next(error);
    }
  }

  public async recordPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const receivedBy = authReq.user._id;
      const id = req.params.id as string;

      const { amount, paymentMethod, paymentReference, notes } = req.body;

      const updated = await billingService.recordPayment(id, hospitalId, {
        amount,
        paymentMethod: paymentMethod as PaymentMethod,
        paymentReference,
        receivedBy,
        notes,
      });

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  public async cancelInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;

      const { reason } = req.body;

      const updated = await billingService.cancelInvoice(id, hospitalId, reason);

      if (!updated) {
        res.status(404).json({ success: false, message: 'Invoice not found or cannot be cancelled' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
}

export const billingController = new BillingController();