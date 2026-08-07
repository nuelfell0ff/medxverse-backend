import { Types } from 'mongoose';
import { AppointmentModel } from './appointment.model.js';
import {
  CreateAppointmentDTO,
  UpdateAppointmentStatusDTO,
  GetAppointmentsQueryDTO,
  IAppointmentDocument,
} from './appointment.types.js';

export class AppointmentService {
  static async createAppointment(
    hospitalId: string,
    dto: CreateAppointmentDTO
  ): Promise<IAppointmentDocument> {
    const appointment = await AppointmentModel.create({
      hospitalId: new Types.ObjectId(hospitalId),
      patientId: new Types.ObjectId(dto.patientId),
      doctorId: new Types.ObjectId(dto.doctorId),
      appointmentDate: new Date(dto.appointmentDate),
      startTime: dto.startTime,
      endTime: dto.endTime,
      type: dto.type,
      reason: dto.reason,
      notes: dto.notes,
    });

    return appointment.populate([
      { path: 'patientId', select: 'firstName lastName mrn phone' },
      { path: 'doctorId', select: 'firstName lastName email department' },
    ]);
  }

  static async getAppointments(hospitalId: string, query: GetAppointmentsQueryDTO) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { hospitalId };

    if (query.patientId) {
      filter.patientId = new Types.ObjectId(query.patientId);
    }

    if (query.doctorId) {
      filter.doctorId = new Types.ObjectId(query.doctorId);
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.date) {
      const startOfDay = new Date(query.date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(query.date);
      endOfDay.setHours(23, 59, 59, 999);

      filter.appointmentDate = { $gte: startOfDay, $lte: endOfDay };
    }

    const [appointments, total] = await Promise.all([
      AppointmentModel.find(filter)
        .populate('patientId', 'firstName lastName mrn phone')
        .populate('doctorId', 'firstName lastName email department')
        .sort({ appointmentDate: 1, startTime: 1 })
        .skip(skip)
        .limit(limit),
      AppointmentModel.countDocuments(filter),
    ]);

    return {
      appointments,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  static async getAppointmentById(
    hospitalId: string,
    appointmentId: string
  ): Promise<IAppointmentDocument> {
    const appointment = await AppointmentModel.findOne({
      _id: appointmentId,
      hospitalId,
    }).populate([
      { path: 'patientId', select: 'firstName lastName mrn phone gender dateOfBirth' },
      { path: 'doctorId', select: 'firstName lastName email department' },
    ]);

    if (!appointment) {
      const error = new Error('Appointment record not found.') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }

    return appointment;
  }

  static async updateStatus(
    hospitalId: string,
    appointmentId: string,
    dto: UpdateAppointmentStatusDTO
  ): Promise<IAppointmentDocument> {
    const appointment = await this.getAppointmentById(hospitalId, appointmentId);

    appointment.status = dto.status;
    if (dto.notes) {
      appointment.notes = dto.notes;
    }

    await appointment.save();
    return appointment;
  }
}