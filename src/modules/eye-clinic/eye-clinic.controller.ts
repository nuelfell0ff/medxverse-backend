import { Request, Response, NextFunction } from 'express';
import { eyeClinicService } from './eye-clinic.service.js';
import {
  ExamType,
  PrescriptionType,
  LensType,
} from './eye-clinic.types.js';

export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    hospitalId: string;
    [key: string]: unknown;
  };
}

export class EyeClinicController {
  public async createEyeExam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const examinerId = authReq.user._id;

      const {
        patientId,
        examType,
        chiefComplaint,
        visualAcuityUncorrected,
        refraction,
        tonometry,
        slitLampFindings,
        fundusFindings,
        diagnosis,
        treatmentPlan,
        notes,
      } = req.body;

      const exam = await eyeClinicService.createEyeExam({
        hospitalId,
        patientId,
        examinerId,
        examType: examType as ExamType,
        chiefComplaint,
        visualAcuityUncorrected,
        refraction,
        tonometry,
        slitLampFindings,
        fundusFindings,
        diagnosis,
        treatmentPlan,
        notes,
      });

      res.status(201).json({ success: true, data: exam });
    } catch (error) {
      next(error);
    }
  }

  public async getEyeExams(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const patientId = req.query.patientId as string | undefined;
      const examinerId = req.query.examinerId as string | undefined;
      const examType = req.query.examType as ExamType | undefined;

      const result = await eyeClinicService.getEyeExams(hospitalId, {
        page,
        limit,
        patientId,
        examinerId,
        examType,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public async getEyeExamById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;

      const exam = await eyeClinicService.getEyeExamById(id, hospitalId);

      if (!exam) {
        res.status(404).json({ success: false, message: 'Eye examination record not found' });
        return;
      }

      res.status(200).json({ success: true, data: exam });
    } catch (error) {
      next(error);
    }
  }

  public async createOpticalPrescription(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const prescribedById = authReq.user._id;

      const {
        patientId,
        examId,
        prescriptionType,
        lensType,
        rightEye,
        leftEye,
        pupillaryDistanceMm,
        expirationDate,
        specialInstructions,
      } = req.body;

      const prescription = await eyeClinicService.createOpticalPrescription({
        hospitalId,
        patientId,
        prescribedById,
        examId,
        prescriptionType: prescriptionType as PrescriptionType,
        lensType: lensType as LensType,
        rightEye,
        leftEye,
        pupillaryDistanceMm,
        expirationDate,
        specialInstructions,
      });

      res.status(201).json({ success: true, data: prescription });
    } catch (error) {
      next(error);
    }
  }

  public async getOpticalPrescriptions(
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
      const prescribedById = req.query.prescribedById as string | undefined;
      const prescriptionType = req.query.prescriptionType as PrescriptionType | undefined;
      const isActive =
        req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;

      const result = await eyeClinicService.getOpticalPrescriptions(hospitalId, {
        page,
        limit,
        patientId,
        prescribedById,
        prescriptionType,
        isActive,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public async getOpticalPrescriptionById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = authReq.user.hospitalId;
      const id = req.params.id as string;

      const prescription = await eyeClinicService.getOpticalPrescriptionById(id, hospitalId);

      if (!prescription) {
        res.status(404).json({ success: false, message: 'Optical prescription not found' });
        return;
      }

      res.status(200).json({ success: true, data: prescription });
    } catch (error) {
      next(error);
    }
  }
}

export const eyeClinicController = new EyeClinicController();