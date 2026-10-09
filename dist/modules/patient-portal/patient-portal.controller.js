import { PatientPortalService } from './patient-portal.service.js';
export class PatientPortalController {
    static async hospitals(_req, res) {
        try {
            const hospitals = await PatientPortalService.listHospitals();
            res.status(200).json({
                success: true,
                message: 'Hospitals loaded successfully.',
                data: hospitals,
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: error?.message || 'Unable to load hospitals.',
            });
        }
    }
    static async register(req, res) {
        try {
            const data = await PatientPortalService.register(req.body || {});
            res.status(201).json({
                success: true,
                message: 'Patient portal account created.',
                data,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error?.message || 'Patient registration failed.',
            });
        }
    }
    static async login(req, res) {
        try {
            const data = await PatientPortalService.login(req.body || {});
            res.status(200).json({
                success: true,
                message: 'Signed in successfully.',
                data,
            });
        }
        catch (error) {
            res.status(401).json({
                success: false,
                message: error?.message || 'Patient login failed.',
            });
        }
    }
    static async link(req, res) {
        try {
            const data = await PatientPortalService.link(req.body || {});
            res.status(200).json({
                success: true,
                message: 'Account connected to hospital successfully.',
                data,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error?.message || 'Connecting account to hospital failed.',
            });
        }
    }
}
