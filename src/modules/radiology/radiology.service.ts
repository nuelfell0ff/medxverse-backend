import { RadiologyRequestModel } from './radiology.model.js';
import { CreateImagingRequestDto, SubmitRadiologyReportDto } from './radiology.types.js';

export class RadiologyService {
  public static async createImagingRequest(hospitalId: string, requestedBy: string, data: CreateImagingRequestDto) {
    const request = await RadiologyRequestModel.create({
      hospitalId,
      requestedBy,
      ...data,
      status: 'ORDERED',
    });
    return request;
  }

  public static async getImagingRequests(
    hospitalId: string,
    filters: { status?: string; patientId?: string; page?: number; limit?: number }
  ) {
    const query: any = { hospitalId };
    if (filters.status) query.status = filters.status;
    if (filters.patientId) query.patientId = filters.patientId;

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      RadiologyRequestModel.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
      RadiologyRequestModel.countDocuments(query),
    ]);

    return { requests, total, page, limit, pages: Math.ceil(total / limit) };
  }

  public static async getImagingRequestById(id: string, hospitalId: string) {
    const request = await RadiologyRequestModel.findOne({ _id: id, hospitalId });
    if (!request) throw new Error('Radiology request not found');
    return request;
  }

  public static async updateStatus(id: string, hospitalId: string, status: string) {
    const request = await RadiologyRequestModel.findOneAndUpdate(
      { _id: id, hospitalId },
      { status },
      { new: true }
    );
    if (!request) throw new Error('Radiology request not found');
    return request;
  }

  public static async submitReport(id: string, hospitalId: string, data: SubmitRadiologyReportDto) {
    const request = await RadiologyRequestModel.findOneAndUpdate(
      { _id: id, hospitalId },
      {
        radiologistId: data.radiologistId,
        findings: data.findings,
        impression: data.impression,
        imageUrls: data.imageUrls || [],
        status: 'COMPLETED',
        reportedAt: new Date(),
      },
      { new: true }
    );
    if (!request) throw new Error('Radiology request not found');
    return request;
  }
}