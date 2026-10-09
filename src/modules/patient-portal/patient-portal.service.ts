import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Types } from 'mongoose';
import { PatientModel } from '../patient/patient.model.js';
import { PatientPortalAccountModel } from './patient-portal.model.js';
import { Account } from '../auth/auth.model.js';
import { AccountType } from '../auth/auth.types.js';

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

  static async listHospitals() {
    const hospitals = await Account.find({ accountType: AccountType.HOSPITAL, isActive: true })
      .select('_id name code address logoUrl')
      .sort({ name: 1 })
      .lean()
      .exec();

    return {
      hospitals: hospitals.map((hospital: any) => ({
        id: String(hospital._id),
        name: String(hospital.name || 'Hospital'),
        code: String(hospital.code || ''),
        ...(hospital.address ? { address: String(hospital.address) } : {}),
        ...(hospital.logoUrl ? { logoUrl: String(hospital.logoUrl) } : {}),
      })).filter((hospital: { code: string }) => Boolean(hospital.code)),
    };
  }

  static async linkHospital(input: {
    email: string;
    password: string;
    hospitalCode: string;
    mrn: string;
    dateOfBirth: string;
  }) {
    const email = String(input.email || '').trim().toLowerCase();
    const password = String(input.password || '');
    const hospitalCode = String(input.hospitalCode || '').trim().toUpperCase();
    const mrn = String(input.mrn || '').trim();
    const dobInput = String(input.dateOfBirth || '').trim();

    if (!email || !password || !hospitalCode || !mrn || !dobInput) {
      throw new Error('Hospital, medical record number, date of birth and portal password are required.');
    }

    const portalAccount = await PatientPortalAccountModel.findOne({ email, active: true })
      .select('+password')
      .exec();
    if (!portalAccount || !(await bcrypt.compare(password, portalAccount.password))) {
      throw new Error('Your portal password could not be verified. Please sign in again and try once more.');
    }

    if (portalAccount.hospitalId && portalAccount.patientId) {
      throw new Error('This portal account is already linked to a hospital patient record.');
    }

    const hospital = await Account.findOne({
      accountType: AccountType.HOSPITAL,
      code: hospitalCode,
      isActive: true,
    }).select('_id name code').lean().exec() as any;

    if (!hospital) {
      throw new Error('We could not find an active hospital with that code. Choose the correct hospital and try again.');
    }

    const dob = new Date(`${dobInput}T00:00:00.000Z`);
    if (Number.isNaN(dob.getTime()) || dob > new Date()) {
      throw new Error('Enter a valid date of birth.');
    }
    const nextDay = new Date(dob.getTime() + 24 * 60 * 60 * 1000);
    const patient = await PatientModel.findOne({
      hospitalId: hospital._id,
      mrn: { $regex: `^${mrn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
      dateOfBirth: { $gte: dob, $lt: nextDay },
      active: true,
    }).select('_id firstName lastName email hospitalId mrn dateOfBirth').lean().exec() as unknown as PatientLean | null;

    if (!patient) {
      throw new Error('We could not match those details to an active patient record at that hospital. Check the hospital, MRN and date of birth, or contact hospital reception.');
    }

    const portalName = `${portalAccount.firstName} ${portalAccount.lastName}`.trim().toLocaleLowerCase();
    const patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
    if (portalName !== patientName) {
      throw new Error('The name on your portal account does not match the hospital record. Contact hospital reception to verify your details.');
    }

    if (patient.email && patient.email.trim().toLowerCase() !== email) {
      throw new Error('The email on your hospital record is different from your portal email. Contact hospital reception to update or verify it.');
    }

    portalAccount.hospitalId = hospital._id as any;
    portalAccount.patientId = patient._id as any;
    portalAccount.firstName = patient.firstName || portalAccount.firstName;
    portalAccount.lastName = patient.lastName || portalAccount.lastName;
    await portalAccount.save();

    const accountForToken: PortalAccountLean = {
      _id: portalAccount._id as Types.ObjectId,
      hospitalId: hospital._id as Types.ObjectId,
      patientId: patient._id as Types.ObjectId,
      firstName: portalAccount.firstName,
      lastName: portalAccount.lastName,
      email: portalAccount.email,
      dateOfBirth: portalAccount.dateOfBirth,
      active: portalAccount.active,
    };

    return {
      token: tokenFor(accountForToken, patient),
      hospital: { id: String(hospital._id), name: String(hospital.name), code: String(hospital.code) },
      patient: {
        id: String(patient._id),
        portalAccountId: String(portalAccount._id),
        hospitalId: String(hospital._id),
        name: `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
        firstName: patient.firstName || portalAccount.firstName,
        lastName: patient.lastName || portalAccount.lastName,
        email: patient.email || portalAccount.email,
        dateOfBirth: (patient.dateOfBirth || portalAccount.dateOfBirth).toISOString().slice(0, 10),
        mrn: patient.mrn,
        linkedToHospital: true,
      },
      message: 'Your patient portal account has been connected to the hospital record.',
    };
  }

}
