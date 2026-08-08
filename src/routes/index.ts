import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';



// hospital HIS
import dashboardRoutes from '../modules/dashboard/dashboard.routes.js';
import patientRoutes from '../modules/patient/patient.routes.js';
import appointmentRoutes from '../modules/appointment/appointment.routes.js';
import outpatientRoutes from '../modules/outpatient/outpatient.routes.js';
import emergencyRoutes from '../modules/emergency/emergency.routes.js';
import admissionRoutes from '../modules/admissions/admissions.routes.js';
import surgeryRoutes from '../modules/surgery/surgery.routes.js';
import pharmacyRoutes from '../modules/pharmacy/pharmacy.routes.js';
import labRoutes from '../modules/lab/lab.routes.js';
import radiologyRoutes from '../modules/radiology/radiology.routes.js';
import mchRoutes from '../modules/mch/mch.routes.js';
import dentalRoutes from '../modules/dental/dental.routes.js';
import eyeRoutes from '../modules/eye-clinic/eye-clinic.routes.js';
import mentalHealthRoutes from '../modules/mental-health/mental-health.routes.js';
import staffRoutes from '../modules/staff/staff.routes.js';
import ambulanceRoutes from '../modules/ambulance/ambulance.routes.js';
import billingRoutes from '../modules/billing/billing.routes.js';
import reportsRoutes from '../modules/reports/reports.routes.js';
import notificationsRoutes from '../modules/notifications/notifications.routes.js';
import inventoryRoutes from '../modules/inventory/inventory.routes.js';
import administrationRoutes from '../modules/administration/administration.routes.js';
import telemedicineRoutes from '../modules/telemedicine/telemedicine.routes.js';
import settingsRoutes from '../modules/settings/settings.routes.js';

// hms portal
import hmsDashboardRoutes from '../modules/hms-dashboard/hms-dashboard.routes.js';
import preAuthorizationRoutes from '../modules/pre-authorizations/pre-authorizations.routes.js';
import membersRoutes from '../modules/members/members.routes.js';
import claimsRoutes from '../modules/claims/claims.routes.js';
import providerRoutes from '../modules/provider/provider.routes.js';
import benefitsRoutes from '../modules/benefits/benefits.routes.js';
import hmsReportsRoutes from '../modules/hms-reports/reports.routes.js';
import hmsNotificationsRoutes from '../modules/hms-notifications/notifications.routes.js';


const v1Router = Router();

// Platform & Onboarding
v1Router.use('/auth', authRoutes);


// hospital HIS 
v1Router.use('/dashboard', dashboardRoutes);
v1Router.use('/patients', patientRoutes);
v1Router.use('/appointments', appointmentRoutes);
v1Router.use('/outpatients', outpatientRoutes);
v1Router.use('/emergency', emergencyRoutes);
v1Router.use('/admissions', admissionRoutes);
v1Router.use('/surgery', surgeryRoutes);
v1Router.use('/pharmacy', pharmacyRoutes);
v1Router.use('/lab', labRoutes);
v1Router.use('/radiology', radiologyRoutes);
v1Router.use('/mch', mchRoutes);
v1Router.use('/dental', dentalRoutes);
v1Router.use('/eye', eyeRoutes);
v1Router.use('/mental-health', mentalHealthRoutes);
v1Router.use('/staff', staffRoutes);
v1Router.use('/ambulance', ambulanceRoutes);
v1Router.use('/billing', billingRoutes);
v1Router.use('/reports', reportsRoutes);
v1Router.use('/notifications', notificationsRoutes);
v1Router.use('/inventory', inventoryRoutes);
v1Router.use('/administration', administrationRoutes);
v1Router.use('/telemedicine', telemedicineRoutes);
v1Router.use('/settings', settingsRoutes);

// hms portal
v1Router.use('/hms-dashboard', hmsDashboardRoutes);
v1Router.use('/pre-authorizations', preAuthorizationRoutes);
v1Router.use('/members', membersRoutes);
v1Router.use('/claims', claimsRoutes);
v1Router.use('/providers', providerRoutes);
v1Router.use('/benefits', benefitsRoutes);
v1Router.use('/hms-reports', hmsReportsRoutes);
v1Router.use('/hms-notifications', hmsNotificationsRoutes);


export default v1Router;