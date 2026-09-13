import { Types } from 'mongoose';
import {
  AppointmentModel, ProviderScheduleModel, QueueTicketModel, ReminderLogModel, NoShowRiskScoreModel,
} from './appointment.model.js';
import {
  AppointmentStatus, AppointmentType, QueuePriority, QueueTicketStatus, ReminderChannel, ReminderStatus,
  CreateAppointmentDTO, RescheduleAppointmentDTO, UpdateAppointmentStatusDTO, GetAppointmentsQueryDTO,
  CreateScheduleDTO, CheckInDTO, CreateWalkInQueueDTO, QueueQueryDTO, IQueueRules,
  IProviderSchedule, IAppointment, IAppointmentDocument, IQueueTicket,
} from './appointment.types.js';
import { publishAppointmentEvent } from './appointment.events.js';
// Ensure referenced models are registered before Mongoose populate is used.
import '../patient/patient.model.js';
import '../staff/staff.model.js';

const priorityValue: Record<QueuePriority, number> = {
  [QueuePriority.ROUTINE]: 0, [QueuePriority.PRIORITY]: 50, [QueuePriority.URGENT]: 100, [QueuePriority.EMERGENCY]: 200,
};
const DEFAULT_RULES: IQueueRules = { appointmentWeight: 1, arrivalWeight: 1, priorityWeight: 10, delayWeight: 2 };
const err=(message:string,statusCode=400)=>Object.assign(new Error(message),{statusCode});

function oid(value:string, label:string){ if(!Types.ObjectId.isValid(value)) throw err(`Invalid ${label} provided.`); return new Types.ObjectId(value); }
function parseTime(t:string){ const m=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(t); if(!m) throw err('Time must use HH:mm format.'); return Number(m[1])*60+Number(m[2]); }
function combine(date:string|Date,time:string){ const d=typeof date==='string'?date.slice(0,10):date.toISOString().slice(0,10); parseTime(time); const x=new Date(`${d}T${time}:00`); if(Number.isNaN(x.getTime())) throw err('Invalid appointment date/time.'); return x; }
function slots(start:string,end:string){ const a=parseTime(start),b=parseTime(end); if(b<=a) throw err('Appointment end time must be after start time.'); const out:string[]=[]; for(let m=a;m<b;m+=5) out.push(String(m).padStart(4,'0')); return out; }
function addMinutes(start:string,minutes:number){ const d=parseTime(start)+minutes; if(d>=1440) throw err('Appointment cannot extend beyond the day.'); return `${String(Math.floor(d/60)).padStart(2,'0')}:${String(d%60).padStart(2,'0')}`; }
function dayOfWeek(date:string|Date){ return new Date(typeof date==='string'?`${date.slice(0,10)}T00:00:00`:date).getDay(); }
function scoreLevel(score:number):'LOW'|'MEDIUM'|'HIGH'{ return score>=0.65?'HIGH':score>=0.35?'MEDIUM':'LOW'; }

export class AppointmentService {
  static async createAppointment(hospitalId:string,dto:CreateAppointmentDTO){
    const h=oid(hospitalId,'Hospital ID'), patientId=oid(dto.patientId,'Patient ID'), doctorId=oid(dto.doctorId,'Doctor ID');
    if(!dto.type || !Object.values(AppointmentType).includes(dto.type)) throw err('Invalid appointment type.');
    const schedule=await ProviderScheduleModel.findOne({hospitalId:h,providerId:doctorId,active:true}).lean() as unknown as IProviderSchedule | null;
    if(!schedule) throw err('No active provider schedule is configured for this provider.',409);
    const start=parseTime(dto.startTime);
    const day=dayOfWeek(dto.appointmentDate);
    const availability=(schedule.availability||[]).filter((x:any)=>x.dayOfWeek===day);
    if(!availability.some((x:any)=>start>=parseTime(x.startTime)&&start<parseTime(x.endTime))) throw err('Requested time is outside provider availability.',409);
    const rule=(schedule.rules||[]).find((x:any)=>x.type===dto.type) || {durationMinutes:30,bufferMinutes:0};
    const duration=dto.endTime?parseTime(dto.endTime)-start:Number(rule.durationMinutes||30);
    if(duration<5) throw err('Appointment duration must be at least 5 minutes.');
    const end=dto.endTime || addMinutes(dto.startTime,duration);
    const startAt=combine(dto.appointmentDate,dto.startTime), endAt=combine(dto.appointmentDate,end);
    for(const b of (schedule.blockedTimes||[]) as any[]) {
      if(startAt < new Date(b.endAt) && endAt > new Date(b.startAt)) throw err('Requested time overlaps provider blocked time.',409);
    }
    const existing=await AppointmentModel.findOne({
      hospitalId:h,doctorId,appointmentDate:{$gte:new Date(`${dto.appointmentDate.slice(0,10)}T00:00:00`),$lt:new Date(`${dto.appointmentDate.slice(0,10)}T23:59:59.999`)},
      status:{$in:[AppointmentStatus.SCHEDULED,AppointmentStatus.CHECKED_IN,AppointmentStatus.IN_PROGRESS]},
      $or:[{startTime:{$lt:end},endTime:{$gt:dto.startTime}}],
    }).lean() as unknown as IAppointment | null;
    if(existing && dto.source!=='STAFF') throw err('Provider already has an overlapping appointment.',409);

    const risk=await this.calculateNoShowRisk(hospitalId,dto.patientId);
    const occupiedSlotKeys=slots(dto.startTime,end);
    let appointment;
    try {
      appointment=await AppointmentModel.create({
        hospitalId:h,patientId,doctorId,department:dto.department||schedule.department,appointmentDate:new Date(dto.appointmentDate),
        startTime:dto.startTime,endTime:end,durationMinutes:duration,type:dto.type,status:AppointmentStatus.SCHEDULED,
        priority:dto.priority||QueuePriority.ROUTINE,source:dto.source||'FRONT_DESK',reason:dto.reason,notes:dto.notes,
        noShowRiskScore:risk.score,noShowRiskLevel:risk.level,reminderPolicyMinutes:dto.reminderPolicyMinutes||schedule.reminderMinutes||[1440,120],
        occupiedSlotKeys,
      } as any);
    } catch(e:any) {
      if(e?.code===11000) throw err('That provider slot was just booked by another request. Please choose another time.',409);
      throw e;
    }
    await this.scheduleReminders(hospitalId,appointment._id.toString(),dto.patientId,appointment.appointmentDate,dto.startTime,
      appointment.reminderPolicyMinutes||[]);
    await this.persistRisk(hospitalId,appointment._id.toString(),dto.patientId,risk);
    const result=await this.getAppointmentById(hospitalId,appointment._id.toString());
    publishAppointmentEvent('appointment.created',hospitalId,result);
    return result;
  }

  static async createOrUpdateSchedule(hospitalId:string,dto:CreateScheduleDTO){
    const h=oid(hospitalId,'Hospital ID'), providerId=oid(dto.providerId,'Provider ID');
    if(!dto.availability?.length) throw err('At least one provider availability window is required.');
    const queueRules={...DEFAULT_RULES,...(dto.queueRules||{})};
    return ProviderScheduleModel.findOneAndUpdate(
      {hospitalId:h,providerId},{ $set:{hospitalId:h,providerId,department:dto.department,timezone:dto.timezone||'Africa/Lagos',
      availability:dto.availability,blockedTimes:dto.blockedTimes||[],rules:dto.rules||[],queueRules,
      reminderMinutes:dto.reminderMinutes||[1440,120],active:dto.active!==false}}, {new:true,upsert:true,setDefaultsOnInsert:true}
    ).lean();
  }

  static async getSchedule(hospitalId:string,providerId:string){ return ProviderScheduleModel.findOne({hospitalId:oid(hospitalId,'Hospital ID'),providerId:oid(providerId,'Provider ID')}).lean(); }

  static async reschedule(hospitalId:string,appointmentId:string,dto:RescheduleAppointmentDTO){
    const h=oid(hospitalId,'Hospital ID'), id=oid(appointmentId,'Appointment ID');
    const current=await AppointmentModel.findOne({_id:id,hospitalId:h});
    if(!current) throw err('Appointment record not found.',404);
    if([AppointmentStatus.CANCELLED,AppointmentStatus.COMPLETED,AppointmentStatus.NO_SHOW].includes(current.status)) throw err('Appointment cannot be rescheduled in its current status.',409);
    const schedule=await ProviderScheduleModel.findOne({hospitalId:h,providerId:current.doctorId,active:true}).lean() as unknown as IProviderSchedule | null;
    if(!schedule) throw err('No active provider schedule is configured.',409);
    const rule=(schedule.rules||[]).find((x:any)=>x.type===current.type) || {durationMinutes:current.durationMinutes};
    const end=dto.endTime||addMinutes(dto.startTime,Number(rule.durationMinutes||30));
    const startAt=combine(dto.appointmentDate,dto.startTime),endAt=combine(dto.appointmentDate,end);
    const conflict=await AppointmentModel.findOne({_id:{$ne:id},hospitalId:h,doctorId:current.doctorId,appointmentDate:{$gte:new Date(`${dto.appointmentDate.slice(0,10)}T00:00:00`),$lt:new Date(`${dto.appointmentDate.slice(0,10)}T23:59:59.999`)},status:{$in:[AppointmentStatus.SCHEDULED,AppointmentStatus.CHECKED_IN,AppointmentStatus.IN_PROGRESS]},$or:[{startTime:{$lt:end},endTime:{$gt:dto.startTime}}]}).lean();
    if(conflict) throw err('Requested reschedule overlaps another appointment.',409);
    try {
      current.appointmentDate=new Date(dto.appointmentDate); current.startTime=dto.startTime; current.endTime=end;
      (current as any).occupiedSlotKeys=slots(dto.startTime,end);
      await current.save();
    } catch(e:any){ if(e?.code===11000) throw err('That provider slot was just booked by another request.',409); throw e; }
    await ReminderLogModel.updateMany({appointmentId:id,status:ReminderStatus.SCHEDULED},{$set:{status:ReminderStatus.CANCELLED}});
    await this.scheduleReminders(hospitalId,appointmentId,current.patientId.toString(),current.appointmentDate,current.startTime,current.reminderPolicyMinutes||[]);
    const result=await this.getAppointmentById(hospitalId,appointmentId);
    publishAppointmentEvent('appointment.updated',hospitalId,result);
    return result;
  }

  static async cancel(hospitalId:string,appointmentId:string,notes?:string){
    return this.updateStatus(hospitalId,appointmentId,{status:AppointmentStatus.CANCELLED,notes});
  }

  static async checkIn(hospitalId:string,appointmentId:string,dto:CheckInDTO={}){
    const h=oid(hospitalId,'Hospital ID'), id=oid(appointmentId,'Appointment ID');
    const appt=await AppointmentModel.findOneAndUpdate({_id:id,hospitalId:h,status:AppointmentStatus.SCHEDULED},
      {$set:{status:AppointmentStatus.CHECKED_IN,...(dto.priority&&{priority:dto.priority}),...(dto.notes!==undefined&&{notes:dto.notes})}},
      {new:true}).lean() as unknown as IAppointmentDocument | null;
    if(!appt) throw err('Appointment not found or is not eligible for check-in.',409);
    const ticket=await this.createQueueTicket(hospitalId,appt._id.toString(),appt.patientId.toString(),appt.doctorId.toString(),appt.department,appt.priority,dto.notes);
    publishAppointmentEvent('queue.ticket.created',hospitalId,ticket);
    return ticket;
  }

  static async createWalkInQueue(hospitalId:string,dto:CreateWalkInQueueDTO){
    return this.createQueueTicket(hospitalId,undefined,dto.patientId,dto.providerId,dto.department,dto.priority||QueuePriority.PRIORITY,dto.notes);
  }

  private static async createQueueTicket(hospitalId:string,appointmentId:string|undefined,patientId:string,providerId:string,department:string|undefined,priority:QueuePriority,notes?:string){
    const h=oid(hospitalId,'Hospital ID'), p=oid(patientId,'Patient ID'), d=oid(providerId,'Provider ID');
    const existing=appointmentId?await QueueTicketModel.findOne({hospitalId:h,appointmentId:oid(appointmentId,'Appointment ID'),status:{$in:[QueueTicketStatus.WAITING,QueueTicketStatus.CALLED,QueueTicketStatus.IN_SERVICE]}}):null;
    if(existing) return this.getQueue(hospitalId,{providerId,department});
    const count=await QueueTicketModel.countDocuments({hospitalId:h,checkedInAt:{$gte:new Date(new Date().setHours(0,0,0,0))}});
    const ticketNumber=`${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(count+1).padStart(3,'0')}`;
    const linkedAppointment=appointmentId?await AppointmentModel.findOne({_id:oid(appointmentId,'Appointment ID'),hospitalId:h}).lean() as unknown as IAppointment | null:null;
    const estimatedAppointmentAt=linkedAppointment?combine(linkedAppointment.appointmentDate,linkedAppointment.startTime):undefined;
    const ticket=await QueueTicketModel.create({hospitalId:h,appointmentId:appointmentId?oid(appointmentId,'Appointment ID'):undefined,patientId:p,providerId:d,department,ticketNumber,status:QueueTicketStatus.WAITING,priority,checkedInAt:new Date(),estimatedAppointmentAt,delayMinutes:0,sequenceScore:0,position:0,notes});
    await this.resequenceQueue(hospitalId,{providerId,department,date:new Date().toISOString().slice(0,10)});
    publishAppointmentEvent('queue.ticket.created',hospitalId,ticket);
    return ticket;
  }

  static async getQueue(hospitalId:string,query:QueueQueryDTO){
    const h=oid(hospitalId,'Hospital ID'), filter:any={hospitalId:h,status:{$in:[QueueTicketStatus.WAITING,QueueTicketStatus.CALLED,QueueTicketStatus.IN_SERVICE]}};
    if(query.providerId) filter.providerId=oid(query.providerId,'Provider ID');
    if(query.department) filter.department=query.department;
    if(query.date){const s=new Date(`${query.date.slice(0,10)}T00:00:00`),e=new Date(`${query.date.slice(0,10)}T23:59:59.999`);filter.checkedInAt={$gte:s,$lte:e};}
    await this.resequenceQueue(hospitalId,query);
    const tickets=await QueueTicketModel.find(filter).sort({position:1}).lean();
    let hydratedTickets:any[]=tickets as any[];
    try {
      hydratedTickets=await QueueTicketModel.populate(hydratedTickets,[
        {path:'patientId',select:'firstName lastName mrn phone'},
        {path:'providerId',select:'firstName lastName department'},
      ]);
    } catch(populateError) {
      console.error('[Appointment Queue] populate warning:', populateError);
    }
    return {tickets:hydratedTickets,total:hydratedTickets.length};
  }

  static async resequenceQueue(hospitalId:string,query:QueueQueryDTO){
    const h=oid(hospitalId,'Hospital ID');
    const filter:any={hospitalId:h,status:{$in:[QueueTicketStatus.WAITING,QueueTicketStatus.CALLED,QueueTicketStatus.IN_SERVICE]}};
    if(query.providerId) filter.providerId=oid(query.providerId,'Provider ID'); if(query.department) filter.department=query.department;
    const date=query.date||new Date().toISOString().slice(0,10); filter.checkedInAt={$gte:new Date(`${date.slice(0,10)}T00:00:00`),$lte:new Date(`${date.slice(0,10)}T23:59:59.999`)};
    const tickets=await QueueTicketModel.find(filter).lean();
    const grouped=new Map<string,any[]>();
    for(const t of tickets){const key=t.providerId.toString(); if(!grouped.has(key))grouped.set(key,[]);grouped.get(key)!.push(t);}
    for(const [providerId,items] of grouped){
      const schedule=await ProviderScheduleModel.findOne({hospitalId:h,providerId,active:true}).lean() as unknown as IProviderSchedule | null;
      const rules:any={...DEFAULT_RULES,...(schedule?.queueRules||{})};
      const now=Date.now();
      const scored=items.map((t:any)=>{
        const apptMinutes=t.estimatedAppointmentAt?new Date(t.estimatedAppointmentAt).getHours()*60+new Date(t.estimatedAppointmentAt).getMinutes():9999;
        const arrivalAge=Math.max(0,(now-new Date(t.checkedInAt).getTime())/60000);
        const appointmentFactor=apptMinutes===9999?0:Math.max(0,1440-apptMinutes)/1440;
        const delayFactor=Math.max(0,t.delayMinutes||0);
        return {...t,score:rules.appointmentWeight*appointmentFactor+rules.arrivalWeight*Math.min(arrivalAge/60,4)+rules.priorityWeight*(priorityValue[t.priority as QueuePriority]/200)+rules.delayWeight*delayFactor};
      }).sort((a,b)=>b.score-a.score);
      for(let i=0;i<scored.length;i++) await QueueTicketModel.updateOne({_id:scored[i]._id},{$set:{sequenceScore:scored[i].score,position:i+1}});
    }
    return this.getQueueWithoutResequence(hospitalId,query);
  }

  private static async getQueueWithoutResequence(hospitalId:string,query:QueueQueryDTO){
    const h=oid(hospitalId,'Hospital ID'),filter:any={hospitalId:h,status:{$in:[QueueTicketStatus.WAITING,QueueTicketStatus.CALLED,QueueTicketStatus.IN_SERVICE]}};
    if(query.providerId)filter.providerId=oid(query.providerId,'Provider ID');if(query.department)filter.department=query.department;
    if(query.date){filter.checkedInAt={$gte:new Date(`${query.date.slice(0,10)}T00:00:00`),$lte:new Date(`${query.date.slice(0,10)}T23:59:59.999`)};}
    const tickets=await QueueTicketModel.find(filter).sort({position:1}).lean();
    let hydratedTickets:any[]=tickets as any[];
    try {
      hydratedTickets=await QueueTicketModel.populate(hydratedTickets,{path:'patientId',select:'firstName lastName mrn phone'});
    } catch(populateError) {
      console.error('[Appointment Queue] populate warning:', populateError);
    }
    return {tickets:hydratedTickets,total:hydratedTickets.length};
  }

  static async updateQueueTicket(hospitalId:string,ticketId:string,status:QueueTicketStatus,delayMinutes?:number){
    const h=oid(hospitalId,'Hospital ID'),id=oid(ticketId,'Queue Ticket ID');
    const update:any={status}; if(delayMinutes!==undefined)update.delayMinutes=Math.max(0,delayMinutes);
    if(status===QueueTicketStatus.CALLED)update.calledAt=new Date();
    if([QueueTicketStatus.COMPLETED,QueueTicketStatus.NO_SHOW].includes(status))update.completedAt=new Date();
    const t=await QueueTicketModel.findOneAndUpdate({_id:id,hospitalId:h},{$set:update},{new:true}).lean() as unknown as IQueueTicket | null; if(!t)throw err('Queue ticket not found.',404);
    await this.resequenceQueue(hospitalId,{providerId:t.providerId.toString(),department:t.department,date:t.checkedInAt.toISOString().slice(0,10)}); publishAppointmentEvent('queue.ticket.updated',hospitalId,t); return t;
  }

  static async updateProviderDelay(hospitalId:string,providerId:string,delayMinutes:number,department?:string){
    const h=oid(hospitalId,'Hospital ID'),d=oid(providerId,'Provider ID');
    await QueueTicketModel.updateMany({hospitalId:h,providerId:d,status:{$in:[QueueTicketStatus.WAITING,QueueTicketStatus.CALLED,QueueTicketStatus.IN_SERVICE]}},{$set:{delayMinutes:Math.max(0,delayMinutes)}});
    const result=await this.resequenceQueue(hospitalId,{providerId,department,date:new Date().toISOString().slice(0,10)}); publishAppointmentEvent('provider.delay.updated',hospitalId,{providerId,delayMinutes,department,queue:result}); return result;
  }

  static async calculateNoShowRisk(hospitalId:string,patientId:string){
    const h=oid(hospitalId,'Hospital ID'),p=oid(patientId,'Patient ID');
    const history=await AppointmentModel.find({hospitalId:h,patientId:p,status:{$in:[AppointmentStatus.NO_SHOW,AppointmentStatus.COMPLETED,AppointmentStatus.CANCELLED]}}).sort({appointmentDate:-1}).limit(30).lean();
    const noShows=history.filter((x:any)=>x.status===AppointmentStatus.NO_SHOW).length, total=Math.max(history.length,1);
    let score=history.length?noShows/total:0.15; const factors:string[]=[];
    if(noShows){score=Math.min(1,score+Math.min(noShows*.08,.24));factors.push(`${noShows} previous no-show(s)`);}
    if(history.length<3){score+=.08;factors.push('limited attendance history');}
    const level=scoreLevel(Math.min(1,score)); return {score:Math.min(1,score),level,factors};
  }

  private static async persistRisk(hospitalId:string,appointmentId:string,patientId:string,risk:any){
    await NoShowRiskScoreModel.create({hospitalId:oid(hospitalId,'Hospital ID'),appointmentId:oid(appointmentId,'Appointment ID'),patientId:oid(patientId,'Patient ID'),score:risk.score,level:risk.level,factors:risk.factors,calculatedAt:new Date()});
  }

  static async getRisk(hospitalId:string,appointmentId:string){return NoShowRiskScoreModel.findOne({hospitalId:oid(hospitalId,'Hospital ID'),appointmentId:oid(appointmentId,'Appointment ID')}).sort({calculatedAt:-1}).lean();}

  private static async scheduleReminders(hospitalId:string,appointmentId:string,patientId:string,date:Date,startTime:string,minutes:number[]){
    const h=oid(hospitalId,'Hospital ID'),p=oid(patientId,'Patient ID'),a=oid(appointmentId,'Appointment ID');
    const startAt=combine(date,startTime); const channels=[ReminderChannel.SMS,ReminderChannel.PUSH,ReminderChannel.EMAIL];
    for(const mins of minutes){if(!Number.isFinite(Number(mins))||Number(mins)<0)continue;const when=new Date(startAt.getTime()-Number(mins)*60000);for(const channel of channels){
      await ReminderLogModel.updateOne({appointmentId:a,channel,scheduledFor:when},{$setOnInsert:{hospitalId:h,appointmentId:a,patientId:p,channel,scheduledFor:when,status:ReminderStatus.SCHEDULED,template:'APPOINTMENT_REMINDER',attempts:0}},{upsert:true});
    }}
    publishAppointmentEvent('reminder.scheduled',hospitalId,{appointmentId,scheduledMinutes:minutes});
  }

  static async getDueReminders(hospitalId:string,limit=100){
    return ReminderLogModel.find({hospitalId:oid(hospitalId,'Hospital ID'),status:ReminderStatus.SCHEDULED,scheduledFor:{$lte:new Date()}}).sort({scheduledFor:1}).limit(Math.min(limit,500)).lean();
  }
  static async markReminderSent(hospitalId:string,id:string){const r=await ReminderLogModel.findOneAndUpdate({_id:oid(id,'Reminder ID'),hospitalId:oid(hospitalId,'Hospital ID'),status:ReminderStatus.SCHEDULED},{$set:{status:ReminderStatus.SENT,sentAt:new Date()},$inc:{attempts:1}},{new:true}).lean();if(!r)throw err('Reminder not found or already processed.',404);return r;}

  static async getAppointments(hospitalId:string,query:GetAppointmentsQueryDTO){
    const h=oid(hospitalId,'Hospital ID');
    const page=Math.max(Number(query.page)||1,1);
    const limit=Math.min(Math.max(Number(query.limit)||10,1),100);
    const skip=(page-1)*limit;
    const filter:any={hospitalId:h};

    if(query.patientId) filter.patientId=oid(String(query.patientId),'Patient ID');
    if(query.doctorId) filter.doctorId=oid(String(query.doctorId),'Doctor ID');
    if(query.department && String(query.department).trim() && String(query.department)!=='undefined') {
      filter.department=String(query.department);
    }
    if(query.status && String(query.status)!=='undefined') filter.status=query.status;

    if(query.date) {
      const date=String(query.date).slice(0,10);
      if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(date)) throw err('Invalid appointment date. Use YYYY-MM-DD.');
      const s=new Date(`${date}T00:00:00.000`);
      const e=new Date(`${date}T23:59:59.999`);
      if(Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) throw err('Invalid appointment date.');
      filter.appointmentDate={$gte:s,$lte:e};
    }

    // Execute the appointment query independently so one failing count/populate
    // operation cannot obscure the actual appointment query error.
    const [rawAppointments,total]=await Promise.all([
      AppointmentModel.find(filter)
        .sort({appointmentDate:1,startTime:1})
        .skip(skip)
        .limit(limit)
        .lean(),
      AppointmentModel.countDocuments(filter),
    ]);

    let appointments:any[]=rawAppointments as any[];
    try {
      appointments=await AppointmentModel.populate(appointments,[
        {path:'patientId',select:'firstName lastName mrn phone'},
        {path:'doctorId',select:'firstName lastName email department role'},
      ]);
    } catch(populateError) {
      // Patient/staff references should not make the calendar endpoint fail.
      // Return the underlying appointment rows if a legacy reference cannot populate.
      console.error('[Appointment] populate warning:', populateError);
    }

    return {appointments,total,page,limit,pages:Math.ceil(total/limit)};
  }

  static async getAppointmentById(hospitalId:string,appointmentId:string){
    const appointment=await AppointmentModel.findOne({_id:oid(appointmentId,'Appointment ID'),hospitalId:oid(hospitalId,'Hospital ID')}).populate([{path:'patientId',select:'firstName lastName mrn phone gender dateOfBirth'},{path:'doctorId',select:'firstName lastName email department role'}]).lean();
    if(!appointment)throw err('Appointment record not found.',404);return appointment;
  }

  static async updateStatus(hospitalId:string,appointmentId:string,dto:UpdateAppointmentStatusDTO){
    const h=oid(hospitalId,'Hospital ID'),id=oid(appointmentId,'Appointment ID');
    const appointment=await AppointmentModel.findOneAndUpdate({_id:id,hospitalId:h},{$set:{status:dto.status,...(dto.notes!==undefined&&{notes:dto.notes})}},{new:true}).populate('patientId','firstName lastName mrn phone').populate('doctorId','firstName lastName email department role').lean();
    if(!appointment)throw err('Appointment record not found.',404);
    publishAppointmentEvent(dto.status===AppointmentStatus.CANCELLED?'appointment.cancelled':'appointment.updated',hospitalId,appointment);
    return appointment;
  }

  static async getCalendar(hospitalId:string,doctorId:string,date:string){
    return this.getAppointments(hospitalId,{doctorId,date,page:'1',limit:'100'});
  }
}
