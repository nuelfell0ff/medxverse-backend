import { Types } from 'mongoose';
import { StaffUser } from '../staff-auth/staff-user.model.js';
import { Staff } from '../staff/staff.model.js';
import { WorkTaskModel, WorkTicketModel } from '../staff-work/staff-work.model.js';
import { WorkTaskStatus, WorkTicketStatus } from '../staff-work/staff-work.types.js';
import { Conversation, Message } from '../communication/communication.model.js';
function objectId(value, label) {
    if (!Types.ObjectId.isValid(value))
        throw new Error(`Invalid ${label}`);
    return new Types.ObjectId(value);
}
function taskPriority(priority) {
    return priority === 'URGENT' ? 'URGENT' : priority === 'HIGH' ? 'HIGH' : 'MEDIUM';
}
export class StaffNotificationsService {
    static async getFeed(hospitalId, userId, windowMinutes = 24 * 60, limit = 50) {
        const hospitalObjectId = objectId(hospitalId, 'hospital ID');
        const userObjectId = objectId(userId, 'user ID');
        const staffUser = await StaffUser.findOne({
            _id: userObjectId,
            hospitalId: hospitalObjectId,
            isActive: true,
            status: 'ACTIVE',
        }).lean();
        if (!staffUser)
            throw new Error('Active staff account not found');
        const safeWindow = Math.min(7 * 24 * 60, Math.max(15, Number(windowMinutes) || 24 * 60));
        const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
        const now = new Date();
        const dueSoonEnd = new Date(now.getTime() + safeWindow * 60 * 1000);
        const [tasks, unreadMessages, actionableTickets] = await Promise.all([
            WorkTaskModel.find({
                hospitalId: hospitalObjectId,
                assignedTo: staffUser.staffId,
                status: { $in: [WorkTaskStatus.PENDING, WorkTaskStatus.IN_PROGRESS, WorkTaskStatus.OVERDUE] },
                dueAt: { $exists: true, $lte: dueSoonEnd },
            })
                .populate('patientId', 'firstName lastName mrn')
                .sort({ dueAt: 1 })
                .limit(safeLimit)
                .lean(),
            Message.find({
                hospitalId: hospitalObjectId,
                senderUserId: { $ne: userObjectId },
                deletedAt: { $exists: false },
                $nor: [{ readBy: { $elemMatch: { userId: userObjectId } } }],
            })
                .sort({ createdAt: -1 })
                .limit(Math.min(200, safeLimit * 4))
                .populate('senderUserId', 'email role staffId')
                .lean(),
            WorkTicketModel.find({
                hospitalId: hospitalObjectId,
                assignedTo: staffUser.staffId,
                status: {
                    $in: [
                        WorkTicketStatus.OPEN,
                        WorkTicketStatus.ASSIGNED,
                        WorkTicketStatus.IN_PROGRESS,
                        WorkTicketStatus.WAITING,
                    ],
                },
            })
                .sort({ updatedAt: -1 })
                .limit(safeLimit)
                .lean(),
        ]);
        const unreadConversationIds = [...new Set(unreadMessages.map((message) => String(message.conversationId)))];
        const conversations = unreadConversationIds.length
            ? await Conversation.find({
                _id: { $in: unreadConversationIds },
                hospitalId: hospitalObjectId,
                'participants.userId': userObjectId,
            })
                .select('title type patientId departmentId lastMessageAt')
                .populate('patientId', 'firstName lastName mrn')
                .populate('departmentId', 'name code')
                .lean()
            : [];
        const conversationMap = new Map(conversations.map((conversation) => [String(conversation._id), conversation]));
        const senderUserIds = [...new Set(unreadMessages.map((message) => message.senderUserId?._id ? String(message.senderUserId._id) : '').filter(Boolean))];
        const senderUsers = senderUserIds.length
            ? await StaffUser.find({ _id: { $in: senderUserIds }, hospitalId: hospitalObjectId }).select('_id staffId email role').lean()
            : [];
        const senderStaffIds = senderUsers.map((user) => user.staffId).filter(Boolean);
        const senderStaff = senderStaffIds.length
            ? await Staff.find({ _id: { $in: senderStaffIds }, hospitalId: hospitalObjectId }).select('firstName lastName staffId').lean()
            : [];
        const senderStaffMap = new Map(senderStaff.map((staff) => [String(staff._id), staff]));
        const senderUserMap = new Map(senderUsers.map((user) => [String(user._id), user]));
        const unreadByConversation = new Map();
        for (const message of unreadMessages) {
            const key = String(message.conversationId);
            const existing = unreadByConversation.get(key);
            if (existing) {
                existing.count += 1;
            }
            else {
                unreadByConversation.set(key, {
                    conversation: conversationMap.get(key),
                    count: 1,
                    latest: message,
                });
            }
        }
        const items = [];
        for (const task of tasks) {
            if (!task.dueAt)
                continue;
            const dueAt = new Date(task.dueAt);
            const overdue = dueAt.getTime() < now.getTime();
            const patient = task.patientId;
            const patientName = patient
                ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim()
                : '';
            items.push({
                id: `task:${task._id}:${overdue ? 'overdue' : 'due-soon'}`,
                kind: overdue ? 'TASK_OVERDUE' : 'TASK_DUE_SOON',
                title: overdue ? 'Task overdue' : 'Task due soon',
                message: patientName
                    ? `${task.title} — ${patientName}`
                    : String(task.title),
                priority: taskPriority(String(task.priority || 'NORMAL')),
                createdAt: String(task.updatedAt || task.createdAt || now.toISOString()),
                dueAt: dueAt.toISOString(),
                unread: true,
                href: `/staff/tasks?task=${encodeURIComponent(String(task._id))}`,
                data: {
                    taskId: String(task._id),
                    status: task.status,
                    priority: task.priority,
                    patientId: patient?._id ? String(patient._id) : undefined,
                    patientName: patientName || undefined,
                },
            });
        }
        for (const [conversationId, group] of unreadByConversation) {
            const conversation = group.conversation;
            const latest = group.latest;
            if (!conversation)
                continue;
            const patient = conversation.patientId;
            const patientName = patient
                ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim()
                : '';
            const title = conversation.title
                || patientName
                || conversation.departmentId?.name
                || 'Hospital conversation';
            const sender = latest.senderUserId;
            const senderUser = sender?._id ? senderUserMap.get(String(sender._id)) : undefined;
            const senderStaffMember = senderUser?.staffId ? senderStaffMap.get(String(senderUser.staffId)) : undefined;
            const senderName = senderStaffMember
                ? `${senderStaffMember.firstName || ''} ${senderStaffMember.lastName || ''}`.trim()
                : senderUser?.email || sender?.email || 'Staff member';
            items.push({
                id: `message:${conversationId}`,
                kind: 'MESSAGE_UNREAD',
                title: 'Unread message',
                message: `${senderName} sent ${group.count} unread message${group.count === 1 ? '' : 's'} in ${title}.`,
                priority: conversation.priority === 'URGENT' ? 'URGENT' : conversation.priority === 'HIGH' ? 'HIGH' : 'MEDIUM',
                createdAt: new Date(latest.createdAt).toISOString(),
                unread: true,
                href: `/staff/messages?conversation=${encodeURIComponent(conversationId)}`,
                data: {
                    conversationId,
                    unreadCount: group.count,
                    conversationTitle: title,
                },
            });
        }
        for (const ticket of actionableTickets) {
            items.push({
                id: `ticket:${ticket._id}`,
                kind: 'TICKET_ACTION',
                title: 'Ticket needs attention',
                message: `${ticket.ticketNumber}: ${ticket.subject}`,
                priority: String(ticket.priority || 'NORMAL'),
                createdAt: String(ticket.updatedAt || ticket.createdAt || now.toISOString()),
                unread: false,
                href: `/staff/tasks?ticket=${encodeURIComponent(String(ticket._id))}`,
                data: {
                    ticketId: String(ticket._id),
                    ticketNumber: ticket.ticketNumber,
                    status: ticket.status,
                },
            });
        }
        items.sort((a, b) => {
            if (a.kind.startsWith('TASK_') && b.kind.startsWith('TASK_')) {
                return new Date(a.dueAt || a.createdAt).getTime() - new Date(b.dueAt || b.createdAt).getTime();
            }
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        const limitedItems = items.slice(0, safeLimit);
        const dueSoonTasks = tasks.filter((task) => {
            const due = new Date(task.dueAt).getTime();
            return due >= now.getTime() && due <= dueSoonEnd.getTime();
        }).length;
        const overdueTasks = tasks.filter((task) => new Date(task.dueAt).getTime() < now.getTime()).length;
        return {
            items: limitedItems,
            summary: {
                total: limitedItems.length,
                unreadMessages: unreadByConversation.size,
                dueSoonTasks,
                overdueTasks,
                actionableTickets: actionableTickets.length,
            },
            generatedAt: now.toISOString(),
            dueSoonWindowMinutes: safeWindow,
        };
    }
    static async getUnreadCount(hospitalId, userId) {
        const feed = await this.getFeed(hospitalId, userId, 24 * 60, 100);
        return feed.summary.dueSoonTasks + feed.summary.overdueTasks + feed.summary.unreadMessages + feed.summary.actionableTickets;
    }
}
