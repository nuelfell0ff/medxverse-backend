import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Types } from 'mongoose';
import { PatientModel } from '../patient/patient.model.js';
import { PatientPortalAccountModel } from './patient-portal.model.js';

interface PatientLean {
  _id: Types.ObjectId;
  firstName?: string;
  lastName?: string;
  email?: string;
  hospitalId?: Types.ObjectId;
  mrn?: string;
  dateOfBirth?: Date;
}

interface PortalAccountLean {
  _id: Types.ObjectId;
  hospitalId?: Types.ObjectId;
  patientId?: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: Date;
  password?: string;
  active: boolean;
}

function validPassword(password: string): boolean {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password);
}

function tokenFor(account: PortalAccountLean, patient?: PatientLean | null): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured on the server.');
  }

  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];
  const firstName = patient?.firstName || account.firstName;
  const lastName = patient?.lastName || account.lastName;
  const email = patient?.email || account.email;

  const payload: Record<string, unknown> = {
    accountId: account._id.toString(),
    portalAccountId: account._id.toString(),
    userType: 'PATIENT',
    accountType: 'PATIENT_PORTAL',
    name: `${firstName} ${lastName}`.trim(),
    email,
  };

  // Only include clinical identifiers when this portal account has been linked
  // to a hospital patient record. Self-registration alone must not grant access
  // to another patient's medical records.
  if (patient?._id) payload.patientId = patient._id.toString();
  if (account.hospitalId) payload.hospitalId = account.hospitalId.toString();

  return jwt.sign(payload, secret, { expiresIn });
}

export class PatientPortalService {
  static async register(input: {
    name: string;
    email: string;
    dateOfBirth: string;
    password: string;
    confirmPassword?: string;
  }) {
    const name = String(input.name || '').trim().replace(/\s+/g, ' ');
    const email = String(input.email || '').trim().toLowerCase();
    const dobInput = String(input.dateOfBirth || '').trim();
    const password = String(input.password || '');

    if (!name || !email || !dobInput || !password) {
      throw new Error('Name, email, date of birth and password are required.');
    }

    if (name.length < 2 || name.length > 120) {
      throw new Error('Enter a name between 2 and 120 characters.');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Enter a valid email address.');
    }

    const dob = new Date(`${dobInput}T00:00:00.000Z`);
    if (Number.isNaN(dob.getTime()) || dob > new Date()) {
      throw new Error('Enter a valid date of birth that is not in the future.');
    }

    if (!validPassword(password)) {
      throw new Error(
        'Password must be at least 8 characters and include uppercase, lowercase, number and special character.'
      );
    }

    if (input.confirmPassword !== undefined && input.confirmPassword !== password) {
      throw new Error('Passwords do not match.');
    }

    const existing = await PatientPortalAccountModel.findOne({ email })
      .select('_id')
      .lean()
      .exec();

    if (existing) {
      throw new Error('An account with this email already exists. Please sign in instead.');
    }

    const nameParts = name.split(' ');
    const firstName = nameParts.shift() || name;
    const lastName = nameParts.join(' ') || firstName;
    const passwordHash = await bcrypt.hash(password, 12);

    const portalAccount = await PatientPortalAccountModel.create({
      firstName,
      lastName,
      dateOfBirth: dob,
      email,
      password: passwordHash,
      active: true,
    });

    const accountForToken: PortalAccountLean = {
      _id: portalAccount._id,
      firstName: portalAccount.firstName,
      lastName: portalAccount.lastName,
      dateOfBirth: portalAccount.dateOfBirth,
      email: portalAccount.email,
      active: portalAccount.active,
    };

    return {
      token: tokenFor(accountForToken),
      patient: {
        id: portalAccount._id.toString(),
        portalAccountId: portalAccount._id.toString(),
        name: `${firstName} ${lastName}`.trim(),
        firstName,
        lastName,
        email,
        dateOfBirth: dob.toISOString().slice(0, 10),
        linkedToHospital: false,
      },
      message: 'Account created. Your account must be linked to a hospital patient record before hospital-specific medical records are available.',
    };
  }

  static async login(input: {
    email: string;
    password: string;
  }) {
    const email = String(input.email || '').trim().toLowerCase();
    const password = String(input.password || '');

    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    const portalAccount = await PatientPortalAccountModel.findOne({ email, active: true })
      .select('+password')
      .exec();

    if (!portalAccount || !(await bcrypt.compare(password, portalAccount.password))) {
      throw new Error('Invalid email or password.');
    }

    let patient: PatientLean | null = null;
    if (portalAccount.patientId && portalAccount.hospitalId) {
      patient = (await PatientModel.findOne({
        _id: portalAccount.patientId,
        hospitalId: portalAccount.hospitalId,
        active: true,
      })
        .select('_id firstName lastName email hospitalId mrn dateOfBirth')
        .lean()
        .exec()) as unknown as PatientLean | null;

      if (!patient) {
        throw new Error('The linked hospital patient record is inactive or unavailable. Contact your hospital.');
      }
    }

    portalAccount.lastLoginAt = new Date();
    await portalAccount.save();

    const accountForToken: PortalAccountLean = {
      _id: portalAccount._id,
      hospitalId: portalAccount.hospitalId,
      patientId: portalAccount.patientId,
      firstName: portalAccount.firstName,
      lastName: portalAccount.lastName,
      email: portalAccount.email,
      dateOfBirth: portalAccount.dateOfBirth,
      active: portalAccount.active,
    };

    const firstName = patient?.firstName || portalAccount.firstName;
    const lastName = patient?.lastName || portalAccount.lastName;

    return {
      token: tokenFor(accountForToken, patient),
      patient: {
        id: patient?._id.toString() || portalAccount._id.toString(),
        portalAccountId: portalAccount._id.toString(),
        ...(patient?.hospitalId ? { hospitalId: patient.hospitalId.toString() } : {}),
        name: `${firstName} ${lastName}`.trim(),
        firstName,
        lastName,
        email: patient?.email || portalAccount.email,
        dateOfBirth: (patient?.dateOfBirth || portalAccount.dateOfBirth).toISOString().slice(0, 10),
        ...(patient?.mrn ? { mrn: patient.mrn } : {}),
        linkedToHospital: Boolean(patient),
      },
    };
  }
}
