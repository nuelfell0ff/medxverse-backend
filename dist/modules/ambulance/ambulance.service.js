import { Types } from 'mongoose';
import { AmbulanceModel, TripRequestModel } from './ambulance.model.js';
import { VehicleStatus, TripStatus, } from './ambulance.types.js';
export class AmbulanceService {
    async addAmbulance(input) {
        return AmbulanceModel.create({
            ...input,
            hospitalId: new Types.ObjectId(input.hospitalId),
            primaryDriverId: input.primaryDriverId ? new Types.ObjectId(input.primaryDriverId) : undefined,
            lastMaintenanceDate: input.lastMaintenanceDate ? new Date(input.lastMaintenanceDate) : undefined,
            nextMaintenanceDueDate: input.nextMaintenanceDueDate
                ? new Date(input.nextMaintenanceDueDate)
                : undefined,
        });
    }
    async getAmbulances(hospitalId, query) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(50, Math.max(1, query.limit || 20));
        const skip = (page - 1) * limit;
        const filter = { hospitalId };
        if (query.vehicleType)
            filter.vehicleType = query.vehicleType;
        if (query.status)
            filter.status = query.status;
        if (query.registrationNumber) {
            filter.registrationNumber = { $regex: query.registrationNumber, $options: 'i' };
        }
        const [ambulances, total] = await Promise.all([
            AmbulanceModel.find(filter)
                .populate('primaryDriverId', 'firstName lastName phone')
                .sort({ registrationNumber: 1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            AmbulanceModel.countDocuments(filter),
        ]);
        return {
            ambulances,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    async updateAmbulanceStatus(ambulanceId, hospitalId, input) {
        const updateData = { status: input.status };
        if (input.fuelLevelPercentage !== undefined) {
            updateData.fuelLevelPercentage = input.fuelLevelPercentage;
        }
        if (input.currentLocation) {
            updateData.currentLocation = input.currentLocation;
        }
        if (input.notes) {
            updateData.notes = input.notes;
        }
        return AmbulanceModel.findOneAndUpdate({ _id: ambulanceId, hospitalId }, { $set: updateData }, { new: true }).exec();
    }
    async createTripRequest(input) {
        return TripRequestModel.create({
            ...input,
            hospitalId: new Types.ObjectId(input.hospitalId),
            patientId: input.patientId ? new Types.ObjectId(input.patientId) : undefined,
            requestedById: new Types.ObjectId(input.requestedById),
        });
    }
    async getTripRequests(hospitalId, query) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(50, Math.max(1, query.limit || 20));
        const skip = (page - 1) * limit;
        const filter = { hospitalId };
        if (query.status)
            filter.status = query.status;
        if (query.priority)
            filter.priority = query.priority;
        if (query.patientId)
            filter.patientId = query.patientId;
        if (query.ambulanceId)
            filter.ambulanceId = query.ambulanceId;
        const [requests, total] = await Promise.all([
            TripRequestModel.find(filter)
                .populate('patientId', 'firstName lastName mrn phone')
                .populate('requestedById', 'firstName lastName role')
                .populate('ambulanceId', 'registrationNumber vehicleModel vehicleType')
                .populate('driverId', 'firstName lastName phone')
                .populate('paramedicIds', 'firstName lastName phone')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            TripRequestModel.countDocuments(filter),
        ]);
        return {
            requests,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getTripRequestById(requestId, hospitalId) {
        return TripRequestModel.findOne({ _id: requestId, hospitalId })
            .populate('patientId', 'firstName lastName mrn dateOfBirth gender phone emergencyContact')
            .populate('requestedById', 'firstName lastName role')
            .populate('ambulanceId', 'registrationNumber vehicleModel vehicleType fuelLevelPercentage currentLocation')
            .populate('driverId', 'firstName lastName phone')
            .populate('paramedicIds', 'firstName lastName phone')
            .exec();
    }
    async assignTrip(requestId, hospitalId, input) {
        const ambulanceObjectId = new Types.ObjectId(input.ambulanceId);
        const driverObjectId = new Types.ObjectId(input.driverId);
        const paramedicObjectIds = input.paramedicIds?.map((id) => new Types.ObjectId(id)) || [];
        const trip = await TripRequestModel.findOneAndUpdate({ _id: requestId, hospitalId }, {
            $set: {
                ambulanceId: ambulanceObjectId,
                driverId: driverObjectId,
                paramedicIds: paramedicObjectIds,
                status: TripStatus.DISPATCHED,
                dispatchTime: new Date(),
            },
        }, { new: true }).exec();
        if (trip) {
            await AmbulanceModel.updateOne({ _id: ambulanceObjectId, hospitalId }, { $set: { status: VehicleStatus.DISPATCHED } });
        }
        return trip;
    }
    async updateTripStatus(requestId, hospitalId, input) {
        const trip = await TripRequestModel.findOne({ _id: requestId, hospitalId });
        if (!trip)
            return null;
        trip.status = input.status;
        if (input.clinicalNotes)
            trip.clinicalNotes = input.clinicalNotes;
        if (input.cancellationReason)
            trip.cancellationReason = input.cancellationReason;
        if (input.distanceKm !== undefined)
            trip.distanceKm = input.distanceKm;
        if (input.status === TripStatus.PATIENT_ONBOARD && !trip.pickupTime) {
            trip.pickupTime = new Date();
        }
        if ((input.status === TripStatus.COMPLETED || input.status === TripStatus.CANCELLED) &&
            !trip.completionTime) {
            trip.completionTime = new Date();
            if (trip.ambulanceId) {
                await AmbulanceModel.updateOne({ _id: trip.ambulanceId, hospitalId }, { $set: { status: VehicleStatus.AVAILABLE } });
            }
        }
        else if (trip.ambulanceId && input.status === TripStatus.EN_ROUTE_TO_SCENE) {
            await AmbulanceModel.updateOne({ _id: trip.ambulanceId, hospitalId }, { $set: { status: VehicleStatus.EN_ROUTE } });
        }
        await trip.save();
        return trip;
    }
}
export const ambulanceService = new AmbulanceService();
