import mongoose, { Schema } from 'mongoose';
import {
  IAppointmentDocument, AppointmentStatus, AppointmentType, QueuePriority, IProviderScheduleDocument,
  IQueueTicketDocument, IReminderLogDocument, INoShowRiskScoreDocument, ReminderChannel, ReminderStatus, QueueTicketStatus,
} from './appointment.types.js';

const AppointmentSchema = new Schema<IAppointmentDocument>({
  hospitalId:{type:Schema.Types.ObjectId,ref:'Account',required:true,index:true}, patientId:{type:Schema.Types.ObjectId,ref:'Patient',required:true,index:true},
  doctorId:{type:Schema.Types.ObjectId,ref:'Staff',required:true,index:true}, department:{type:String,index:true},
  appointmentDate:{type:Date,required:true,index:true}, startTime:{type:String,required:true}, endTime:{type:String},
  durationMinutes:{type:Number,required:true,min:5},
  occupiedSlotKeys:{type:[String],default:[]}, type:{type:String,enum:Object.values(AppointmentType),default:AppointmentType.CONSULTATION},
  status:{type:String,enum:Object.values(AppointmentStatus),default:AppointmentStatus.SCHEDULED,index:true},
  priority:{type:String,enum:Object.values(QueuePriority),default:QueuePriority.ROUTINE,index:true},
  source:{type:String,enum:['PORTAL','FRONT_DESK','STAFF','WALK_IN'],default:'FRONT_DESK'},
  reason:{type:String},notes:{type:String},noShowRiskScore:{type:Number,min:0,max:1},noShowRiskLevel:{type:String,enum:['LOW','MEDIUM','HIGH']},
  reminderPolicyMinutes:{type:[Number],default:[1440,120]},
},{timestamps:true});
AppointmentSchema.index({hospitalId:1,doctorId:1,appointmentDate:1,occupiedSlotKeys:1},{unique:true,sparse:true});

const ProviderAvailabilitySchema = new Schema({
 dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
 startTime: { type: String, required: true },
 endTime: { type: String, required: true },
}, { _id: false });

const BlockedTimeSchema = new Schema({
 startAt: { type: Date, required: true },
 endAt: { type: Date, required: true },
 reason: { type: String },
}, { _id: false });

const AppointmentRuleSchema = new Schema({
 type: { type: String, enum: Object.values(AppointmentType), required: true },
 durationMinutes: { type: Number, required: true, min: 5 },
 bufferMinutes: { type: Number, min: 0, default: 0 },
}, { _id: false });

const QueueRulesSchema = new Schema({
 appointmentWeight: { type: Number, default: 1 },
 arrivalWeight: { type: Number, default: 1 },
 priorityWeight: { type: Number, default: 10 },
 delayWeight: { type: Number, default: 2 },
}, { _id: false });

const ScheduleSchema=new Schema<IProviderScheduleDocument>({
 hospitalId:{type:Schema.Types.ObjectId,ref:'Account',required:true,index:true},providerId:{type:Schema.Types.ObjectId,ref:'Staff',required:true,index:true},
 department:{type:String,index:true},timezone:{type:String,default:'Africa/Lagos'},
 availability:{type:[ProviderAvailabilitySchema],default:[]},
 blockedTimes:{type:[BlockedTimeSchema],default:[]},
 rules:{type:[AppointmentRuleSchema],default:[]},
 queueRules:{type:QueueRulesSchema,default:()=>({appointmentWeight:1,arrivalWeight:1,priorityWeight:10,delayWeight:2})},
 reminderMinutes:{type:[Number],default:[1440,120]},active:{type:Boolean,default:true,index:true}
},{timestamps:true});
ScheduleSchema.index({hospitalId:1,providerId:1},{unique:true});

const QueueSchema=new Schema<IQueueTicketDocument>({
 hospitalId:{type:Schema.Types.ObjectId,ref:'Account',required:true,index:true},appointmentId:{type:Schema.Types.ObjectId,ref:'Appointment',index:true},
 patientId:{type:Schema.Types.ObjectId,ref:'Patient',required:true,index:true},providerId:{type:Schema.Types.ObjectId,ref:'Staff',required:true,index:true},
 department:{type:String,index:true},ticketNumber:{type:String,required:true},status:{type:String,enum:Object.values(QueueTicketStatus),default:QueueTicketStatus.WAITING,index:true},
 priority:{type:String,enum:Object.values(QueuePriority),default:QueuePriority.ROUTINE,index:true},checkedInAt:{type:Date,default:Date.now,index:true},
 estimatedAppointmentAt:{type:Date},calledAt:{type:Date},completedAt:{type:Date},delayMinutes:{type:Number,default:0},
 sequenceScore:{type:Number,default:0,index:true},position:{type:Number,default:0,index:true},notes:{type:String}
},{timestamps:true});
QueueSchema.index({hospitalId:1,ticketNumber:1},{unique:true});

const ReminderSchema=new Schema<IReminderLogDocument>({
 hospitalId:{type:Schema.Types.ObjectId,ref:'Account',required:true,index:true},appointmentId:{type:Schema.Types.ObjectId,ref:'Appointment',required:true,index:true},
 patientId:{type:Schema.Types.ObjectId,ref:'Patient',required:true,index:true},channel:{type:String,enum:Object.values(ReminderChannel),required:true},
 scheduledFor:{type:Date,required:true,index:true},sentAt:{type:Date},status:{type:String,enum:Object.values(ReminderStatus),default:ReminderStatus.SCHEDULED,index:true},
 template:{type:String},error:{type:String},attempts:{type:Number,default:0}
},{timestamps:true});
ReminderSchema.index({appointmentId:1,channel:1,scheduledFor:1},{unique:true});

const RiskSchema=new Schema<INoShowRiskScoreDocument>({
 hospitalId:{type:Schema.Types.ObjectId,ref:'Account',required:true,index:true},appointmentId:{type:Schema.Types.ObjectId,ref:'Appointment',required:true,index:true},
 patientId:{type:Schema.Types.ObjectId,ref:'Patient',required:true,index:true},score:{type:Number,min:0,max:1,required:true},
 level:{type:String,enum:['LOW','MEDIUM','HIGH'],required:true},factors:{type:[String],default:[]},calculatedAt:{type:Date,default:Date.now}
},{timestamps:true});

export const AppointmentModel=mongoose.models.Appointment||mongoose.model<IAppointmentDocument>('Appointment',AppointmentSchema);
export const ProviderScheduleModel=mongoose.models.ProviderSchedule||mongoose.model<IProviderScheduleDocument>('ProviderSchedule',ScheduleSchema);
export const QueueTicketModel=mongoose.models.QueueTicket||mongoose.model<IQueueTicketDocument>('QueueTicket',QueueSchema);
export const ReminderLogModel=mongoose.models.ReminderLog||mongoose.model<IReminderLogDocument>('ReminderLog',ReminderSchema);
export const NoShowRiskScoreModel=mongoose.models.NoShowRiskScore||mongoose.model<INoShowRiskScoreDocument>('NoShowRiskScore',RiskSchema);
