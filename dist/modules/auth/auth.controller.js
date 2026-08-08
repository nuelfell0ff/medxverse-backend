import { AuthService } from './auth.service.js';
export class AuthController {
    static async register(req, res) {
        try {
            const result = await AuthService.register(req.body);
            res.status(201).json({
                success: true,
                message: 'Account registered successfully',
                data: result,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message || 'Registration failed',
            });
        }
    }
    static async login(req, res) {
        try {
            const result = await AuthService.login(req.body);
            res.status(200).json({
                success: true,
                message: 'Login successful',
                data: result,
            });
        }
        catch (error) {
            res.status(401).json({
                success: false,
                message: error.message || 'Authentication failed',
            });
        }
    }
    static async me(req, res) {
        try {
            const accountId = req.account?.accountId;
            if (!accountId) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const profile = await AuthService.getProfile(accountId);
            res.status(200).json({
                success: true,
                data: profile,
            });
        }
        catch (error) {
            res.status(404).json({
                success: false,
                message: error.message || 'Failed to fetch account profile',
            });
        }
    }
}
