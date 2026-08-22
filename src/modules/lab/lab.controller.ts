import {
  Request,
  Response,
  NextFunction,
} from 'express';

import { LabService } from './lab.service.js';

import {
  CreateLabOrderDTO,
  RecordLabResultsDTO,
  RejectSampleDTO,
  GetLabOrdersQueryDTO,
  AmendResultsDTO,
  RepeatTestDTO,
  AccessionSpecimenDTO,
} from './lab.types.js';

import { AuthRequest } from '../../middlewares/auth.middleware.js';

/* =========================================================
   CONTROLLER
========================================================= */

export class LabController {
  private static getAuthContext(
    req: Request
  ) {
    const authReq =
      req as AuthRequest;

    const userId =
      authReq.user?._id ||
      authReq.user?.accountId ||
      authReq.account?.accountId;

    const hospitalId =
      authReq.user?.hospitalId ||
      authReq.user?.accountId ||
      authReq.account?.accountId;

    if (!userId || !hospitalId) {
      const error = new Error(
        'Authentication context is missing.'
      ) as Error & {
        statusCode?: number;
      };

      error.statusCode = 401;

      throw error;
    }

    return {
      userId,
      hospitalId,
    };
  }

  /* =========================================================
     CREATE
  ========================================================= */

  static async create(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        userId,
        hospitalId,
      } = LabController.getAuthContext(req);

      const order =
        await LabService.createOrder(
          hospitalId,
          userId,
          req.body as CreateLabOrderDTO
        );

      res.status(201).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  /* =========================================================
     LIST / WORKLIST
  ========================================================= */

  static async list(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        hospitalId,
      } = LabController.getAuthContext(req);

      const result =
        await LabService.getOrders(
          hospitalId,
          req.query as unknown as GetLabOrdersQueryDTO
        );

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /* =========================================================
     GET BY ID
  ========================================================= */

  static async getById(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        hospitalId,
      } = LabController.getAuthContext(req);

      const order =
        await LabService.getOrderById(
          hospitalId,
          req.params.id
        );

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  /* =========================================================
     COLLECT SAMPLE
  ========================================================= */

  static async collectSample(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        userId,
        hospitalId,
      } = LabController.getAuthContext(req);

      const updated =
        await LabService.collectSample(
          hospitalId,
          req.params.id,
          userId
        );

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /* =========================================================
     ACCESSION SPECIMEN
  ========================================================= */

  static async accessionSpecimen(
    req: Request<
      { id: string },
      unknown,
      AccessionSpecimenDTO
    >,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        userId,
        hospitalId,
      } = LabController.getAuthContext(req);

      const updated =
        await LabService.accessionSpecimen(
          hospitalId,
          req.params.id,
          userId,
          req.body || {}
        );

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /* =========================================================
     REJECT SAMPLE
  ========================================================= */

  static async rejectSample(
    req: Request<
      { id: string },
      unknown,
      RejectSampleDTO
    >,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        userId,
        hospitalId,
      } = LabController.getAuthContext(req);

      const updated =
        await LabService.rejectSample(
          hospitalId,
          req.params.id,
          userId,
          req.body
        );

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /* =========================================================
     RECOLLECT SAMPLE
  ========================================================= */

  static async recollectSample(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        userId,
        hospitalId,
      } = LabController.getAuthContext(req);

      const updated =
        await LabService.recollectSample(
          hospitalId,
          req.params.id,
          userId
        );

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /* =========================================================
     RECORD RESULTS
  ========================================================= */

  static async submitResults(
    req: Request<
      { id: string },
      unknown,
      RecordLabResultsDTO
    >,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        userId,
        hospitalId,
      } = LabController.getAuthContext(req);

      const updated =
        await LabService.recordResults(
          hospitalId,
          req.params.id,
          userId,
          req.body
        );

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /* =========================================================
     VERIFY RESULTS
  ========================================================= */

  static async verifyResults(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        userId,
        hospitalId,
      } = LabController.getAuthContext(req);

      const updated =
        await LabService.verifyResults(
          hospitalId,
          req.params.id,
          userId
        );

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /* =========================================================
     AUTHORIZE RESULTS
  ========================================================= */

  static async authorizeResults(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        userId,
        hospitalId,
      } = LabController.getAuthContext(req);

      const updated =
        await LabService.authorizeResults(
          hospitalId,
          req.params.id,
          userId
        );

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /* =========================================================
     AMEND RESULTS
  ========================================================= */

  static async amendResults(
    req: Request<
      { id: string },
      unknown,
      AmendResultsDTO
    >,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        userId,
        hospitalId,
      } = LabController.getAuthContext(req);

      const updated =
        await LabService.amendResults(
          hospitalId,
          req.params.id,
          userId,
          req.body
        );

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /* =========================================================
     REPEAT TEST
  ========================================================= */

  static async repeatTest(
    req: Request<
      { id: string },
      unknown,
      RepeatTestDTO
    >,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        userId,
        hospitalId,
      } = LabController.getAuthContext(req);

      const updated =
        await LabService.repeatTest(
          hospitalId,
          req.params.id,
          userId,
          req.body
        );

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}