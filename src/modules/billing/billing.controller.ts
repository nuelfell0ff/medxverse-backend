import { Request, Response, NextFunction } from 'express';
import { BillingService } from './billing.service.js';
import { IInvoiceQueryFilters } from './billing.types.js';

export class BillingController {
  static async createInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospitalId = (req as any).user.hospitalId as string;
      const userId = (req as any).user._id as string;

      const invoice = await BillingService.createInvoice(hospitalId, userId, req.body);

      res.status(201).json({
        success: true,
        message: 'Invoice created successfully',
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospitalId = (req as any).user.hospitalId as string;
      const filters = req.query as unknown as IInvoiceQueryFilters;

      const result = await BillingService.getInvoices(hospitalId, filters);

      res.status(200).json({
        success: true,
        data: result.invoices,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getInvoiceById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospitalId = (req as any).user.hospitalId as string;
      const id = req.params.id as string;

      const invoice = await BillingService.getInvoiceById(hospitalId, id);

      res.status(200).json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  }

  static async recordPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospitalId = (req as any).user.hospitalId as string;
      const userId = (req as any).user._id as string;
      const id = req.params.id as string;

      const updatedInvoice = await BillingService.recordPayment(hospitalId, id, userId, req.body);

      res.status(200).json({
        success: true,
        message: 'Payment recorded successfully',
        data: updatedInvoice,
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancelInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospitalId = (req as any).user.hospitalId as string;
      const id = req.params.id as string;
      const { reason } = req.body;

      const cancelledInvoice = await BillingService.cancelInvoice(hospitalId, id, reason);

      res.status(200).json({
        success: true,
        message: 'Invoice cancelled successfully',
        data: cancelledInvoice,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRevenueSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospitalId = (req as any).user.hospitalId as string;
      const summary = await BillingService.getRevenueSummary(hospitalId);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }
}