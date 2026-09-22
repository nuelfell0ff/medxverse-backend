import { Router } from 'express';
import { PatientController } from './patient.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
const router = Router();
router.use(authenticate);
/*
 * Legacy-compatible Patient endpoints
 */
router.post('/', authorize('HOSPITAL', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'), PatientController.register);
router.get('/', PatientController.list);
router.get('/:id/clinical-summary', PatientController.getClinicalSummary);
router.get('/:id/ehr', PatientController.getEHR);
router.get('/:id', PatientController.getById);
router.patch('/:id', authorize('HOSPITAL', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'), PatientController.update);
router.post('/:id/vitals', authorize('HOSPITAL', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE'), PatientController.recordVitals);
/*
 * Master Patient Index / duplicate management
 */
router.post('/mpi/duplicates', authorize('HOSPITAL', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'), PatientController.duplicates);
router.post('/:id/merge', authorize('HOSPITAL', 'HOSPITAL_ADMIN'), PatientController.merge);
/*
 * Unified EHR resources
 */
router.post('/ehr/encounters', authorize('HOSPITAL', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'), PatientController.createEncounter);
router.post('/ehr/resources', authorize('HOSPITAL', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST', 'LAB_TECHNICIAN', 'RADIOLOGIST'), PatientController.createResource);
router.patch('/ehr/resources/:resourceType/:resourceId', authorize('HOSPITAL', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST', 'LAB_TECHNICIAN', 'RADIOLOGIST'), PatientController.updateResource);
router.get('/:id/ehr/resources/:resourceType/:resourceId/versions', PatientController.versions);
/*
 * Consent records
 */
router.post('/:id/ehr/consents', authorize('HOSPITAL', 'HOSPITAL_ADMIN', 'DOCTOR'), PatientController.createConsent);
router.post('/ehr/consents/:consentId/revoke', authorize('HOSPITAL', 'HOSPITAL_ADMIN', 'DOCTOR'), PatientController.revokeConsent);
export default router;
