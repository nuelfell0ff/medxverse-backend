import { Types } from 'mongoose';
import { TelemedicineSessionModel, TelemedicineMessageModel } from './telemedicine.model.js';
import {
  CreateTelemedicineSessionInput,
  UpdateSessionStatusInput,
  SendMessageInput,
  GetSessionsQuery,
  ITelemedicineSessionDocument,
  ITelemedicineMessageDocument,
  ConsultationStatus,
} from './telemedicine.types.js';

export class TelemedicineService {
  public async createSession(
    input: CreateTelemedicineSessionInput
  ): Promise<ITelemedicineSessionDocument> {
    const meetingRoomId = `telemed-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const meetingUrl = `https://telemed.hospital.com/room/${meetingRoomId}`;

    return TelemedicineSessionModel.create({
      ...input,
      hospitalId: new Types.ObjectId(input.hospitalId),
      patientId: new Types.ObjectId(input.patientId),
      doctorId: new Types.ObjectId(input.doctorId),
      scheduledStartTime: new Date(input.scheduledStartTime),
      meetingRoomId,
      meetingUrl,
      status: ConsultationStatus.WAITING_ROOM,
      joinedWaitingRoomAt: new Date(),
    });
  }

  public async getSessions(
    hospitalId: string,
    query: GetSessionsQuery
  ): Promise<{ sessions: ITelemedicineSessionDocument[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { hospitalId };

    if (query.patientId) filter.patientId = query.patientId;
    if (query.doctorId) filter.doctorId = query.doctorId;
    if (query.status) filter.status = query.status;
    if (query.consultationType) filter.consultationType = query.consultationType;

    const [sessions, total] = await Promise.all([
      TelemedicineSessionModel.find(filter)
        .populate('patientId', 'firstName lastName mrn phone')
        .populate('doctorId', 'firstName lastName role specialization')
        .sort({ scheduledStartTime: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      TelemedicineSessionModel.countDocuments(filter),
    ]);

    return {
      sessions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async getSessionById(
    sessionId: string,
    hospitalId: string
  ): Promise<ITelemedicineSessionDocument | null> {
    return TelemedicineSessionModel.findOne({ _id: sessionId, hospitalId })
      .populate('patientId', 'firstName lastName mrn dateOfBirth gender phone')
      .populate('doctorId', 'firstName lastName role specialization')
      .exec();
  }

  public async updateSessionStatus(
    sessionId: string,
    hospitalId: string,
    input: UpdateSessionStatusInput
  ): Promise<ITelemedicineSessionDocument | null> {
    const updateData: Record<string, unknown> = { status: input.status };

    if (input.status === ConsultationStatus.IN_PROGRESS) {
      updateData.actualStartTime = new Date();
    } else if (input.status === ConsultationStatus.COMPLETED) {
      const endTime = new Date();
      updateData.endTime = endTime;

      const session = await TelemedicineSessionModel.findById(sessionId);
      if (session && session.actualStartTime) {
        const durationMs = endTime.getTime() - session.actualStartTime.getTime();
        updateData.durationMinutes = Math.round(durationMs / 60000);
      }
    }

    if (input.clinicalNotes) updateData.clinicalNotes = input.clinicalNotes;
    if (input.recordingUrl) updateData.recordingUrl = input.recordingUrl;

    return TelemedicineSessionModel.findOneAndUpdate(
      { _id: sessionId, hospitalId },
      { $set: updateData },
      { new: true }
    ).exec();
  }

  public async sendMessage(input: SendMessageInput): Promise<ITelemedicineMessageDocument> {
    return TelemedicineMessageModel.create({
      ...input,
      hospitalId: new Types.ObjectId(input.hospitalId),
      sessionId: new Types.ObjectId(input.sessionId),
      senderId: new Types.ObjectId(input.senderId),
    });
  }

  public async getSessionMessages(
    sessionId: string,
    hospitalId: string
  ): Promise<ITelemedicineMessageDocument[]> {
    return TelemedicineMessageModel.find({ sessionId, hospitalId })
      .sort({ sentAt: 1 })
      .exec();
  }
}

export const telemedicineService = new TelemedicineService();