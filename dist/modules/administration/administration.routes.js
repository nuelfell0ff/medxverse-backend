import { Router } from 'express';
import { administrationController } from './administration.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
const router = Router();
router.use(authenticate);
// Organization Branches
router.post('/branches', (req, res, next) => administrationController.createBranch(req, res, next));
router.get('/branches', (req, res, next) => administrationController.getBranches(req, res, next));
// Access Control & Roles
router.post('/roles', (req, res, next) => administrationController.createRole(req, res, next));
router.get('/roles', (req, res, next) => administrationController.getRoles(req, res, next));
// Audit Logging
router.get('/audit-logs', (req, res, next) => administrationController.getAuditLogs(req, res, next));
// Security & Session Management
router.get('/sessions/user', (req, res, next) => administrationController.getUserDeviceSessions(req, res, next));
router.get('/sessions/user/:userId', (req, res, next) => administrationController.getUserDeviceSessions(req, res, next));
router.patch('/sessions/:id/revoke', (req, res, next) => administrationController.revokeDeviceSession(req, res, next));
export default router;
