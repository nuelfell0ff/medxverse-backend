import { Types } from 'mongoose';
import { SavedReportModel } from './reports.model.js';
export class ReportsService {
    static async getExecutiveSummary(hospitalId) {
        const hospitalObjId = new Types.ObjectId(hospitalId);
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        // Dynamic import references to other operational collections via Mongoose connections
        const db = SavedReportModel.db;
        const [totalActivePatients, totalDoctors, totalInpatients, monthlyBilling, bedsCount, occupiedBedsCount, pendingLabOrders, emergencyCasesToday,] = await Promise.all([
            db.collection('patients').countDocuments({ hospitalId: hospitalObjId, isActive: { $ne: false } }),
            db.collection('users').countDocuments({ hospitalId: hospitalObjId, role: 'DOCTOR', isActive: true }),
            db.collection('inpatientadmissions').countDocuments({ hospitalId: hospitalObjId, status: 'ADMITTED' }),
            db.collection('billinginvoices').aggregate([
                {
                    $match: {
                        hospitalId: hospitalObjId,
                        createdAt: { $gte: startOfMonth },
                        status: { $ne: 'CANCELLED' },
                    },
                },
                { $group: { _id: null, total: { $sum: '$paidAmount' } } },
            ]).toArray(),
            db.collection('beds').countDocuments({ hospitalId: hospitalObjId }),
            db.collection('beds').countDocuments({ hospitalId: hospitalObjId, status: 'OCCUPIED' }),
            db.collection('laborders').countDocuments({ hospitalId: hospitalObjId, status: 'PENDING' }),
            db.collection('emergencycases').countDocuments({ hospitalId: hospitalObjId, createdAt: { $gte: startOfToday } }),
        ]);
        const monthlyRevenue = monthlyBilling.length > 0 ? monthlyBilling[0].total : 0;
        const bedOccupancyRate = bedsCount > 0 ? Number(((occupiedBedsCount / bedsCount) * 100).toFixed(2)) : 0;
        return {
            totalActivePatients,
            totalDoctors,
            totalInpatients,
            monthlyRevenue,
            bedOccupancyRate,
            pendingLabOrders,
            emergencyCasesToday,
        };
    }
    static async getRevenueReport(hospitalId, filters) {
        const hospitalObjId = new Types.ObjectId(hospitalId);
        const matchQuery = {
            hospitalId: hospitalObjId,
            status: { $ne: 'CANCELLED' },
        };
        if (filters.startDate || filters.endDate) {
            matchQuery.createdAt = {};
            if (filters.startDate)
                matchQuery.createdAt.$gte = new Date(filters.startDate);
            if (filters.endDate)
                matchQuery.createdAt.$lte = new Date(filters.endDate);
        }
        const db = SavedReportModel.db;
        const invoices = await db.collection('billinginvoices').find(matchQuery).toArray();
        let totalInvoiced = 0;
        let totalPaid = 0;
        const paymentMethodsMap = {};
        invoices.forEach((inv) => {
            totalInvoiced += inv.totalAmount || 0;
            totalPaid += inv.paidAmount || 0;
            if (Array.isArray(inv.payments)) {
                inv.payments.forEach((payment) => {
                    const method = payment.paymentMethod || 'UNKNOWN';
                    paymentMethodsMap[method] = (paymentMethodsMap[method] || 0) + (payment.amount || 0);
                });
            }
        });
        const paymentMethodBreakdown = Object.keys(paymentMethodsMap).map((method) => ({
            method,
            amount: paymentMethodsMap[method],
        }));
        const monthlyAggregation = await db.collection('billinginvoices').aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                    },
                    invoiced: { $sum: '$totalAmount' },
                    paid: { $sum: '$paidAmount' },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]).toArray();
        const monthlyTrend = monthlyAggregation.map((item) => ({
            year: item._id.year,
            month: item._id.month,
            invoiced: item.invoiced,
            paid: item.paid,
        }));
        return {
            totalInvoiced,
            totalPaid,
            totalOutstanding: totalInvoiced - totalPaid,
            paymentMethodBreakdown,
            monthlyTrend,
        };
    }
    static async getBedOccupancyReport(hospitalId) {
        const hospitalObjId = new Types.ObjectId(hospitalId);
        const db = SavedReportModel.db;
        const wards = await db.collection('wards').find({ hospitalId: hospitalObjId }).toArray();
        const beds = await db.collection('beds').find({ hospitalId: hospitalObjId }).toArray();
        const totalBeds = beds.length;
        const occupiedBeds = beds.filter((bed) => bed.status === 'OCCUPIED').length;
        const availableBeds = beds.filter((bed) => bed.status === 'AVAILABLE').length;
        const wardBreakdown = wards.map((ward) => {
            const wardBeds = beds.filter((bed) => bed.wardId.toString() === ward._id.toString());
            const total = wardBeds.length;
            const occupied = wardBeds.filter((bed) => bed.status === 'OCCUPIED').length;
            const occupancyRatePercentage = total > 0 ? Number(((occupied / total) * 100).toFixed(2)) : 0;
            return {
                wardId: ward._id.toString(),
                wardName: ward.name,
                total,
                occupied,
                occupancyRatePercentage,
            };
        });
        return {
            totalBeds,
            occupiedBeds,
            availableBeds,
            occupancyRatePercentage: totalBeds > 0 ? Number(((occupiedBeds / totalBeds) * 100).toFixed(2)) : 0,
            wardBreakdown,
        };
    }
    static async getPatientDemographics(hospitalId) {
        const hospitalObjId = new Types.ObjectId(hospitalId);
        const db = SavedReportModel.db;
        const patients = await db.collection('patients').find({ hospitalId: hospitalObjId }).toArray();
        const totalPatients = patients.length;
        const genderMap = {};
        const ageGroupMap = {
            '0-12': 0,
            '13-19': 0,
            '20-39': 0,
            '40-59': 0,
            '60+': 0,
        };
        const currentYear = new Date().getFullYear();
        patients.forEach((p) => {
            const gender = p.gender || 'UNSPECIFIED';
            genderMap[gender] = (genderMap[gender] || 0) + 1;
            if (p.dob) {
                const birthYear = new Date(p.dob).getFullYear();
                const age = currentYear - birthYear;
                if (age <= 12)
                    ageGroupMap['0-12']++;
                else if (age <= 19)
                    ageGroupMap['13-19']++;
                else if (age <= 39)
                    ageGroupMap['20-39']++;
                else if (age <= 59)
                    ageGroupMap['40-59']++;
                else
                    ageGroupMap['60+']++;
            }
        });
        return {
            totalPatients,
            genderBreakdown: Object.keys(genderMap).map((gender) => ({
                gender,
                count: genderMap[gender],
            })),
            ageGroupBreakdown: Object.keys(ageGroupMap).map((ageGroup) => ({
                ageGroup,
                count: ageGroupMap[ageGroup],
            })),
        };
    }
    static async createSavedReport(hospitalId, userId, dto) {
        const report = new SavedReportModel({
            hospitalId: new Types.ObjectId(hospitalId),
            generatedBy: new Types.ObjectId(userId),
            title: dto.title,
            type: dto.type,
            parameters: dto.parameters,
            summaryData: dto.summaryData,
        });
        return await report.save();
    }
    static async getSavedReports(hospitalId, filters) {
        const page = Number(filters.page) || 1;
        const limit = Number(filters.limit) || 10;
        const skip = (page - 1) * limit;
        const query = {
            hospitalId: new Types.ObjectId(hospitalId),
        };
        if (filters.type) {
            query.type = filters.type;
        }
        const [reports, total] = await Promise.all([
            SavedReportModel.find(query)
                .populate('generatedBy', 'firstName lastName email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            SavedReportModel.countDocuments(query),
        ]);
        return {
            reports,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        };
    }
}
