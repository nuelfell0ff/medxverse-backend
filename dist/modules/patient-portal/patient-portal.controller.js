import { PatientPortalService } from './patient-portal.service.js';
export class PatientPortalController {
    static async register(req, res) {
        try {
            const data = await PatientPortalService.register(req.body || {});
            res.status(201).json({ success: true, message: 'Patient portal account created.', data });
        }
        catch (error) {
            res.status(400).json({ success: false, message: error?.message || 'Patient registration failed.' });
        }
    }
    static async login(req, res) {
        try {
            const data = await PatientPortalService.login(req.body || {});
            res.status(200).json({ success: true, message: 'Signed in successfully.', data });
        }
        catch (error) {
            res.status(401).json({ success: false, message: error?.message || 'Patient login failed.' });
        }
    }
}
