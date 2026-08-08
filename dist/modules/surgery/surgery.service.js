import { Types } from 'mongoose';
import { SurgeryCaseModel } from './surgery.model.js';
import { SurgeryStatus, } from './surgery.types.js';
export class SurgeryService {
    async scheduleCase(input) {
        const conflictingCase = await SurgeryCaseModel.findOne({
            hospitalId: input.hospitalId,
            theatreId: input.theatreId,
            status: { $in: [SurgeryStatus.SCHEDULED, SurgeryStatus.IN_PROGRESS] },
            $or: [
                {
                    scheduledStartTime: { $lt: input.scheduledEndTime },
                    scheduledEndTime: { $gt: input.scheduledStartTime },
                },
            ],
        });
        if (conflictingCase) {
            throw new Error(`Operating Theatre ${input.theatreId} is already booked for this time slot.`);
        }
        const surgicalTeam = (input.surgicalTeam || []).map((member) => ({
            userId: new Types.ObjectId(member.userId),
            role: member.role,
            notes: member.notes,
        }));
        return SurgeryCaseModel.create({
            ...input,
            surgicalTeam,
            status: SurgeryStatus.SCHEDULED,
        });
    }
    async getCases(hospitalId, query) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(50, Math.max(1, query.limit || 20));
        const skip = (page - 1) * limit;
        const filter = { hospitalId };
        if (query.status)
            filter.status = query.status;
        if (query.theatreId)
            filter.theatreId = query.theatreId;
        if (query.leadSurgeonId)
            filter.leadSurgeonId = query.leadSurgeonId;
        if (query.patientId)
            filter.patientId = query.patientId;
        if (query.date) {
            const startOfDay = new Date(query.date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(query.date);
            endOfDay.setHours(23, 59, 59, 999);
            filter.scheduledStartTime = { $gte: startOfDay, $lte: endOfDay };
        }
        const [cases, total] = await Promise.all([
            SurgeryCaseModel.find(filter)
                .populate('patientId', 'firstName lastName mrn gender dateOfBirth')
                .populate('leadSurgeonId', 'firstName lastName role')
                .populate('surgicalTeam.userId', 'firstName lastName role')
                .sort({ scheduledStartTime: 1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            SurgeryCaseModel.countDocuments(filter),
        ]);
        return {
            cases,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getCaseById(caseId, hospitalId) {
        return SurgeryCaseModel.findOne({ _id: caseId, hospitalId })
            .populate('patientId', 'firstName lastName mrn gender dateOfBirth')
            .populate('leadSurgeonId', 'firstName lastName role')
            .populate('surgicalTeam.userId', 'firstName lastName role')
            .exec();
    }
    async updateChecklist(caseId, hospitalId, input) {
        const existingCase = await SurgeryCaseModel.findOne({ _id: caseId, hospitalId });
        if (!existingCase)
            return null;
        const checklist = existingCase.checklist || {
            signInCompleted: false,
            timeOutCompleted: false,
            signOutCompleted: false,
        };
        if (input.signInCompleted !== undefined) {
            checklist.signInCompleted = input.signInCompleted;
            if (input.signInCompleted && !checklist.signInCompletedAt) {
                checklist.signInCompletedAt = new Date();
            }
        }
        if (input.timeOutCompleted !== undefined) {
            checklist.timeOutCompleted = input.timeOutCompleted;
            if (input.timeOutCompleted && !checklist.timeOutCompletedAt) {
                checklist.timeOutCompletedAt = new Date();
            }
        }
        if (input.signOutCompleted !== undefined) {
            checklist.signOutCompleted = input.signOutCompleted;
            if (input.signOutCompleted && !checklist.signOutCompletedAt) {
                checklist.signOutCompletedAt = new Date();
            }
        }
        if (input.notes !== undefined) {
            checklist.notes = input.notes;
        }
        return SurgeryCaseModel.findOneAndUpdate({ _id: caseId, hospitalId }, { $set: { checklist } }, { new: true }).exec();
    }
    async startSurgery(caseId, hospitalId) {
        return SurgeryCaseModel.findOneAndUpdate({ _id: caseId, hospitalId, status: SurgeryStatus.SCHEDULED }, {
            $set: {
                status: SurgeryStatus.IN_PROGRESS,
                actualStartTime: new Date(),
            },
        }, { new: true }).exec();
    }
    async completeSurgery(caseId, hospitalId, input) {
        return SurgeryCaseModel.findOneAndUpdate({ _id: caseId, hospitalId, status: SurgeryStatus.IN_PROGRESS }, {
            $set: {
                status: SurgeryStatus.COMPLETED,
                actualEndTime: new Date(),
                anesthesiaNotes: input.anesthesiaNotes,
                operationNotes: input.operationNotes,
                postOpNotes: input.postOpNotes,
            },
        }, { new: true }).exec();
    }
    async cancelCase(caseId, hospitalId, cancellationReason) {
        return SurgeryCaseModel.findOneAndUpdate({ _id: caseId, hospitalId, status: { $ne: SurgeryStatus.COMPLETED } }, {
            $set: {
                status: SurgeryStatus.CANCELLED,
                cancellationReason,
            },
        }, { new: true }).exec();
    }
}
export const surgeryService = new SurgeryService();
