import mongoose, { Schema, model } from 'mongoose';
import { NotificationChannel, NotificationStatus, NotificationType, } from './notifications.types.js';
const NotificationSchema = new Schema({
    hmoId: { type: Schema.Types.ObjectId, required: true, ref: 'HMO', index: true },
    recipientId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
    type: {
        type: String,
        enum: Object.values(NotificationType),
        required: true,
    },
    channel: {
        type: String,
        enum: Object.values(NotificationChannel),
        default: NotificationChannel.IN_APP,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    status: {
        type: String,
        enum: Object.values(NotificationStatus),
        default: NotificationStatus.SENT,
    },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
    metadata: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });
NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
export const NotificationModel = mongoose.models.HMSNotification ||
    model('HMSNotification', NotificationSchema);
