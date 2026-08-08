import { ambulanceService } from './ambulance.service.js';
export class AmbulanceController {
    async addAmbulance(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const { registrationNumber, vehicleModel, vehicleType, primaryDriverId, fuelLevelPercentage, lastMaintenanceDate, nextMaintenanceDueDate, equipmentList, notes, } = req.body;
            const ambulance = await ambulanceService.addAmbulance({
                hospitalId,
                registrationNumber,
                vehicleModel,
                vehicleType: vehicleType,
                primaryDriverId,
                fuelLevelPercentage,
                lastMaintenanceDate,
                nextMaintenanceDueDate,
                equipmentList,
                notes,
            });
            res.status(201).json({ success: true, data: ambulance });
        }
        catch (error) {
            next(error);
        }
    }
    async getAmbulances(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
            const vehicleType = req.query.vehicleType;
            const status = req.query.status;
            const registrationNumber = req.query.registrationNumber;
            const result = await ambulanceService.getAmbulances(hospitalId, {
                page,
                limit,
                vehicleType,
                status,
                registrationNumber,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async updateAmbulanceStatus(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const { status, fuelLevelPercentage, currentLocation, notes } = req.body;
            const updated = await ambulanceService.updateAmbulanceStatus(id, hospitalId, {
                status: status,
                fuelLevelPercentage,
                currentLocation,
                notes,
            });
            if (!updated) {
                res.status(404).json({ success: false, message: 'Ambulance not found' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
    async createTripRequest(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const requestedById = authReq.user._id;
            const { patientId, priority, pickupLocation, dropoffLocation, clinicalNotes } = req.body;
            const trip = await ambulanceService.createTripRequest({
                hospitalId,
                patientId,
                requestedById,
                priority: priority,
                pickupLocation,
                dropoffLocation,
                clinicalNotes,
            });
            res.status(201).json({ success: true, data: trip });
        }
        catch (error) {
            next(error);
        }
    }
    async getTripRequests(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
            const status = req.query.status;
            const priority = req.query.priority;
            const patientId = req.query.patientId;
            const ambulanceId = req.query.ambulanceId;
            const result = await ambulanceService.getTripRequests(hospitalId, {
                page,
                limit,
                status,
                priority,
                patientId,
                ambulanceId,
            });
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async getTripRequestById(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const trip = await ambulanceService.getTripRequestById(id, hospitalId);
            if (!trip) {
                res.status(404).json({ success: false, message: 'Trip request not found' });
                return;
            }
            res.status(200).json({ success: true, data: trip });
        }
        catch (error) {
            next(error);
        }
    }
    async assignTrip(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const { ambulanceId, driverId, paramedicIds } = req.body;
            const updated = await ambulanceService.assignTrip(id, hospitalId, {
                ambulanceId,
                driverId,
                paramedicIds,
            });
            if (!updated) {
                res.status(404).json({ success: false, message: 'Trip request not found' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
    async updateTripStatus(req, res, next) {
        try {
            const authReq = req;
            const hospitalId = authReq.user.hospitalId;
            const id = req.params.id;
            const { status, cancellationReason, clinicalNotes, distanceKm } = req.body;
            const updated = await ambulanceService.updateTripStatus(id, hospitalId, {
                status: status,
                cancellationReason,
                clinicalNotes,
                distanceKm,
            });
            if (!updated) {
                res.status(404).json({ success: false, message: 'Trip request not found' });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
}
export const ambulanceController = new AmbulanceController();
