import { Types } from 'mongoose';
import { PatientModel } from '../patient/patient.model.js';
import { Staff } from '../staff/staff.model.js';
import { StaffUser, StaffPresenceStatus } from '../staff-auth/staff-user.model.js';
import { Conversation, Message, Ticket } from './communication.model.js';
import { Department } from './department.model.js';
import {
  ConversationPriority,
  ConversationType,
  MessageType,
  ParticipantType,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from './communication.types.js';
import { communicationEvents } from './communication.events.js';

function oid(value: string, label: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) throw new Error(`Invalid ${label}`);
  return new Types.ObjectId(value);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map(String))];
}

async function ensureStaffUserInHospital(userId: string, hospitalId: string) {
  const user = await StaffUser.findOne({ _id: userId, hospitalId, isActive: true, status: 'ACTIVE' }).lean();
  if (!user) throw new Error('Staff member is not active or does not belong to this hospital');
  return user;
}

async function ensurePatientInHospital(patientId: string, hospitalId: string) {
  const patient = await PatientModel.findOne({ _id: patientId, hospitalId, active: true }).lean();
  if (!patient) throw new Error('Patient not found in this hospital');
  return patient;
}

export class CommunicationService {
  static async listInbox(hospitalId: string, userId: string, page = 1, limit = 30) {
    const h = oid(hospitalId, 'hospital ID');
    const u = oid(userId, 'user ID');
    await ensureStaffUserInHospital(userId, hospitalId);

    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const [items, total] = await Promise.all([
      Conversation.find({ hospitalId: h, 'participants.userId': u, archivedAt: { $exists: false } })
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .populate('departmentId', 'name code')
        .populate('patientId', 'firstName lastName mrn phone')
        .lean(),
      Conversation.countDocuments({ hospitalId: h, 'participants.userId': u, archivedAt: { $exists: false } }),
    ]);

    const conversationIds = items.map((item) => item._id);
    const unread = conversationIds.length
      ? await Message.aggregate([
          {
            $match: {
              hospitalId: h,
              conversationId: { $in: conversationIds },
              senderUserId: { $ne: u },
              deletedAt: { $exists: false },
              $nor: [{ readBy: { $elemMatch: { userId: u } } }],
            },
          },
          { $group: { _id: '$conversationId', count: { $sum: 1 } } },
        ])
      : [];

    const unreadMap = new Map(unread.map((row: any) => [String(row._id), row.count]));
    return {
      items: items.map((item: any) => ({ ...item, unreadCount: unreadMap.get(String(item._id)) || 0 })),
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.ceil(total / safeLimit),
    };
  }

  static async setPresence(hospitalId: string, userId: string, status: StaffPresenceStatus) {
    await ensureStaffUserInHospital(userId, hospitalId);
    if (!Object.values(StaffPresenceStatus).includes(status)) throw new Error('Invalid presence status');
    return StaffUser.findOneAndUpdate({ _id: userId, hospitalId }, { $set: { presenceStatus: status, lastSeenAt: new Date() } }, { new: true }).select('_id presenceStatus lastSeenAt').lean();
  }

  static async myPatients(hospitalId: string, userId: string, search?: string) {
    await ensureStaffUserInHospital(userId, hospitalId);
    const conversations = await Conversation.find({
      hospitalId,
      patientId: { $exists: true },
      'participants.userId': userId,
    }).select('patientId lastMessageAt priority title').sort({ lastMessageAt: -1 }).lean();

    const ids = [...new Set(conversations.map((c: any) => String(c.patientId)).filter(Boolean))];
    if (!ids.length) return [];
    const query: any = { hospitalId, _id: { $in: ids }, active: true };
    if (search?.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      query.$or = [{ firstName: regex }, { lastName: regex }, { mrn: regex }, { phone: regex }];
    }
    const patients = await PatientModel.find(query).select('firstName lastName mrn phone gender dateOfBirth isFlagged flagReason').lean();
    const byId = new Map(patients.map((p: any) => [String(p._id), p]));
    return conversations
      .map((c: any) => ({ patient: byId.get(String(c.patientId)), lastMessageAt: c.lastMessageAt, priority: c.priority, conversationId: c._id }))
      .filter((item: any) => item.patient);
  }

  static async searchMessages(hospitalId: string, userId: string, search: string, limit = 50) {
    await ensureStaffUserInHospital(userId, hospitalId);
    if (!search?.trim()) throw new Error('Search text is required');
    const conversations = await Conversation.find({ hospitalId, 'participants.userId': userId }).select('_id').lean();
    const ids = conversations.map((c) => c._id);
    if (!ids.length) return [];
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return Message.find({ hospitalId, conversationId: { $in: ids }, body: { $regex: escaped, $options: 'i' }, deletedAt: { $exists: false } })
      .sort({ createdAt: -1 }).limit(Math.min(100, Math.max(1, limit))).lean();
  }

  static async searchStaff(hospitalId: string, userId: string, search: string, limit = 30) {
    await ensureStaffUserInHospital(userId, hospitalId);
    const safe = search.trim();
    if (safe.length < 2) throw new Error('Search must contain at least 2 characters');
    const regex = new RegExp(safe.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const users = await StaffUser.find({
      hospitalId,
      isActive: true,
      status: 'ACTIVE',
      $or: [{ email: regex }, { role: regex }],
    }).limit(Math.min(50, limit)).lean();

    const staffIds = users.map((u) => u.staffId);
    const staff = await Staff.find({ _id: { $in: staffIds }, hospitalId }).select('firstName lastName staffId role jobTitle profilePhotoUrl employment.departmentId').lean();
    const byStaff = new Map(staff.map((s: any) => [String(s._id), s]));

    return users.map((user: any) => ({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      staff: byStaff.get(String(user.staffId)),
    }));
  }

  static async createDirectConversation(hospitalId: string, creatorId: string, targetUserId: string) {
    const creator = await ensureStaffUserInHospital(creatorId, hospitalId);
    const target = await ensureStaffUserInHospital(targetUserId, hospitalId);
    if (String(creator._id) === String(target._id)) throw new Error('You cannot create a direct conversation with yourself');

    const directKey = [String(creator._id), String(target._id)].sort().join(':');
    let conversation = await Conversation.findOne({ hospitalId, type: ConversationType.DIRECT, directKey });
    if (conversation) return conversation;

    try {
      conversation = await Conversation.create({
        hospitalId,
        type: ConversationType.DIRECT,
        directKey,
        participants: [
          { type: ParticipantType.STAFF, userId: creator._id, joinedAt: new Date() },
          { type: ParticipantType.STAFF, userId: target._id, joinedAt: new Date() },
        ],
        createdBy: creator._id,
        priority: ConversationPriority.NORMAL,
      });
      return conversation;
    } catch (error: any) {
      if (error?.code === 11000) return Conversation.findOne({ hospitalId, type: ConversationType.DIRECT, directKey });
      throw error;
    }
  }

  static async createGroupConversation(hospitalId: string, creatorId: string, title: string, memberIds: string[]) {
    const creator = await ensureStaffUserInHospital(creatorId, hospitalId);
    if (!title?.trim()) throw new Error('Group title is required');
    const ids = uniqueStrings([creatorId, ...memberIds]);
    if (ids.length < 2) throw new Error('A group must contain at least two staff members');

    const users = await StaffUser.find({ hospitalId, _id: { $in: ids }, isActive: true, status: 'ACTIVE' }).select('_id').lean();
    if (users.length !== ids.length) throw new Error('One or more selected staff members do not belong to this hospital');

    return Conversation.create({
      hospitalId,
      type: ConversationType.GROUP,
      title: title.trim(),
      participants: ids.map((id) => ({ type: ParticipantType.STAFF, userId: id, joinedAt: new Date() })),
      createdBy: creator._id,
      priority: ConversationPriority.NORMAL,
    });
  }

  static async createDepartment(hospitalId: string, creatorId: string, name: string, code: string, description?: string) {
    await ensureStaffUserInHospital(creatorId, hospitalId);
    if (!name?.trim() || !code?.trim()) throw new Error('Department name and code are required');
    return Department.create({ hospitalId, name: name.trim(), code: code.trim().toUpperCase(), description, createdBy: creatorId });
  }

  static async listDepartments(hospitalId: string, userId: string) {
    await ensureStaffUserInHospital(userId, hospitalId);
    return Department.find({ hospitalId, isActive: true }).sort({ name: 1 }).lean();
  }

  static async createDepartmentConversation(hospitalId: string, creatorId: string, departmentId: string, title?: string) {
    const creator = await ensureStaffUserInHospital(creatorId, hospitalId);
    const department = await Department.findOne({ _id: departmentId, hospitalId, isActive: true }).lean();
    if (!department) throw new Error('Department not found in this hospital');

    const existing = await Conversation.findOne({ hospitalId, type: ConversationType.DEPARTMENT, departmentId });
    if (existing) {
      const isMember = existing.participants.some((p) => String(p.userId) === String(creator._id));
      if (!isMember) {
        existing.participants.push({ type: ParticipantType.STAFF, userId: creator._id, joinedAt: new Date() });
        await existing.save();
      }
      return existing;
    }

    return Conversation.create({
      hospitalId,
      type: ConversationType.DEPARTMENT,
      title: title?.trim() || department.name,
      departmentId: department._id,
      participants: [{ type: ParticipantType.STAFF, userId: creator._id, joinedAt: new Date() }],
      createdBy: creator._id,
      priority: ConversationPriority.NORMAL,
    });
  }

  static async createPatientCareConversation(hospitalId: string, creatorId: string, patientId: string, memberIds: string[], title?: string) {
    const creator = await ensureStaffUserInHospital(creatorId, hospitalId);
    const patient = await ensurePatientInHospital(patientId, hospitalId);
    const ids = uniqueStrings([creatorId, ...memberIds]);
    const users = await StaffUser.find({ hospitalId, _id: { $in: ids }, isActive: true, status: 'ACTIVE' }).select('_id').lean();
    if (users.length !== ids.length) throw new Error('One or more staff members do not belong to this hospital');

    const conversation = await Conversation.create({
      hospitalId,
      type: ConversationType.PATIENT_CARE,
      title: title?.trim() || `${patient.firstName} ${patient.lastName} Care Team`,
      patientId: patient._id,
      participants: ids.map((id) => ({ type: ParticipantType.STAFF, userId: id, joinedAt: new Date() })),
      createdBy: creator._id,
      priority: ConversationPriority.NORMAL,
    });

    return conversation;
  }

  static async getConversation(hospitalId: string, userId: string, conversationId: string) {
    const user = await ensureStaffUserInHospital(userId, hospitalId);
    const conversation = await Conversation.findOne({
      _id: conversationId,
      hospitalId,
      'participants.userId': user._id,
    })
      .populate('departmentId', 'name code')
      .populate('patientId', 'firstName lastName mrn phone gender dateOfBirth')
      .lean();
    if (!conversation) throw new Error('Conversation not found or access denied');
    return conversation;
  }

  static async listMessages(hospitalId: string, userId: string, conversationId: string, page = 1, limit = 50) {
    await this.getConversation(hospitalId, userId, conversationId);
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const [messages, total] = await Promise.all([
      Message.find({ hospitalId, conversationId, deletedAt: { $exists: false } })
        .sort({ createdAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean(),
      Message.countDocuments({ hospitalId, conversationId, deletedAt: { $exists: false } }),
    ]);
    return { items: messages.reverse(), page: safePage, limit: safeLimit, total, pages: Math.ceil(total / safeLimit) };
  }

  static async sendMessage(hospitalId: string, senderId: string, conversationId: string, body: string, type = MessageType.TEXT, attachments: any[] = []) {
    const conversation = await this.getConversation(hospitalId, senderId, conversationId);
    if (type === MessageType.TEXT && !body?.trim()) throw new Error('Message body is required');
    if (type !== MessageType.TEXT && !attachments.length && !body?.trim()) throw new Error('Message content or attachment is required');

    const sender = await ensureStaffUserInHospital(senderId, hospitalId);
    const message = await Message.create({
      hospitalId,
      conversationId: conversation._id,
      senderType: ParticipantType.STAFF,
      senderUserId: sender._id,
      body: body?.trim() || undefined,
      type,
      attachments,
      readBy: [{ userId: sender._id, readAt: new Date() }],
    });

    const preview = body?.trim() ? body.trim().slice(0, 200) : `[${type.toLowerCase()}]`;
    await Conversation.updateOne(
      { _id: conversation._id, hospitalId },
      { $set: { lastMessageAt: new Date(), lastMessagePreview: preview } }
    );

    const recipientIds = conversation.participants
      .filter((p: any) => p.userId && String(p.userId) !== String(sender._id))
      .map((p: any) => String(p.userId));

    communicationEvents.emit('event', {
      type: 'message.created',
      hospitalId,
      userIds: recipientIds,
      conversationId: String(conversation._id),
      messageId: String(message._id),
      payload: message.toObject(),
      occurredAt: new Date().toISOString(),
    });

    return message;
  }

  static async markConversationRead(hospitalId: string, userId: string, conversationId: string) {
    const conversation = await this.getConversation(hospitalId, userId, conversationId);
    const now = new Date();
    await Message.updateMany(
      { hospitalId, conversationId: conversation._id, 'readBy.userId': { $ne: oid(userId, 'user ID') } },
      { $push: { readBy: { userId, readAt: now } } }
    );
    await Conversation.updateOne(
      { _id: conversation._id, hospitalId, 'participants.userId': userId },
      { $set: { 'participants.$.lastReadAt': now } }
    );
    communicationEvents.emit('event', {
      type: 'conversation.read',
      hospitalId,
      userIds: conversation.participants.filter((p: any) => p.userId).map((p: any) => String(p.userId)),
      conversationId: String(conversation._id),
      payload: { userId, readAt: now.toISOString() },
      occurredAt: now.toISOString(),
    });
    return { readAt: now };
  }

  static async joinDepartmentConversation(hospitalId: string, userId: string, conversationId: string) {
    const user = await ensureStaffUserInHospital(userId, hospitalId);
    const conversation = await Conversation.findOne({
      _id: conversationId,
      hospitalId,
      type: ConversationType.DEPARTMENT,
    });
    if (!conversation) throw new Error('Department conversation not found');
    if (conversation.participants.some((p: any) => String(p.userId) === String(user._id))) return conversation;

    if (conversation.departmentId) {
      const staff = await Staff.findOne({
        _id: user.staffId,
        hospitalId,
        'employment.departmentId': conversation.departmentId,
      }).select('_id').lean();
      if (!staff && user.role !== 'HOSPITAL_ADMIN') {
        throw new Error('You are not assigned to this department');
      }
    }

    conversation.participants.push({ type: ParticipantType.STAFF, userId: user._id, joinedAt: new Date() });
    await conversation.save();
    return conversation;
  }

  static async updateTicket(hospitalId: string, actorId: string, ticketId: string, input: any) {
    await ensureStaffUserInHospital(actorId, hospitalId);
    const ticket = await Ticket.findOne({ _id: ticketId, hospitalId });
    if (!ticket) throw new Error('Ticket not found');

    if (input.assignedTo !== undefined) {
      if (input.assignedTo === null || input.assignedTo === '') {
        ticket.assignedTo = undefined;
      } else {
        const assignee = await ensureStaffUserInHospital(String(input.assignedTo), hospitalId);
        ticket.assignedTo = assignee._id;
      }
    }
    if (input.assignedDepartmentId !== undefined) {
      if (input.assignedDepartmentId === null || input.assignedDepartmentId === '') {
        ticket.assignedDepartmentId = undefined;
      } else {
        const department = await Department.findOne({ _id: input.assignedDepartmentId, hospitalId, isActive: true }).lean();
        if (!department) throw new Error('Assigned department not found in this hospital');
        ticket.assignedDepartmentId = department._id;
      }
    }
    if (input.status) ticket.status = input.status;
    if (input.priority) ticket.priority = input.priority;
    if (input.category) ticket.category = input.category;
    if (input.description !== undefined) ticket.description = String(input.description);
    if (input.escalationReason !== undefined) ticket.escalationReason = String(input.escalationReason);

    if (ticket.status === TicketStatus.RESOLVED && !ticket.resolvedAt) ticket.resolvedAt = new Date();
    if (ticket.status === TicketStatus.CLOSED && !ticket.closedAt) ticket.closedAt = new Date();
    if (ticket.priority === TicketPriority.CRITICAL || ticket.priority === TicketPriority.HIGH) {
      ticket.escalatedAt ||= new Date();
    }

    await ticket.save();
    communicationEvents.emit('event', {
      type: 'ticket.updated',
      hospitalId,
      userIds: [String(actorId), ...(ticket.assignedTo ? [String(ticket.assignedTo)] : [])],
      ticketId: String(ticket._id),
      payload: ticket.toObject(),
      occurredAt: new Date().toISOString(),
    });
    return ticket;
  }

  static async createTicket(hospitalId: string, creatorId: string, input: any) {
    await ensureStaffUserInHospital(creatorId, hospitalId);
    if (input.conversationId) await this.getConversation(hospitalId, creatorId, input.conversationId);
    if (input.patientId) await ensurePatientInHospital(input.patientId, hospitalId);
    if (input.assignedTo) await ensureStaffUserInHospital(input.assignedTo, hospitalId);
    if (input.assignedDepartmentId) {
      const department = await Department.findOne({ _id: input.assignedDepartmentId, hospitalId, isActive: true }).lean();
      if (!department) throw new Error('Assigned department not found in this hospital');
    }

    const ticket = await Ticket.create({
      hospitalId,
      conversationId: input.conversationId,
      patientId: input.patientId,
      subject: input.subject,
      category: input.category || TicketCategory.GENERAL,
      priority: input.priority || TicketPriority.MEDIUM,
      status: TicketStatus.OPEN,
      assignedTo: input.assignedTo,
      assignedDepartmentId: input.assignedDepartmentId,
      createdBy: creatorId,
      description: input.description,
      escalationReason: input.escalationReason,
      ...(input.priority === TicketPriority.CRITICAL || input.priority === TicketPriority.HIGH ? { escalatedAt: new Date(), escalationReason: input.escalationReason || 'High priority ticket' } : {}),
    });

    communicationEvents.emit('event', {
      type: 'ticket.created',
      hospitalId,
      userIds: input.assignedTo ? [String(input.assignedTo)] : undefined,
      ticketId: String(ticket._id),
      conversationId: input.conversationId,
      payload: ticket.toObject(),
      occurredAt: new Date().toISOString(),
    });
    return ticket;
  }

  static async listTickets(hospitalId: string, userId: string, filters: any = {}) {
    await ensureStaffUserInHospital(userId, hospitalId);
    const query: Record<string, any> = { hospitalId };
    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    if (filters.category) query.category = filters.category;
    if (filters.assignedTo) query.assignedTo = filters.assignedTo;
    if (filters.patientId) query.patientId = filters.patientId;

    return Ticket.find(query)
      .sort({ priority: -1, updatedAt: -1 })
      .populate('patientId', 'firstName lastName mrn')
      .populate('assignedTo', 'email role')
      .populate('assignedDepartmentId', 'name code')
      .lean();
  }
}
