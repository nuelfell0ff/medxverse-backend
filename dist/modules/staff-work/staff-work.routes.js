import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { StaffWorkController } from './staff-work.controller.js';
const router = Router();
router.use(authenticate);
// Staff-facing read-only work activity.
router.get('/activity', (req, res, next) => StaffWorkController.activity(req, res, next));
// Tasks.
router.get('/tasks', (req, res, next) => StaffWorkController.listTasks(req, res, next));
router.get('/tasks/:id', (req, res, next) => StaffWorkController.getTask(req, res, next));
router.post('/tasks', (req, res, next) => StaffWorkController.createTask(req, res, next));
router.patch('/tasks/:id', (req, res, next) => StaffWorkController.updateTask(req, res, next));
// Tickets.
router.get('/tickets', (req, res, next) => StaffWorkController.listTickets(req, res, next));
router.get('/tickets/:id', (req, res, next) => StaffWorkController.getTicket(req, res, next));
router.post('/tickets', (req, res, next) => StaffWorkController.createTicket(req, res, next));
router.patch('/tickets/:id', (req, res, next) => StaffWorkController.updateTicket(req, res, next));
router.post('/tickets/:id/comments', (req, res, next) => StaffWorkController.addTicketComment(req, res, next));
export default router;
