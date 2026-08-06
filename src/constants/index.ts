import { Router } from 'express';
import organizationRoutes from '../modules/organization/organization.routes.js';
import authRoutes from '../modules/auth/auth.routes.js';
import userRoutes from '../modules/user/user.routes.js';
import patientRoutes from '../modules/patient/patient.routes.js';
import opdRoutes from '../modules/opd/opd.routes.js';
// import ipdRoutes from '../modules/ipd/ipd.routes.js';
import pharmacyRoutes from '../modules/pharmacy/pharmacy.routes.js';
import labRoutes from '../modules/laboratory/laboratory.routes.js';
// import radiologyRoutes from '../modules/radiology/radiology.routes.js';
// import billingRoutes from '../modules/billing/billing.routes.js';
import hmoRoutes from '../modules/hmo/hmo.routes.js';
// import lexiRoutes from '../modules/lexi-ai/lexi.routes.js';

const v1Router = Router();

// Platform & Onboarding
v1Router.use('/organizations', organizationRoutes);
v1Router.use('/auth', authRoutes);
v1Router.use('/users', userRoutes);

// // Clinical & Patient Management
v1Router.use('/patients', patientRoutes);
v1Router.use('/opd', opdRoutes);
// v1Router.use('/ipd', ipdRoutes);

// // Diagnostics & Ancillary
v1Router.use('/pharmacy', pharmacyRoutes);
v1Router.use('/laboratory', labRoutes);
// v1Router.use('/radiology', radiologyRoutes);

// // Financials & Payors
// v1Router.use('/billing', billingRoutes);
v1Router.use('/hmo', hmoRoutes);

// // AI Assistance
// v1Router.use('/lexi-ai', lexiRoutes);

export default v1Router;