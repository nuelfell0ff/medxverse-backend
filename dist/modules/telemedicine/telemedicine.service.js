import { Types } from 'mongoose';
import { TelemedicineSessionModel, TelemedicineMessageModel } from './telemedicine.model.js';
import { ConsultationStatus, } from './telemedicine.types.js';
export class TelemedicineService {
    async createSession(input) {
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
    async getSessions(hospitalId, query) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(50, Math.max(1, query.limit || 20));
        const skip = (page - 1) * limit;
        const filter = { hospitalId };
        if (query.patientId)
            filter.patientId = query.patientId;
        if (query.doctorId)
            filter.doctorId = query.doctorId;
        if (query.status)
            filter.status = query.status;
        if (query.consultationType)
            filter.consultationType = query.consultationType;
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
    async getSessionById(sessionId, hospitalId) {
        return TelemedicineSessionModel.findOne({ _id: sessionId, hospitalId })
            .populate('patientId', 'firstName lastName mrn dateOfBirth gender phone')
            .populate('doctorId', 'firstName lastName role specialization')
            .exec();
    }
    async updateSessionStatus(sessionId, hospitalId, input) {
        const updateData = { status: input.status };
        if (input.status === ConsultationStatus.IN_PROGRESS) {
            updateData.actualStartTime = new Date();
        }
        else if (input.status === ConsultationStatus.COMPLETED) {
            const endTime = new Date();
            updateData.endTime = endTime;
            const session = await TelemedicineSessionModel.findById(sessionId);
            if (session && session.actualStartTime) {
                const durationMs = endTime.getTime() - session.actualStartTime.getTime();
                updateData.durationMinutes = Math.round(durationMs / 60000);
            }
        }
        if (input.clinicalNotes)
            updateData.clinicalNotes = input.clinicalNotes;
        if (input.recordingUrl)
            updateData.recordingUrl = input.recordingUrl;
        return TelemedicineSessionModel.findOneAndUpdate({ _id: sessionId, hospitalId }, { $set: updateData }, { new: true }).exec();
    }
    async sendMessage(input) {
        return TelemedicineMessageModel.create({
            ...input,
            hospitalId: new Types.ObjectId(input.hospitalId),
            sessionId: new Types.ObjectId(input.sessionId),
            senderId: new Types.ObjectId(input.senderId),
        });
    }
    async getSessionMessages(sessionId, hospitalId) {
        return TelemedicineMessageModel.find({ sessionId, hospitalId })
            .sort({ sentAt: 1 })
            .exec();
    }
}
export const telemedicineService = new TelemedicineService();
