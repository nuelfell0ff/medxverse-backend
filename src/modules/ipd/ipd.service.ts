import { Types } from 'mongoose';
import { WardModel, BedModel, InpatientAdmissionModel } from './ipd.model.js';
import {
  ICreateWardDTO,
  ICreateBedDTO,
  IAdmitPatientDTO,
  ITransferBedDTO,
  IDischargePatientDTO,
  IIpdQueryFilters,
  BedStatus,
  AdmissionStatus,
  IWardDocument,
  IBedDocument,
  IInpatientAdmissionDocument,
} from './ipd.types.js';

export class IpdService {
  private static generateAdmissionNumber(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `ADM-${timestamp}-${random}`;
  }

  // Wards & Beds
  static async createWard(hospitalId: string, dto: ICreateWardDTO): Promise<IWardDocument> {
    const ward = new WardModel({
      hospitalId: new Types.ObjectId(hospitalId),
      ...dto,
    });
    return await ward.save();
  }

  static async getWards(hospitalId: string): Promise<IWardDocument[]> {
    return await WardModel.find({ hospitalId: new Types.ObjectId(hospitalId) }).lean();
  }

  static async createBed(hospitalId: string, dto: ICreateBedDTO): Promise<IBedDocument> {
    const ward = await WardModel.findOne({
      _id: new Types.ObjectId(dto.wardId),
      hospitalId: new Types.ObjectId(hospitalId),
    });

    if (!ward) {
      throw new Error('Ward not found');
    }

    const bed = new BedModel({
      hospitalId: new Types.ObjectId(hospitalId),
      wardId: new Types.ObjectId(dto.wardId),
      bedNumber: dto.bedNumber,
      dailyRate: dto.dailyRate,
      notes: dto.notes,
      status: BedStatus.AVAILABLE,
    });

    return await bed.save();
  }

  static async getBedsByWard(hospitalId: string, wardId: string): Promise<IBedDocument[]> {
    return await BedModel.find({
      hospitalId: new Types.ObjectId(hospitalId),
      wardId: new Types.ObjectId(wardId),
    }).lean();
  }

  static async updateBedStatus(
    hospitalId: string,
    bedId: string,
    status: BedStatus
  ): Promise<IBedDocument> {
    const bed = await BedModel.findOneAndUpdate(
      { _id: new Types.ObjectId(bedId), hospitalId: new Types.ObjectId(hospitalId) },
      { status },
      { new: true }
    );

    if (!bed) {
      throw new Error('Bed not found');
    }

    return bed;
  }

  // Admission Operations
  static async admitPatient(
    hospitalId: string,
    userId: string,
    dto: IAdmitPatientDTO
  ): Promise<IInpatientAdmissionDocument> {
    const bed = await BedModel.findOne({
      _id: new Types.ObjectId(dto.bedId),
      hospitalId: new Types.ObjectId(hospitalId),
    });

    if (!bed) {
      throw new Error('Bed not found');
    }

    if (bed.status !== BedStatus.AVAILABLE) {
      throw new Error(`Bed is currently ${bed.status.toLowerCase()} and cannot be assigned`);
    }

    const activeAdmission = await InpatientAdmissionModel.findOne({
      hospitalId: new Types.ObjectId(hospitalId),
      patientId: new Types.ObjectId(dto.patientId),
      status: AdmissionStatus.ADMITTED,
    });

    if (activeAdmission) {
      throw new Error('Patient is currently admitted in another ward/bed');
    }

    const admissionNumber = this.generateAdmissionNumber();

    const admission = new InpatientAdmissionModel({
      hospitalId: new Types.ObjectId(hospitalId),
      patientId: new Types.ObjectId(dto.patientId),
      doctorInChargeId: new Types.ObjectId(dto.doctorInChargeId),
      wardId: new Types.ObjectId(dto.wardId),
      bedId: new Types.ObjectId(dto.bedId),
      admissionNumber,
      admissionReason: dto.admissionReason,
      diagnosis: dto.diagnosis,
      estimatedDischargeDate: dto.estimatedDischargeDate,
      admittedBy: new Types.ObjectId(userId),
      status: AdmissionStatus.ADMITTED,
      progressNotes: [],
    });

    await admission.save();

    bed.status = BedStatus.OCCUPIED;
    await bed.save();

    return admission;
  }

  static async transferBed(
    hospitalId: string,
    admissionId: string,
    dto: ITransferBedDTO
  ): Promise<IInpatientAdmissionDocument> {
    const admission = await InpatientAdmissionModel.findOne({
      _id: new Types.ObjectId(admissionId),
      hospitalId: new Types.ObjectId(hospitalId),
      status: AdmissionStatus.ADMITTED,
    });

    if (!admission) {
      throw new Error('Active admission record not found');
    }

    const newBed = await BedModel.findOne({
      _id: new Types.ObjectId(dto.newBedId),
      hospitalId: new Types.ObjectId(hospitalId),
    });

    if (!newBed || newBed.status !== BedStatus.AVAILABLE) {
      throw new Error('Target bed is not available for transfer');
    }

    const oldBedId = admission.bedId;

    admission.wardId = new Types.ObjectId(dto.newWardId);
    admission.bedId = new Types.ObjectId(dto.newBedId);

    await admission.save();

    await BedModel.findByIdAndUpdate(oldBedId, { status: BedStatus.CLEANING });
    newBed.status = BedStatus.OCCUPIED;
    await newBed.save();

    return admission;
  }

  static async dischargePatient(
    hospitalId: string,
    admissionId: string,
    userId: string,
    dto: IDischargePatientDTO
  ): Promise<IInpatientAdmissionDocument> {
    const admission = await InpatientAdmissionModel.findOne({
      _id: new Types.ObjectId(admissionId),
      hospitalId: new Types.ObjectId(hospitalId),
      status: AdmissionStatus.ADMITTED,
    });

    if (!admission) {
      throw new Error('Active admission record not found');
    }

    admission.status = AdmissionStatus.DISCHARGED;
    admission.dischargeDate = new Date();
    admission.dischargeSummary = dto.dischargeSummary;
    admission.dischargedBy = new Types.ObjectId(userId);

    await admission.save();

    await BedModel.findByIdAndUpdate(admission.bedId, { status: BedStatus.CLEANING });

    return admission;
  }

  static async addProgressNote(
    hospitalId: string,
    admissionId: string,
    userId: string,
    note: string
  ): Promise<IInpatientAdmissionDocument> {
    const admission = await InpatientAdmissionModel.findOne({
      _id: new Types.ObjectId(admissionId),
      hospitalId: new Types.ObjectId(hospitalId),
      status: AdmissionStatus.ADMITTED,
    });

    if (!admission) {
      throw new Error('Active admission record not found');
    }

    admission.progressNotes.push({
      note,
      recordedBy: new Types.ObjectId(userId),
      createdAt: new Date(),
    });

    return await admission.save();
  }

  static async getAdmissions(hospitalId: string, filters: IIpdQueryFilters) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 10;
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {
      hospitalId: new Types.ObjectId(hospitalId),
    };

    if (filters.patientId) {
      query.patientId = new Types.ObjectId(filters.patientId);
    }

    if (filters.wardId) {
      query.wardId = new Types.ObjectId(filters.wardId);
    }

    if (filters.doctorInChargeId) {
      query.doctorInChargeId = new Types.ObjectId(filters.doctorInChargeId);
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      query.admissionDate = {};
      if (filters.startDate) query.admissionDate.$gte = new Date(filters.startDate);
      if (filters.endDate) query.admissionDate.$lte = new Date(filters.endDate);
    }

    const [admissions, total] = await Promise.all([
      InpatientAdmissionModel.find(query)
        .populate('patientId', 'firstName lastName email phone gender dob')
        .populate('doctorInChargeId', 'firstName lastName')
        .populate('wardId', 'name type')
        .populate('bedId', 'bedNumber dailyRate')
        .sort({ admissionDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InpatientAdmissionModel.countDocuments(query),
    ]);

    return {
      admissions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  static async getAdmissionById(hospitalId: string, admissionId: string): Promise<IInpatientAdmissionDocument> {
    const admission = await InpatientAdmissionModel.findOne({
      _id: new Types.ObjectId(admissionId),
      hospitalId: new Types.ObjectId(hospitalId),
    })
      .populate('patientId', 'firstName lastName email phone gender dob')
      .populate('doctorInChargeId', 'firstName lastName email')
      .populate('wardId', 'name type')
      .populate('bedId', 'bedNumber dailyRate')
      .populate('progressNotes.recordedBy', 'firstName lastName');

    if (!admission) {
      throw new Error('Admission record not found');
    }

    return admission;
  }
}