import { Request, Response, NextFunction } from 'express';
import { outpatientService } from './outpatient.service.js';
import {
  ConsultationStatus,
  TriagePriority,
} from './outpatient.types.js';

export interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    hospitalId?: string;
    accountId?: string;
    [key: string]: unknown;
  };
}

/**
 * Safely extracts the hospital identifier across varying JWT payload structures.
 */
const extractHospitalId = (
  req: AuthenticatedRequest
): string | null => {
  return (
    req.user?.hospitalId ||
    req.user?.accountId ||
    (req.user as any)?.hospital ||
    null
  );
};

export class OutpatientController {
  public async createEncounter(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = extractHospitalId(authReq);

      if (!hospitalId) {
        res.status(400).json({
          success: false,
          message:
            'Validation Error: hospitalId is missing from user authentication token.',
        });
        return;
      }

      const {
        patientId,
        doctorId,
        departmentId,
        triagePriority,
        chiefComplaint,
      } = req.body;

      if (!patientId) {
        res.status(400).json({
          success: false,
          message: 'Validation Error: patientId is required.',
        });
        return;
      }

      if (
        !chiefComplaint ||
        typeof chiefComplaint !== 'string' ||
        !chiefComplaint.trim()
      ) {
        res.status(400).json({
          success: false,
          message: 'Validation Error: chiefComplaint is required.',
        });
        return;
      }

      const createInput: any = {
        hospitalId,
        patientId,
        chiefComplaint: chiefComplaint.trim(),
        triagePriority:
          triagePriority || TriagePriority.STANDARD,
      };

      if (
        doctorId &&
        typeof doctorId === 'string' &&
        doctorId.trim() !== ''
      ) {
        createInput.doctorId = doctorId;
      }

      if (
        departmentId &&
        typeof departmentId === 'string' &&
        departmentId.trim() !== ''
      ) {
        createInput.departmentId = departmentId;
      }

      const encounter =
        await outpatientService.createEncounter(createInput);

      res.status(201).json({
        success: true,
        data: encounter,
      });
    } catch (error) {
      next(error);
    }
  }

  public async getQueue(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = extractHospitalId(authReq);

      if (!hospitalId) {
        res.status(400).json({
          success: false,
          message:
            'Validation Error: hospitalId is missing from user authentication token.',
        });
        return;
      }

      const page = req.query.page
        ? parseInt(req.query.page as string, 10)
        : 1;

      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 20;

      const status =
        req.query.status as ConsultationStatus | undefined;

      const doctorId =
        req.query.doctorId as string | undefined;

      const triagePriority =
        req.query.triagePriority as
          | TriagePriority
          | undefined;

      const result = await outpatientService.getQueue(
        hospitalId,
        {
          page,
          limit,
          status,
          doctorId,
          triagePriority,
        }
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public async getEncounterById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = extractHospitalId(authReq);

      if (!hospitalId) {
        res.status(400).json({
          success: false,
          message:
            'Validation Error: hospitalId is missing from user authentication token.',
        });
        return;
      }

      const encounterId = req.params.id as string;

      const encounter =
        await outpatientService.getEncounterById(
          encounterId,
          hospitalId
        );

      if (!encounter) {
        res.status(404).json({
          success: false,
          message: 'Encounter not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: encounter,
      });
    } catch (error) {
      next(error);
    }
  }

  public async recordVitals(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = extractHospitalId(authReq);

      if (!hospitalId) {
        res.status(400).json({
          success: false,
          message:
            'Validation Error: hospitalId is missing from user authentication token.',
        });
        return;
      }

      const encounterId = req.params.id as string;
      const { vitalSigns, nursingNotes } = req.body;

      const updated =
        await outpatientService.recordVitals(
          encounterId,
          hospitalId,
          {
            vitalSigns,
            nursingNotes,
          }
        );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Encounter not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  public async startConsultation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = extractHospitalId(authReq);

      if (!hospitalId) {
        res.status(400).json({
          success: false,
          message:
            'Validation Error: hospitalId is missing from user authentication token.',
        });
        return;
      }

      const doctorId = authReq.user?._id;
      const encounterId = req.params.id as string;

      if (!doctorId) {
        res.status(400).json({
          success: false,
          message:
            'Validation Error: authenticated staff ID is missing.',
        });
        return;
      }

      const updated =
        await outpatientService.startConsultation(
          encounterId,
          hospitalId,
          doctorId
        );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Encounter not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  public async completeConsultation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = extractHospitalId(authReq);

      if (!hospitalId) {
        res.status(400).json({
          success: false,
          message:
            'Validation Error: hospitalId is missing from user authentication token.',
        });
        return;
      }

      const encounterId = req.params.id as string;
      const { consultationNotes, diagnoses } = req.body;

      const updated =
        await outpatientService.completeConsultation(
          encounterId,
          hospitalId,
          {
            consultationNotes,
            diagnoses,
          },
          authReq.user?._id
        );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Encounter not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: updated,
        billing: updated.billing,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Manual billing retry endpoint.
   *
   * Useful when a consultation was completed while the pricing catalogue
   * was missing/inactive. Once the catalogue is configured, this endpoint
   * can safely be called again; createCharge() is idempotent by sourceId.
   */
  public async captureBilling(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const hospitalId = extractHospitalId(authReq);

      if (!hospitalId) {
        res.status(400).json({
          success: false,
          message:
            'Validation Error: hospitalId is missing from user authentication token.',
        });
        return;
      }

      const encounterId = req.params.id as string;

      const updated =
        await outpatientService.captureBilling(
          encounterId,
          hospitalId,
          authReq.user?._id
        );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Encounter not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: updated,
        billing: updated.billing,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const outpatientController =
  new OutpatientController();
