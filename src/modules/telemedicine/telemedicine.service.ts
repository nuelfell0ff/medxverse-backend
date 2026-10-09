
import { Types } from 'mongoose';
import { PatientModel } from '../patient/patient.model.js';
import { Staff } from '../staff/staff.model.js';
import { ProviderScheduleModel } from '../appointment/appointment.model.js';
import {
  TelemedicineSessionModel,
  TelemedicineMessageModel,
} from './telemedicine.model.js';
import {
  CreateTelemedicineSessionInput,
  UpdateSessionStatusInput,
  SendMessageInput,
  GetSessionsQuery,
  ITelemedicineSessionDocument,
  ITelemedicineMessageDocument,
  ConsultationStatus,
  ConsultationType,
} from './telemedicine.types.js';
import { publishEhrResource } from '../patient/ehr.publisher.js';

interface ProviderAvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface ProviderBlockedTime {
  startAt: Date | string;
  endAt: Date | string;
}

interface ProviderScheduleLean {
  _id: Types.ObjectId;
  availability?: ProviderAvailabilitySlot[];
  timezone?: string;
  blockedTimes?: ProviderBlockedTime[];
}

export class TelemedicineService {
  public async createSession(
    input: CreateTelemedicineSessionInput
  ): Promise<ITelemedicineSessionDocument> {
    if (
      !Types.ObjectId.isValid(input.hospitalId) ||
      !Types.ObjectId.isValid(input.patientId) ||
      !Types.ObjectId.isValid(input.doctorId)
    ) {
      throw new Error(
        'A valid hospital, patient, and doctor ID are required.'
      );
    }

    const scheduledStartTime = new Date(input.scheduledStartTime);

    if (
      Number.isNaN(scheduledStartTime.getTime()) ||
      scheduledStartTime.getTime() < Date.now() - 60_000
    ) {
      throw new Error(
        'Choose a valid consultation date and time in the future.'
      );
    }

    if (
      !Object.values(ConsultationType).includes(input.consultationType)
    ) {
      throw new Error('Choose a valid consultation type.');
    }

    const [patient, doctor] = await Promise.all([
      PatientModel.findOne({
        _id: input.patientId,
        hospitalId: input.hospitalId,
        active: true,
      })
        .select('_id')
        .lean()
        .exec(),

      Staff.findOne({
        _id: input.doctorId,
        hospitalId: input.hospitalId,
      })
        .select('_id')
        .lean()
        .exec(),
    ]);

    if (!patient) {
      throw new Error(
        'The selected patient was not found in this hospital.'
      );
    }

    if (!doctor) {
      throw new Error(
        'The selected doctor was not found in this hospital.'
      );
    }

    if (input.followUpOfSessionId) {
      if (!Types.ObjectId.isValid(input.followUpOfSessionId)) {
        throw new Error('Invalid follow-up consultation reference.');
      }

      const previous = await TelemedicineSessionModel.findOne({
        _id: input.followUpOfSessionId,
        hospitalId: input.hospitalId,
        patientId: input.patientId,
      })
        .select('_id')
        .lean()
        .exec();

      if (!previous) {
        throw new Error(
          'The follow-up must be linked to an earlier consultation for this patient.'
        );
      }
    }

    const roster = (await ProviderScheduleModel.findOne({
      hospitalId: input.hospitalId,
      providerId: input.doctorId,
      active: true,
    })
      .lean()
      .exec()) as unknown as ProviderScheduleLean | null;

    if (
      roster &&
      Array.isArray(roster.availability) &&
      roster.availability.length > 0
    ) {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: roster.timezone || 'Africa/Lagos',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(scheduledStartTime);

      const part = (type: string): string =>
        parts.find((item) => item.type === type)?.value || '';

      const weekdayMap: Record<string, number> = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
      };

      const weekday = weekdayMap[part('weekday')];
      const time = `${part('hour')}:${part('minute')}`;

      const hasAvailability = roster.availability.some(
        (slot) =>
          slot.dayOfWeek === weekday &&
          time >= slot.startTime &&
          time < slot.endTime
      );

      if (!hasAvailability) {
        throw new Error(
          'The selected time is outside this doctor’s configured duty roster. Choose an available time.'
        );
      }

      const blocked = (roster.blockedTimes || []).some((slot) => {
        const startAt = new Date(slot.startAt);
        const endAt = new Date(slot.endAt);

        return (
          !Number.isNaN(startAt.getTime()) &&
          !Number.isNaN(endAt.getTime()) &&
          scheduledStartTime >= startAt &&
          scheduledStartTime < endAt
        );
      });

      if (blocked) {
        throw new Error(
          'The doctor is unavailable at this time. Choose another slot.'
        );
      }
    }

    const conflictingSession = await TelemedicineSessionModel.findOne({
      hospitalId: input.hospitalId,
      doctorId: input.doctorId,
      scheduledStartTime: {
        $gte: new Date(scheduledStartTime.getTime() - 29 * 60_000),
        $lt: new Date(scheduledStartTime.getTime() + 30 * 60_000),
      },
      status: {
        $nin: [
          ConsultationStatus.CANCELLED,
          ConsultationStatus.NO_SHOW,
        ],
      },
    })
      .select('_id')
      .lean()
      .exec();

    if (conflictingSession) {
      throw new Error(
        'This doctor already has a consultation scheduled around that time. Choose another time.'
      );
    }

    const meetingRoomId =
      `medxverse-${input.hospitalId}-${Date.now()}-` +
      Math.random().toString(36).substring(2, 12);

    const meetingBaseUrl = (
      process.env.TELEMEDICINE_MEETING_BASE_URL ||
      'https://meet.jit.si'
    ).replace(/\/+$/, '');

    const meetingUrl =
      `${meetingBaseUrl}/${meetingRoomId}` +
      (input.consultationType === ConsultationType.VOICE
        ? '#config.startWithVideoMuted=true'
        : '');

    const session = await TelemedicineSessionModel.create({
      ...input,
      hospitalId: new Types.ObjectId(input.hospitalId),
      patientId: new Types.ObjectId(input.patientId),
      doctorId: new Types.ObjectId(input.doctorId),
      scheduledStartTime,
      meetingRoomId,
      meetingUrl,
      status: ConsultationStatus.WAITING_ROOM,
      joinedWaitingRoomAt: new Date(),
    });

    await publishEhrResource({
      hospitalId: input.hospitalId,
      patientId: input.patientId,
      actorId: input.doctorId,
      role: 'TELEMEDICINE',
      resourceType: 'Encounter',
      resourceId: session._id.toString(),
      status: session.status,
      department: 'Telemedicine',
      resource: {
        resourceType: 'Encounter',
        id: session._id.toString(),
        status: session.status,
        class: 'VR',
        type: {
          coding: [
            {
              system: 'LOCAL',
              code: input.consultationType,
              display: 'Telemedicine consultation',
            },
          ],
        },
        reason: input.chiefComplaint,
        period: { start: session.scheduledStartTime },
        sourceTelemedicineSessionId: session._id.toString(),
      },
      reason: 'Telemedicine encounter published to Unified EHR.',
    });

    return session;
  }

  public async getDirectory(
    hospitalId: string,
    includePatients = true
  ): Promise<{ patients: unknown[]; doctors: unknown[] }> {
    if (!Types.ObjectId.isValid(hospitalId)) {
      throw new Error('A valid hospital account is required.');
    }

    const [patients, doctors] = await Promise.all([
      includePatients
        ? PatientModel.find({ hospitalId, active: true })
            .select('_id firstName lastName mrn phone email')
            .sort({ lastName: 1, firstName: 1 })
            .limit(250)
            .lean()
            .exec()
        : Promise.resolve([]),

      Staff.find({
        hospitalId,
        $or: [
          {
            role: {
              $regex: 'doctor|physician|specialist|consultant',
              $options: 'i',
            },
          },
          {
            specialization: { $exists: true, $ne: '' },
          },
        ],
      })
        .select(
          '_id firstName lastName staffId role department specialization status'
        )
        .sort({ lastName: 1, firstName: 1 })
        .limit(250)
        .lean()
        .exec(),
    ]);

    return { patients, doctors };
  }

  public async getSessions(
    hospitalId: string,
    query: GetSessionsQuery
  ): Promise<{
    sessions: ITelemedicineSessionDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { hospitalId };

    if (query.patientId) filter.patientId = query.patientId;
    if (query.doctorId) filter.doctorId = query.doctorId;
    if (query.status) filter.status = query.status;
    if (query.consultationType) {
      filter.consultationType = query.consultationType;
    }

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
    hospitalId: string,
    patientId?: string,
    doctorId?: string
  ): Promise<ITelemedicineSessionDocument | null> {
    return TelemedicineSessionModel.findOne({
      _id: sessionId,
      hospitalId,
      ...(patientId ? { patientId } : {}),
      ...(doctorId ? { doctorId } : {}),
    })
      .populate('patientId', 'firstName lastName mrn dateOfBirth gender phone')
      .populate('doctorId', 'firstName lastName role specialization')
      .exec();
  }

  public async updateSessionStatus(
    sessionId: string,
    hospitalId: string,
    input: UpdateSessionStatusInput,
    patientId?: string,
    doctorId?: string
  ): Promise<ITelemedicineSessionDocument | null> {
    const scope = {
      _id: sessionId,
      hospitalId,
      ...(patientId ? { patientId } : {}),
      ...(doctorId ? { doctorId } : {}),
    };

    const current = await TelemedicineSessionModel.findOne(scope).exec();

    if (!current) return null;

    if (
      [
        ConsultationStatus.COMPLETED,
        ConsultationStatus.CANCELLED,
        ConsultationStatus.NO_SHOW,
      ].includes(current.status) &&
      input.status !== current.status
    ) {
      throw new Error(
        'This consultation has already ended and cannot change status.'
      );
    }

    if (
      input.status === ConsultationStatus.IN_PROGRESS &&
      current.status !== ConsultationStatus.WAITING_ROOM
    ) {
      throw new Error(
        'Only consultations in the waiting room can be started.'
      );
    }

    if (
      input.status === ConsultationStatus.COMPLETED &&
      current.status !== ConsultationStatus.IN_PROGRESS
    ) {
      throw new Error(
        'Only an in-progress consultation can be completed.'
      );
    }

    if (
      input.status === ConsultationStatus.CANCELLED &&
      current.status !== ConsultationStatus.WAITING_ROOM
    ) {
      throw new Error(
        'Only consultations that have not started can be cancelled.'
      );
    }

    const updateData: Record<string, unknown> = {
      status: input.status,
    };

    if (input.status === ConsultationStatus.IN_PROGRESS) {
      updateData.actualStartTime = new Date();
    } else if (input.status === ConsultationStatus.COMPLETED) {
      const endTime = new Date();
      updateData.endTime = endTime;

      if (current.actualStartTime) {
        const durationMs =
          endTime.getTime() - current.actualStartTime.getTime();

        updateData.durationMinutes = Math.round(durationMs / 60000);
      }
    }

    if (input.clinicalNotes) {
      updateData.clinicalNotes = input.clinicalNotes;
    }

    if (input.recordingUrl) {
      updateData.recordingUrl = input.recordingUrl;
    }

    const updated = await TelemedicineSessionModel.findOneAndUpdate(
      {
        _id: sessionId,
        hospitalId,
        ...(patientId ? { patientId } : {}),
        ...(doctorId ? { doctorId } : {}),
      },
      { $set: updateData },
      { new: true }
    ).exec();

    if (updated) {
      await publishEhrResource({
        hospitalId,
        patientId: updated.patientId.toString(),
        actorId: updated.doctorId.toString(),
        role: 'TELEMEDICINE',
        resourceType: 'Encounter',
        resourceId: updated._id.toString(),
        status: updated.status,
        department: 'Telemedicine',
        resource: {
          resourceType: 'Encounter',
          id: updated._id.toString(),
          status: updated.status,
          class: 'VR',
          period: {
            start: updated.actualStartTime || updated.scheduledStartTime,
            end: updated.endTime,
          },
          reason: updated.chiefComplaint,
          clinicalNotes: updated.clinicalNotes,
          durationMinutes: updated.durationMinutes,
          recordingUrl: updated.recordingUrl,
          sourceTelemedicineSessionId: updated._id.toString(),
        },
        reason: 'Updated telemedicine encounter published to Unified EHR.',
      });
    }

    return updated;
  }

  public async sendMessage(
    input: SendMessageInput
  ): Promise<ITelemedicineMessageDocument> {
    if (
      !Types.ObjectId.isValid(input.sessionId) ||
      !Types.ObjectId.isValid(input.senderId)
    ) {
      throw new Error('A valid session and sender are required.');
    }

    const session = await TelemedicineSessionModel.findOne({
      _id: input.sessionId,
      hospitalId: input.hospitalId,
    })
      .select('patientId doctorId')
      .lean()
      .exec();

    if (!session) {
      throw new Error('Consultation session not found.');
    }

    if (
      input.senderModel === 'Patient' &&
      session.patientId.toString() !== input.senderId
    ) {
      throw new Error(
        'You are not the patient assigned to this consultation.'
      );
    }

    if (
      input.senderModel === 'User' &&
      input.senderRole === 'STAFF' &&
      session.doctorId.toString() !== input.senderId
    ) {
      throw new Error(
        'Only the assigned doctor can message this patient through this consultation.'
      );
    }

    if (!input.messageText || !input.messageText.trim()) {
      throw new Error('Message cannot be empty.');
    }

    return TelemedicineMessageModel.create({
      ...input,
      hospitalId: new Types.ObjectId(input.hospitalId),
      sessionId: new Types.ObjectId(input.sessionId),
      senderId: new Types.ObjectId(input.senderId),
    });
  }

  public async getSessionMessages(
    sessionId: string,
    hospitalId: string,
    patientId?: string,
    doctorId?: string
  ): Promise<ITelemedicineMessageDocument[]> {
    if (!Types.ObjectId.isValid(sessionId)) {
      throw new Error('Invalid consultation session.');
    }

    const session = await TelemedicineSessionModel.findOne({
      _id: sessionId,
      hospitalId,
      ...(patientId ? { patientId } : {}),
      ...(doctorId ? { doctorId } : {}),
    })
      .select('_id')
      .lean()
      .exec();

    if (!session) {
      throw new Error('Consultation session not found.');
    }

    return TelemedicineMessageModel.find({ sessionId, hospitalId })
      .sort({ sentAt: 1 })
      .exec();
  }
}

export const telemedicineService = new TelemedicineService();