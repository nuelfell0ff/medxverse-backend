import { Types } from 'mongoose';
import { LabTest, LabRequest } from './laboratory.model.js';
import { Patient } from '../patient/patient.model.js';
import { Staff } from '../staff/staff.model.js';
import {
  CreateLabTestDTO,
  UpdateLabTestDTO,
  CreateLabRequestDTO,
  CollectSampleDTO,
  SubmitTestResultsDTO,
  LabRequestStatus,
  LabTestCategory,
  ILabRequestItem,
} from './laboratory.types.js';

export class LaboratoryService {
  // --- LAB TEST CATALOG MANAGEMENT ---

  public static async createLabTest(hospitalId: string, dto: CreateLabTestDTO) {
    const existing = await LabTest.findOne({ hospitalId, code: dto.code.toUpperCase() });
    if (existing) {
      throw new Error(`Lab test with code '${dto.code}' already exists`);
    }

    const labTest = await LabTest.create({
      ...dto,
      code: dto.code.toUpperCase(),
      hospitalId,
    });

    return labTest;
  }

  public static async getLabTests(
    hospitalId: string,
    filters: { search?: string; category?: LabTestCategory; isActive?: boolean; page?: number; limit?: number }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = { hospitalId };

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { code: { $regex: filters.search, $options: 'i' } },
      ];
    }
    if (filters.category) query.category = filters.category;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;

    const [tests, total] = await Promise.all([
      LabTest.find(query).sort({ category: 1, name: 1 }).skip(skip).limit(limit),
      LabTest.countDocuments(query),
    ]);

    return {
      tests,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    };
  }

  public static async updateLabTest(testId: string, hospitalId: string, dto: UpdateLabTestDTO) {
    const test = await LabTest.findOneAndUpdate(
      { _id: testId, hospitalId },
      { $set: dto },
      { new: true, runValidators: true }
    );

    if (!test) throw new Error('Lab test not found');
    return test;
  }

  // --- LAB REQUEST MANAGEMENT ---

  public static async createLabRequest(hospitalId: string, dto: CreateLabRequestDTO) {
    const patient = await Patient.findOne({ _id: dto.patientId, hospitalId });
    if (!patient) throw new Error('Patient record not found');

    const doctor = await Staff.findOne({ _id: dto.doctorId, hospitalId });
    if (!doctor) throw new Error('Doctor record not found');

    if (!dto.testIds || dto.testIds.length === 0) {
      throw new Error('At least one lab test must be selected');
    }

    // Fetch test details & build items
    const selectedTests = await LabTest.find({
      _id: { $in: dto.testIds },
      hospitalId,
      isActive: true,
    });

    if (selectedTests.length !== dto.testIds.length) {
      throw new Error('One or more selected tests are invalid or inactive');
    }

    let totalAmount = 0;
    const items = selectedTests.map((test) => {
      totalAmount += test.price;
      return {
        testId: test._id,
        testName: test.name,
        price: test.price,
        status: LabRequestStatus.PENDING,
        results: [],
      };
    });

    const reqCount = await LabRequest.countDocuments({ hospitalId });
    const requestNumber = `LAB-${Date.now().toString().slice(-6)}-${reqCount + 1}`;

    const labRequest = await LabRequest.create({
      hospitalId,
      requestNumber,
      patientId: dto.patientId,
      doctorId: dto.doctorId,
      ipdAdmissionId: dto.ipdAdmissionId,
      priority: dto.priority,
      status: LabRequestStatus.PENDING,
      items,
      totalAmount,
      notes: dto.notes,
    });

    return labRequest.populate([
      { path: 'patientId', select: 'mrn firstName lastName category gender age' },
      { path: 'doctorId', select: 'firstName lastName department' },
    ]);
  }

  public static async getLabRequests(
    hospitalId: string,
    filters: { status?: LabRequestStatus; patientId?: string; page?: number; limit?: number }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = { hospitalId };

    if (filters.status) query.status = filters.status;
    if (filters.patientId) query.patientId = filters.patientId;

    const [requests, total] = await Promise.all([
      LabRequest.find(query)
        .populate('patientId', 'mrn firstName lastName category gender')
        .populate('doctorId', 'firstName lastName department')
        .populate('sampleCollectedBy', 'firstName lastName')
        .populate('performedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      LabRequest.countDocuments(query),
    ]);

    return {
      requests,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    };
  }

  public static async getLabRequestById(requestId: string, hospitalId: string) {
    const request = await LabRequest.findOne({ _id: requestId, hospitalId }).populate([
      { path: 'patientId', select: 'mrn firstName lastName category gender dateOfBirth' },
      { path: 'doctorId', select: 'firstName lastName department' },
      { path: 'sampleCollectedBy', select: 'firstName lastName' },
      { path: 'performedBy', select: 'firstName lastName' },
      { path: 'items.testId', select: 'code name category parameters sampleType' },
    ]);

    if (!request) throw new Error('Lab request not found');
    return request;
  }

  // --- SAMPLE COLLECTION & RESULT WORKFLOW ---

  public static async collectSample(requestId: string, hospitalId: string, dto: CollectSampleDTO) {
    const request = await LabRequest.findOne({ _id: requestId, hospitalId });
    if (!request) throw new Error('Lab request not found');

    if (request.status !== LabRequestStatus.PENDING) {
      throw new Error(`Cannot collect sample. Request is currently ${request.status}`);
    }

    request.status = LabRequestStatus.SAMPLE_COLLECTED;
    request.sampleCollectedAt = new Date();
    request.sampleCollectedBy = new Types.ObjectId(dto.collectedBy);
    if (dto.sampleTypeNotes) request.sampleTypeNotes = dto.sampleTypeNotes;

    // Update item status
    request.items.forEach((item: ILabRequestItem) => {
      item.status = LabRequestStatus.SAMPLE_COLLECTED;
    });

    await request.save();
    return request;
  }

  public static async submitResults(requestId: string, hospitalId: string, dto: SubmitTestResultsDTO) {
    const request = await LabRequest.findOne({ _id: requestId, hospitalId });
    if (!request) throw new Error('Lab request not found');

    if (request.status === LabRequestStatus.CANCELLED || request.status === LabRequestStatus.COMPLETED) {
      throw new Error(`Cannot submit results for a ${request.status} request`);
    }

    for (const testResult of dto.testResults) {
      const item = request.items.find((i: ILabRequestItem) => i.testId.toString() === testResult.testId);
      if (item) {
        item.results = testResult.results;
        item.remarks = testResult.remarks;
        item.status = LabRequestStatus.COMPLETED;
      }
    }

    const allCompleted = request.items.every((i: ILabRequestItem) => i.status === LabRequestStatus.COMPLETED);

    request.status = allCompleted ? LabRequestStatus.COMPLETED : LabRequestStatus.IN_PROGRESS;
    request.performedBy = new Types.ObjectId(dto.performedBy);
    if (allCompleted) {
      request.completedAt = new Date();
    }

    await request.save();
    return request;
  }
}