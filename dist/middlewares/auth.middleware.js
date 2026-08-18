import jwt from 'jsonwebtoken';
export const authenticateAccount = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
        req.account = decoded;
        // Resolve hospitalId and _id regardless of JWT payload property naming
        const resolvedHospitalId = decoded.hospitalId || decoded.accountId || decoded.hospital || decoded._id || decoded.id;
        const resolvedUserId = decoded._id || decoded.id || decoded.accountId;
        // Attach normalized req.user so downstream controllers find hospitalId and _id
        req.user = {
            ...decoded,
            _id: resolvedUserId,
            hospitalId: resolvedHospitalId,
            hospital: resolvedHospitalId,
        };
        next();
    }
    catch (error) {
        res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
};
// Restrict access based on AccountType or User Role
export const restrictTo = (...allowedRoles) => {
    return (req, res, next) => {
        const role = req.user?.role || req.account?.accountType;
        if (!role || !allowedRoles.includes(role)) {
            res.status(403).json({
                success: false,
                message: 'Forbidden. You do not have permission to perform this action.',
            });
            return;
        }
        next();
    };
};
// Compatibility aliases for legacy/route imports
export const protect = authenticateAccount;
export const authenticate = authenticateAccount;
export const authorize = restrictTo;
