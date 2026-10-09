import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Account } from '../auth/auth.model.js';
import { PatientModel } from '../patient/patient.model.js';
import { PatientPortalAccountModel } from './patient-portal.model.js';
function validPassword(password) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password);
}
function tokenFor(account, patient) {
    const secret = process.env.JWT_SECRET || 'fallback_secret_key';
    const expiresIn = (process.env.JWT_EXPIRES_IN || '7d');
    return jwt.sign({
        accountId: account._id.toString(),
        _id: patient._id.toString(),
        id: patient._id.toString(),
        patientId: patient._id.toString(),
        hospitalId: patient.hospitalId.toString(),
        accountType: 'HOSPITAL',
        userType: 'PATIENT',
        name: `${patient.firstName} ${patient.lastName}`.trim(),
        email: patient.email,
    }, secret, { expiresIn });
}
export class PatientPortalService {
    static async register(input) {
        const hospitalCode = String(input.hospitalCode || '').trim().toUpperCase();
        const mrn = String(input.mrn || '').trim();
        const email = String(input.email || '').trim().toLowerCase();
        const phone = String(input.phone || '').trim();
        const dob = new Date(input.dateOfBirth);
        const password = String(input.password || '');
        if (!hospitalCode || !mrn || !email || !phone || !input.dateOfBirth) {
            throw new Error('Hospital code, medical record number, date of birth, email and phone are required.');
        }
        if (Number.isNaN(dob.getTime()))
            throw new Error('Enter a valid date of birth.');
        if (!validPassword(password)) {
            throw new Error('Password must be at least 8 characters and include uppercase, lowercase, number and special character.');
        }
        if (input.confirmPassword !== undefined && input.confirmPassword !== password) {
            throw new Error('Passwords do not match.');
        }
        const hospitalResult = await Account.findOne({
            code: hospitalCode,
            accountType: 'HOSPITAL',
            isActive: true,
        })
            .select('_id code')
            .lean()
            .exec();
        // Some project model typings incorrectly infer lean findOne() as a document-or-array union.
        // Normalize the result before accessing document fields.
        const hospital = (Array.isArray(hospitalResult) ? hospitalResult[0] : hospitalResult);
        if (!hospital)
            throw new Error('Hospital code was not found or the hospital is inactive.');
        const dayStart = new Date(dob);
        dayStart.setUTCHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
        const patientResult = await PatientModel.findOne({
            hospitalId: hospital._id,
            mrn,
            email,
            phone,
            dateOfBirth: { $gte: dayStart, $lt: dayEnd },
            active: true,
        })
            .select('_id firstName lastName email hospitalId mrn')
            .lean()
            .exec();
        const patient = (Array.isArray(patientResult) ? patientResult[0] : patientResult);
        if (!patient) {
            throw new Error('We could not match those details to an active patient record. Check them with your hospital before trying again.');
        }
        const existing = await PatientPortalAccountModel.findOne({
            hospitalId: hospital._id,
            $or: [{ patientId: patient._id }, { email }],
        })
            .select('_id')
            .lean()
            .exec();
        if (existing)
            throw new Error('A patient portal account already exists for this record or email. Please sign in.');
        const passwordHash = await bcrypt.hash(password, 12);
        const portalAccount = await PatientPortalAccountModel.create({
            hospitalId: hospital._id,
            patientId: patient._id,
            email,
            password: passwordHash,
            active: true,
        });
        const patientWithHospital = {
            ...patient,
            hospitalId: hospital._id,
        };
        return {
            token: tokenFor(portalAccount, patientWithHospital),
            patient: {
                id: patient._id.toString(),
                hospitalId: hospital._id.toString(),
                name: `${patient.firstName} ${patient.lastName}`.trim(),
                email,
                mrn: patient.mrn,
            },
        };
    }
    static async login(input) {
        const hospitalCode = String(input.hospitalCode || '').trim().toUpperCase();
        const email = String(input.email || '').trim().toLowerCase();
        const password = String(input.password || '');
        if (!hospitalCode || !email || !password) {
            throw new Error('Hospital code, email and password are required.');
        }
        const hospitalResult = await Account.findOne({
            code: hospitalCode,
            accountType: 'HOSPITAL',
            isActive: true,
        })
            .select('_id')
            .lean()
            .exec();
        const hospital = (Array.isArray(hospitalResult) ? hospitalResult[0] : hospitalResult);
        if (!hospital)
            throw new Error('Invalid hospital code or credentials.');
        const portalAccount = await PatientPortalAccountModel.findOne({
            hospitalId: hospital._id,
            email,
            active: true,
        })
            .select('+password')
            .exec();
        if (!portalAccount || !(await bcrypt.compare(password, portalAccount.password))) {
            throw new Error('Invalid hospital code, email or password.');
        }
        const patientResult = await PatientModel.findOne({
            _id: portalAccount.patientId,
            hospitalId: hospital._id,
            active: true,
        })
            .select('_id firstName lastName email mrn')
            .lean()
            .exec();
        const patient = (Array.isArray(patientResult) ? patientResult[0] : patientResult);
        if (!patient)
            throw new Error('The linked patient record is inactive. Contact your hospital.');
        portalAccount.lastLoginAt = new Date();
        await portalAccount.save();
        const patientWithHospital = {
            ...patient,
            hospitalId: hospital._id,
        };
        return {
            token: tokenFor(portalAccount, patientWithHospital),
            patient: {
                id: patient._id.toString(),
                hospitalId: hospital._id.toString(),
                name: `${patient.firstName} ${patient.lastName}`.trim(),
                email: patient.email || email,
                mrn: patient.mrn,
            },
        };
    }
}
