import mongoose, { Schema, model } from 'mongoose';
const HmsDashboardSettingsSchema = new Schema({
    hmoId: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
        required: true,
        unique: true,
        index: true,
    },
    defaultTimeframe: {
        type: String,
        enum: ['today', 'this_week', 'this_month', 'this_year'],
        default: 'this_month',
    },
    customWidgets: {
        type: [String],
        default: ['overview', 'pipeline', 'financialSummary'],
    },
    refreshIntervalMinutes: {
        type: Number,
        default: 15,
        min: 1,
        max: 1440,
    },
}, { timestamps: true });
export const HmsDashboardSettingsModel = mongoose.models.HmsDashboardSettings ||
    model('HmsDashboardSettings', HmsDashboardSettingsSchema);
