import { Request, Response, NextFunction } from 'express';
import { dietaryService } from './dietary.service.js';
import {
  DietType,
  MealType,
  MealDeliveryStatus,
} from './dietary.types.js';

export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    hospitalId: string;
    [key: string]: unknown;
  };
}

export class DietaryController {
  public async createDietaryOrder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const orderedById = authReq.user._id;

      const { patientId, dietType, allergies, restrictions, specialInstructions, startDate, endDate } =
        req.body;

      const order = await dietaryService.createDietaryOrder({
        hospitalId,
        patientId,
        orderedById,
        dietType: dietType as DietType,
        allergies,
        restrictions,
        specialInstructions,
        startDate,
        endDate,
      });

      res.status(201).json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  }

  public async getDietaryOrders(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const patientId = req.query.patientId as string | undefined;
      const dietType = req.query.dietType as DietType | undefined;
      const isActive =
        req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;

      const result = await dietaryService.getDietaryOrders(hospitalId, {
        page,
        limit,
        patientId,
        dietType,
        isActive,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public async getDietaryOrderById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;

      const order = await dietaryService.getDietaryOrderById(id, hospitalId);

      if (!order) {
        res.status(404).json({ success: false, message: 'Dietary order not found' });
        return;
      }

      res.status(200).json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  }

  public async updateDietaryOrder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;

      const { dietType, allergies, restrictions, specialInstructions, endDate, isActive } = req.body;

      const updated = await dietaryService.updateDietaryOrder(id, hospitalId, {
        dietType: dietType as DietType,
        allergies,
        restrictions,
        specialInstructions,
        endDate,
        isActive,
      });

      if (!updated) {
        res.status(404).json({ success: false, message: 'Dietary order not found' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  public async createMealDelivery(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const { dietaryOrderId, patientId, mealType, scheduledDate, deliveryNotes } = req.body;

      const delivery = await dietaryService.createMealDelivery({
        hospitalId,
        dietaryOrderId,
        patientId,
        mealType: mealType as MealType,
        scheduledDate,
        deliveryNotes,
      });

      res.status(201).json({ success: true, data: delivery });
    } catch (error) {
      next(error);
    }
  }

  public async getMealDeliveries(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const patientId = req.query.patientId as string | undefined;
      const dietaryOrderId = req.query.dietaryOrderId as string | undefined;
      const mealType = req.query.mealType as MealType | undefined;
      const status = req.query.status as MealDeliveryStatus | undefined;
      const scheduledDate = req.query.scheduledDate as string | undefined;

      const result = await dietaryService.getMealDeliveries(hospitalId, {
        page,
        limit,
        patientId,
        dietaryOrderId,
        mealType,
        status,
        scheduledDate,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public async updateMealDeliveryStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const userId = authReq.user._id;
      const id = req.params.id as string;

      const { status, deliveryNotes } = req.body;

      const updated = await dietaryService.updateMealDeliveryStatus(id, hospitalId, {
        status: status as MealDeliveryStatus,
        deliveredById: userId,
        deliveryNotes,
      });

      if (!updated) {
        res.status(404).json({ success: false, message: 'Meal delivery record not found' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
}

export const dietaryController = new DietaryController();