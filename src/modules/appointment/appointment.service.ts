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
    if (!Types.ObjectId.isValid(hospitalId)) {
      throw new Error('Invalid Hospital ID provided.');
    }
    if (!Types.ObjectId.isValid(dto.patientId)) {
      throw new Error('Invalid Patient ID provided.');
    }
    if (!Types.ObjectId.isValid(dto.doctorId)) {
      throw new Error('Invalid Doctor ID provided.');
    }

    const apptDate = new Date(dto.appointmentDate);
    if (isNaN(apptDate.getTime())) {
      throw new Error('Invalid appointment date provided.');
    }

    // Clean up empty/null optional fields
    const sanitizedPayload: Record<string, any> = { ...dto };
    Object.keys(sanitizedPayload).forEach((key) => {
      if (sanitizedPayload[key] === '' || sanitizedPayload[key] === null || sanitizedPayload[key] === undefined) {
        delete sanitizedPayload[key];
      }
    });

    const appointment = await AppointmentModel.create({
      ...sanitizedPayload,
      hospitalId: new Types.ObjectId(hospitalId),
      patientId: new Types.ObjectId(dto.patientId),
      doctorId: new Types.ObjectId(dto.doctorId),
      appointmentDate: apptDate,
    });

    return appointment.populate([
      { path: 'patientId', select: 'firstName lastName mrn phone' },
      { path: 'doctorId', select: 'firstName lastName email department' },
    ]);
  }

  static async getAppointments(hospitalId: string, query: GetAppointmentsQueryDTO) {
    if (!Types.ObjectId.isValid(hospitalId)) {
      throw new Error('Invalid Hospital ID provided.');
    }

    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.max(Number(query.limit) || 10, 1);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      hospitalId: new Types.ObjectId(hospitalId),
    };

    if (query.patientId && Types.ObjectId.isValid(query.patientId)) {
      filter.patientId = new Types.ObjectId(query.patientId);
    }

    if (query.doctorId && Types.ObjectId.isValid(query.doctorId)) {
      filter.doctorId = new Types.ObjectId(query.doctorId);
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.date) {
      const dateObj = new Date(query.date);
      if (!isNaN(dateObj.getTime())) {
        const startOfDay = new Date(dateObj);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(dateObj);
        endOfDay.setHours(23, 59, 59, 999);

        filter.appointmentDate = { $gte: startOfDay, $lte: endOfDay };
      }
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
    if (!Types.ObjectId.isValid(hospitalId) || !Types.ObjectId.isValid(appointmentId)) {
      const error = new Error('Invalid record ID provided.') as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }

    const appointment = await AppointmentModel.findOne({
      _id: new Types.ObjectId(appointmentId),
      hospitalId: new Types.ObjectId(hospitalId),
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
    if (dto.notes !== undefined) {
      appointment.notes = dto.notes;
    }

    await appointment.save();
    return appointment;
  }
}
