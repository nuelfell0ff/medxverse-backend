import { Request, Response, NextFunction } from 'express';
import { BillingService } from './billing.service.js';

export class BillingController {
  public static async createInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = (req as any).user.hospitalId;
      const invoice = await BillingService.createInvoice(hospitalId, req.body);
      res.status(201).json({ success: true, data: invoice });
    } catch (error) {
      next(error);
    }
  }

  public static async getInvoices(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = (req as any).user.hospitalId;
      const filters = {
        status: req.query.status as string,
        patientId: req.query.patientId as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      };
      const result = await BillingService.getInvoices(hospitalId, filters);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  public static async getInvoiceById(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = (req as any).user.hospitalId;
      const invoice = await BillingService.getInvoiceById(req.params.id as string, hospitalId);
      res.status(200).json({ success: true, data: invoice });
    } catch (error) {
      next(error);
    }
  }

  public static async processPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = (req as any).user.hospitalId;
      const processedBy = (req as any).user.id;
      const result = await BillingService.processPayment(
        req.params.id as string,
        hospitalId,
        processedBy,
        req.body
      );
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}