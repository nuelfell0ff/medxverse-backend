import { Schema, model } from 'mongoose';
import { NotificationType, NotificationPriority, NotificationChannel, NotificationStatus, } from './notifications.types.js';
const NotificationSchema = new Schema({
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User' },
    type: {
        type: String,
        enum: Object.values(NotificationType),
        default: NotificationType.GENERAL,
        required: true,
        index: true,
    },
    priority: {
        type: String,
        enum: Object.values(NotificationPriority),
        default: NotificationPriority.MEDIUM,
        required: true,
    },
    channel: {
        type: String,
        enum: Object.values(NotificationChannel),
        default: NotificationChannel.IN_APP,
        required: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    data: { type: Schema.Types.Mixed, default: {} },
    status: {
        type: String,
        enum: Object.values(NotificationStatus),
        default: NotificationStatus.UNREAD,
        required: true,
        index: true,
    },
    readAt: { type: Date },
    expiresAt: { type: Date },
}, { timestamps: true });
// Compound indexes for optimal query execution
NotificationSchema.index({ recipientId: 1, status: 1, createdAt: -1 });
NotificationSchema.index({ hospitalId: 1, recipientId: 1 });
export const NotificationModel = model('Notification', NotificationSchema);
