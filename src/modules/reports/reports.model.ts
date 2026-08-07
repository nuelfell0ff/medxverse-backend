import { Schema, model } from 'mongoose';
import { ISavedReport, ISavedReportDocument, ReportType } from './reports.types.js';

const SavedReportSchema = new Schema<ISavedReportDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: Object.values(ReportType),
      required: true,
      index: true,
    },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    parameters: { type: Schema.Types.Mixed, default: {} },
    summaryData: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const SavedReportModel = model<ISavedReportDocument>(
  'SavedReport',
  SavedReportSchema
);