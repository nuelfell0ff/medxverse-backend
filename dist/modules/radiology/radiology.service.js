import { RadiologyOrderModel } from './radiology.model.js';
import { RadiologyOrderStatus, } from './radiology.types.js';
export class RadiologyService {
    async createOrder(input) {
        return RadiologyOrderModel.create({
            ...input,
            status: RadiologyOrderStatus.REQUESTED,
        });
    }
    async getOrders(hospitalId, query) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(50, Math.max(1, query.limit || 20));
        const skip = (page - 1) * limit;
        const filter = { hospitalId };
        if (query.status)
            filter.status = query.status;
        if (query.modality)
            filter.modality = query.modality;
        if (query.patientId)
            filter.patientId = query.patientId;
        if (query.orderingDoctorId)
            filter.orderingDoctorId = query.orderingDoctorId;
        if (query.radiologistId)
            filter.radiologistId = query.radiologistId;
        const [orders, total] = await Promise.all([
            RadiologyOrderModel.find(filter)
                .populate('patientId', 'firstName lastName mrn gender dateOfBirth')
                .populate('orderingDoctorId', 'firstName lastName role')
                .populate('radiologistId', 'firstName lastName role')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            RadiologyOrderModel.countDocuments(filter),
        ]);
        return {
            orders,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getOrderById(orderId, hospitalId) {
        return RadiologyOrderModel.findOne({ _id: orderId, hospitalId })
            .populate('patientId', 'firstName lastName mrn gender dateOfBirth')
            .populate('orderingDoctorId', 'firstName lastName role')
            .populate('radiologistId', 'firstName lastName role')
            .exec();
    }
    async updatePacsData(orderId, hospitalId, input) {
        return RadiologyOrderModel.findOneAndUpdate({ _id: orderId, hospitalId }, {
            $set: {
                pacsMetadata: input,
                status: RadiologyOrderStatus.COMPLETED,
            },
        }, { new: true }).exec();
    }
    async completeReport(orderId, hospitalId, input) {
        return RadiologyOrderModel.findOneAndUpdate({ _id: orderId, hospitalId }, {
            $set: {
                radiologistId: input.radiologistId,
                findings: input.findings,
                impression: input.impression,
                radiologistNotes: input.radiologistNotes,
                status: RadiologyOrderStatus.REPORTED,
                reportedAt: new Date(),
            },
        }, { new: true }).exec();
    }
    async cancelOrder(orderId, hospitalId, cancellationReason) {
        return RadiologyOrderModel.findOneAndUpdate({ _id: orderId, hospitalId, status: { $ne: RadiologyOrderStatus.REPORTED } }, {
            $set: {
                status: RadiologyOrderStatus.CANCELLED,
                cancellationReason,
            },
        }, { new: true }).exec();
    }
}
export const radiologyService = new RadiologyService();
