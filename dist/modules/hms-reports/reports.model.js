import { Schema, model } from 'mongoose';
import { ReportFormat, ReportStatus, ReportType } from './reports.types.js';
const ReportSchema = new Schema({
    hmoId: { type: Schema.Types.ObjectId, required: true, ref: 'HMO', index: true },
    title: { type: String, required: true, trim: true },
    type: {
        type: String,
        enum: Object.values(ReportType),
        required: true,
    },
    format: {
        type: String,
        enum: Object.values(ReportFormat),
        default: ReportFormat.JSON,
    },
    status: {
        type: String,
        enum: Object.values(ReportStatus),
        default: ReportStatus.PENDING,
    },
    parameters: {
        startDate: { type: String },
        endDate: { type: String },
        providerId: { type: String },
        status: { type: String },
    },
    generatedBy: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    fileUrl: { type: String, trim: true },
    dataSummary: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });
ReportSchema.index({ hmoId: 1, type: 1, createdAt: -1 });
export const ReportModel = model('Report', ReportSchema);
