import { Router } from 'express';
import { mentalHealthController } from './mental-health.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

// Assessment routes
router.post('/assessments', (req, res, next) =>
  mentalHealthController.createAssessment(req, res, next)
);
router.get('/assessments', (req, res, next) =>
  mentalHealthController.getAssessments(req, res, next)
);
router.get('/assessments/:id', (req, res, next) =>
  mentalHealthController.getAssessmentById(req, res, next)
);

// Psychotherapy session routes
router.post('/sessions', (req, res, next) =>
  mentalHealthController.createSession(req, res, next)
);
router.get('/sessions', (req, res, next) =>
  mentalHealthController.getSessions(req, res, next)
);
router.get('/sessions/:id', (req, res, next) =>
  mentalHealthController.getSessionById(req, res, next)
);

export default router;