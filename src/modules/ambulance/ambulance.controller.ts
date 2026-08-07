import { Request, Response, NextFunction } from 'express';
import { ambulanceService } from './ambulance.service.js';
import {
  VehicleType,
  VehicleStatus,
  TripPriority,
  TripStatus,
} from './ambulance.types.js';

export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    hospitalId: string;
    [key: string]: unknown;
  };
}

export class AmbulanceController {
  public async addAmbulance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const {
        registrationNumber,
        vehicleModel,
        vehicleType,
        primaryDriverId,
        fuelLevelPercentage,
        lastMaintenanceDate,
        nextMaintenanceDueDate,
        equipmentList,
        notes,
      } = req.body;

      const ambulance = await ambulanceService.addAmbulance({
        hospitalId,
        registrationNumber,
        vehicleModel,
        vehicleType: vehicleType as VehicleType,
        primaryDriverId,
        fuelLevelPercentage,
        lastMaintenanceDate,
        nextMaintenanceDueDate,
        equipmentList,
        notes,
      });

      res.status(201).json({ success: true, data: ambulance });
    } catch (error) {
      next(error);
    }
  }

  public async getAmbulances(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const vehicleType = req.query.vehicleType as VehicleType | undefined;
      const status = req.query.status as VehicleStatus | undefined;
      const registrationNumber = req.query.registrationNumber as string | undefined;

      const result = await ambulanceService.getAmbulances(hospitalId, {
        page,
        limit,
        vehicleType,
        status,
        registrationNumber,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public async updateAmbulanceStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;

      const { status, fuelLevelPercentage, currentLocation, notes } = req.body;

      const updated = await ambulanceService.updateAmbulanceStatus(id, hospitalId, {
        status: status as VehicleStatus,
        fuelLevelPercentage,
        currentLocation,
        notes,
      });

      if (!updated) {
        res.status(404).json({ success: false, message: 'Ambulance not found' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  public async createTripRequest(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const requestedById = authReq.user._id;

      const { patientId, priority, pickupLocation, dropoffLocation, clinicalNotes } = req.body;

      const trip = await ambulanceService.createTripRequest({
        hospitalId,
        patientId,
        requestedById,
        priority: priority as TripPriority,
        pickupLocation,
        dropoffLocation,
        clinicalNotes,
      });

      res.status(201).json({ success: true, data: trip });
    } catch (error) {
      next(error);
    }
  }

  public async getTripRequests(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const status = req.query.status as TripStatus | undefined;
      const priority = req.query.priority as TripPriority | undefined;
      const patientId = req.query.patientId as string | undefined;
      const ambulanceId = req.query.ambulanceId as string | undefined;

      const result = await ambulanceService.getTripRequests(hospitalId, {
        page,
        limit,
        status,
        priority,
        patientId,
        ambulanceId,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public async getTripRequestById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;

      const trip = await ambulanceService.getTripRequestById(id, hospitalId);

      if (!trip) {
        res.status(404).json({ success: false, message: 'Trip request not found' });
        return;
      }

      res.status(200).json({ success: true, data: trip });
    } catch (error) {
      next(error);
    }
  }

  public async assignTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;

      const { ambulanceId, driverId, paramedicIds } = req.body;

      const updated = await ambulanceService.assignTrip(id, hospitalId, {
        ambulanceId,
        driverId,
        paramedicIds,
      });

      if (!updated) {
        res.status(404).json({ success: false, message: 'Trip request not found' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  public async updateTripStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;

      const { status, cancellationReason, clinicalNotes, distanceKm } = req.body;

      const updated = await ambulanceService.updateTripStatus(id, hospitalId, {
        status: status as TripStatus,
        cancellationReason,
        clinicalNotes,
        distanceKm,
      });

      if (!updated) {
        res.status(404).json({ success: false, message: 'Trip request not found' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
}

export const ambulanceController = new AmbulanceController();