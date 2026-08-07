import { Request, Response, NextFunction } from 'express';
import { bloodBankService } from './blood-bank.service.js';
import {
  BloodGroup,
  BloodComponentType,
  BloodUnitStatus,
  TransfusionRequestStatus,
  TransfusionUrgency,
  CrossmatchResult,
} from './blood-bank.types.js';

export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    hospitalId: string;
    [key: string]: unknown;
  };
}

export class BloodBankController {
  public async addBloodUnit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const {
        donorId,
        donorCode,
        unitNumber,
        bloodGroup,
        componentType,
        volumeMl,
        collectionDate,
        expiryDate,
        storageLocation,
        notes,
      } = req.body;

      const bloodUnit = await bloodBankService.addBloodUnit({
        hospitalId,
        donorId,
        donorCode,
        unitNumber,
        bloodGroup: bloodGroup as BloodGroup,
        componentType: componentType as BloodComponentType,
        volumeMl,
        collectionDate,
        expiryDate,
        storageLocation,
        notes,
      });

      res.status(201).json({ success: true, data: bloodUnit });
    } catch (error) {
      next(error);
    }
  }

  public async getBloodUnits(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const bloodGroup = req.query.bloodGroup as BloodGroup | undefined;
      const componentType = req.query.componentType as BloodComponentType | undefined;
      const status = req.query.status as BloodUnitStatus | undefined;
      const unitNumber = req.query.unitNumber as string | undefined;

      const result = await bloodBankService.getBloodUnits(hospitalId, {
        page,
        limit,
        bloodGroup,
        componentType,
        status,
        unitNumber,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public async createTransfusionRequest(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const requestedById = authReq.user._id;

      const { patientId, bloodGroup, componentType, unitsRequested, urgency, clinicalIndication, notes } =
        req.body;

      const request = await bloodBankService.createTransfusionRequest({
        hospitalId,
        patientId,
        requestedById,
        bloodGroup: bloodGroup as BloodGroup,
        componentType: componentType as BloodComponentType,
        unitsRequested,
        urgency: urgency as TransfusionUrgency,
        clinicalIndication,
        notes,
      });

      res.status(201).json({ success: true, data: request });
    } catch (error) {
      next(error);
    }
  }

  public async getTransfusionRequests(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const status = req.query.status as TransfusionRequestStatus | undefined;
      const urgency = req.query.urgency as TransfusionUrgency | undefined;
      const patientId = req.query.patientId as string | undefined;
      const bloodGroup = req.query.bloodGroup as BloodGroup | undefined;

      const result = await bloodBankService.getTransfusionRequests(hospitalId, {
        page,
        limit,
        status,
        urgency,
        patientId,
        bloodGroup,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public async getTransfusionRequestById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;

      const request = await bloodBankService.getTransfusionRequestById(id, hospitalId);

      if (!request) {
        res.status(404).json({ success: false, message: 'Transfusion request not found' });
        return;
      }

      res.status(200).json({ success: true, data: request });
    } catch (error) {
      next(error);
    }
  }

  public async updateCrossmatch(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;

      const { crossmatchResult, assignedUnitIds, notes } = req.body;

      const updated = await bloodBankService.updateCrossmatch(id, hospitalId, {
        crossmatchResult: crossmatchResult as CrossmatchResult,
        assignedUnitIds,
        notes,
      });

      if (!updated) {
        res.status(404).json({ success: false, message: 'Transfusion request not found' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  public async updateRequestStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;

      const { status, notes } = req.body;

      const updated = await bloodBankService.updateRequestStatus(id, hospitalId, {
        status: status as TransfusionRequestStatus,
        notes,
      });

      if (!updated) {
        res.status(404).json({ success: false, message: 'Transfusion request not found' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
}

export const bloodBankController = new BloodBankController();