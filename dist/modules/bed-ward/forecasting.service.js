import { Types } from 'mongoose';
import { BedModel, BedStatusEventModel, OccupancyForecastModel, WardModel } from './bed-ward.model.js';
import { BedStatus } from './bed-ward.types.js';
function objectId(id) {
    if (!Types.ObjectId.isValid(id))
        throw new Error(`Invalid ObjectId: ${id}`);
    return new Types.ObjectId(id);
}
function startOfDay(date) {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    return value;
}
export class OccupancyForecastService {
    async generate(hospitalId, horizonDays = 7, wardId) {
        const hospitalObjectId = objectId(hospitalId);
        const horizon = Math.min(30, Math.max(1, Math.floor(horizonDays)));
        const wards = await WardModel.find({
            hospitalId: hospitalObjectId,
            active: true,
            ...(wardId ? { _id: objectId(wardId) } : {}),
        }).lean().exec();
        const generatedAt = new Date();
        const historyStart = new Date(generatedAt.getTime() - 30 * 24 * 60 * 60 * 1000);
        const forecasts = [];
        for (const ward of wards) {
            const beds = await BedModel.find({ hospitalId: hospitalObjectId, wardId: ward._id }).select('_id status').lean().exec();
            const totalBeds = beds.length;
            if (!totalBeds)
                continue;
            const events = await BedStatusEventModel.find({
                hospitalId: hospitalObjectId,
                wardId: ward._id,
                occurredAt: { $gte: historyStart },
            }).sort({ occurredAt: 1 }).lean().exec();
            const occupiedByDay = new Map();
            const admissionsByDay = new Map();
            const dischargesByDay = new Map();
            // Reconstruct daily occupancy from the event stream. This keeps the
            // forecast based on the same auditable source used by the live board.
            for (const event of events) {
                const key = startOfDay(event.occurredAt).toISOString();
                const previous = occupiedByDay.get(key) ?? 0;
                if (event.toStatus === BedStatus.OCCUPIED && event.fromStatus !== BedStatus.OCCUPIED) {
                    occupiedByDay.set(key, previous + 1);
                    admissionsByDay.set(key, (admissionsByDay.get(key) ?? 0) + 1);
                }
                else if (event.fromStatus === BedStatus.OCCUPIED && event.toStatus !== BedStatus.OCCUPIED) {
                    occupiedByDay.set(key, Math.max(0, previous - 1));
                    dischargesByDay.set(key, (dischargesByDay.get(key) ?? 0) + 1);
                }
                else {
                    occupiedByDay.set(key, previous);
                }
            }
            const dailyValues = Array.from(occupiedByDay.values());
            const averageOccupied = dailyValues.length
                ? dailyValues.reduce((sum, value) => sum + value, 0) / dailyValues.length
                : beds.filter((bed) => bed.status === BedStatus.OCCUPIED).length;
            const admissions = Array.from(admissionsByDay.values());
            const discharges = Array.from(dischargesByDay.values());
            const averageAdmissions = admissions.length ? admissions.reduce((a, b) => a + b, 0) / admissions.length : 0;
            const averageDischarges = discharges.length ? discharges.reduce((a, b) => a + b, 0) / discharges.length : 0;
            // Conservative trend: combine the current occupancy with the 30-day
            // average net daily change and clamp to physical capacity.
            const netDailyChange = averageAdmissions - averageDischarges;
            let projected = beds.filter((bed) => bed.status === BedStatus.OCCUPIED).length;
            const confidence = Math.min(0.95, 0.45 + Math.min(0.5, dailyValues.length / 60));
            for (let day = 1; day <= horizon; day += 1) {
                projected = Math.max(0, Math.min(totalBeds, projected + netDailyChange));
                const date = new Date(generatedAt);
                date.setDate(date.getDate() + day);
                date.setHours(0, 0, 0, 0);
                const forecast = {
                    hospitalId: hospitalObjectId,
                    wardId: ward._id,
                    forecastDate: date,
                    horizonDays: horizon,
                    projectedOccupied: Math.round(projected * 100) / 100,
                    projectedAvailable: Math.round((totalBeds - projected) * 100) / 100,
                    projectedOccupancyRate: totalBeds ? Math.round((projected / totalBeds) * 10000) / 10000 : 0,
                    expectedAdmissions: Math.round(averageAdmissions * 100) / 100,
                    expectedDischarges: Math.round(averageDischarges * 100) / 100,
                    confidence: Math.round(confidence * 100) / 100,
                    methodology: '30-day historical bed-status event moving-average with net-admission trend, clamped to ward capacity.',
                    generatedAt,
                };
                await OccupancyForecastModel.findOneAndUpdate({ hospitalId: hospitalObjectId, wardId: ward._id, forecastDate: date, horizonDays: horizon }, { $set: forecast }, { upsert: true, new: true, setDefaultsOnInsert: true }).exec();
                forecasts.push(forecast);
            }
        }
        return forecasts;
    }
}
export const occupancyForecastService = new OccupancyForecastService();
