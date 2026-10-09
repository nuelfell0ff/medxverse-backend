import { Types } from 'mongoose';
import { PatientModel, EncounterModel, ObservationModel, ConditionModel, MedicationStatementModel, DocumentReferenceModel, ProcedureModel, ClaimModel } from '../patient/patient.model.js';
import { AppointmentModel } from '../appointment/appointment.model.js';
import { OutpatientModel } from '../outpatient/outpatient.model.js';
import { ConsultationModel } from '../consultation/consultation.model.js';
import { InpatientAdmissionModel } from '../admissions/admissions.model.js';
import { LabOrderModel, TestCatalogModel } from '../lab/lab.model.js';
import { RadiologyOrderModel } from '../radiology/radiology.model.js';
import { InventoryItemModel, PrescriptionModel, DispenseRecordModel, FormularyEntryModel } from '../pharmacy/pharmacy.model.js';
import { BillingAccountModel, ChargeModel, PaymentModel, RefundModel, PaymentPlanModel } from '../billing/billing.model.js';
import { Staff } from '../staff/staff.model.js';
import { WardModel, BedModel, BedAssignmentModel, TransferRequestModel } from '../bed-ward/bed-ward.model.js';
import { AmbulanceModel, TripRequestModel } from '../ambulance/ambulance.model.js';
import { SurgeryCaseModel } from '../surgery/surgery.model.js';
import { SurgicalCaseModel as OtSurgicalCaseModel } from '../ot/ot.model.js';
import { MchRecordModel } from '../mch/mch.model.js';
import { DentalChartModel, DentalProcedureModel } from '../dental/dental.model.js';
import { EyeExamModel, OpticalPrescriptionModel } from '../eye-clinic/eye-clinic.model.js';
import { MentalHealthAssessmentModel, PsychotherapySessionModel } from '../mental-health/mental-health.model.js';
import { DietaryOrderModel, MealDeliveryModel } from '../dietary/dietary.model.js';
import { BloodUnitModel, TransfusionRequestModel } from '../blood-bank/blood-bank.model.js';
import { EquipmentModel, SupplierModel, PurchaseOrderModel } from '../inventory/inventory.model.js';
import { TelemedicineSessionModel } from '../telemedicine/telemedicine.model.js';
const S = (model, type, label, path, title, subtitle) => ({ model, type, label, path, title, subtitle });
const sources = [
    S(PatientModel, 'patient', 'Patient', id => `/hms/patients/${id}`, ['firstName', 'lastName'], ['mrn', 'phone', 'email']),
    S(EncounterModel, 'medical-record', 'Medical Record', () => '/hms/patients', ['type', 'status', 'reason', 'description'], ['patientId', 'encounterDate']),
    S(ObservationModel, 'medical-record', 'Clinical Observation', () => '/hms/patients', ['code', 'display', 'value', 'status'], ['patientId', 'effectiveDate']),
    S(ConditionModel, 'medical-record', 'Condition', () => '/hms/patients', ['code', 'description', 'status'], ['patientId', 'onsetDate']),
    S(MedicationStatementModel, 'medical-record', 'Medication Record', () => '/hms/patients', ['medicationName', 'status', 'dosage'], ['patientId', 'startDate']),
    S(DocumentReferenceModel, 'medical-record', 'Medical Document', () => '/hms/patients', ['title', 'description', 'type'], ['patientId', 'status']),
    S(ProcedureModel, 'medical-record', 'Procedure Record', () => '/hms/patients', ['code', 'description', 'status'], ['patientId', 'performedDate']),
    S(ClaimModel, 'medical-record', 'Clinical Claim', () => '/hms/billing', ['claimNumber', 'status', 'type'], ['patientId', 'amount']),
    S(AppointmentModel, 'appointment', 'Appointment', id => `/hms/appointments?appointmentId=${id}`, ['reason', 'department', 'type', 'status'], ['patientId', 'appointmentDate', 'startTime']),
    S(OutpatientModel, 'outpatient', 'Outpatient Visit', id => `/hms/outpatients?recordId=${id}`, ['reason', 'chiefComplaint', 'status'], ['patientId', 'queuedAt']),
    S(ConsultationModel, 'consultation', 'Consultation', id => `/hms/outpatients?consultationId=${id}`, ['chiefComplaint', 'status', 'treatmentPlan'], ['patientId', 'followUpDate']),
    S(InpatientAdmissionModel, 'admission', 'Admission', id => `/hms/ipd?admissionId=${id}`, ['admissionReason', 'status', 'wardId'], ['patientId', 'bedNumber', 'admittedAt']),
    S(LabOrderModel, 'laboratory', 'Lab Order', id => `/hms/lab/${id}`, ['orderNumber', 'status', 'priority'], ['patientId', 'department', 'orderedAt']),
    S(TestCatalogModel, 'laboratory-catalog', 'Lab Test', () => '/hms/lab', ['name', 'code', 'category'], ['department', 'description']),
    S(RadiologyOrderModel, 'radiology', 'Radiology Order', id => `/hms/radiology/${id}`, ['accessionNumber', 'status', 'modality'], ['patientId', 'bodyPart']),
    S(InventoryItemModel, 'pharmacy', 'Pharmacy Item', () => '/hms/pharmacy', ['name', 'genericName', 'barcode'], ['strength', 'batchNumber', 'manufacturer']),
    S(PrescriptionModel, 'prescription', 'Prescription', id => `/hms/pharmacy?prescriptionId=${id}`, ['prescriptionNumber', 'status', 'source'], ['patientId', 'prescriberId']),
    S(DispenseRecordModel, 'dispense', 'Dispense Record', id => `/hms/pharmacy?dispenseId=${id}`, ['dispenseNumber', 'status'], ['patientId', 'prescriptionId']),
    S(FormularyEntryModel, 'pharmacy-formulary', 'Formulary Item', () => '/hms/pharmacy', ['medicationName', 'department', 'status'], ['strength', 'dosageForm']),
    S(BillingAccountModel, 'billing', 'Billing Account', id => `/hms/billing?billingId=${id}`, ['billingId', 'accountName', 'status'], ['patientId', 'notes']),
    S(ChargeModel, 'billing', 'Billing Charge', id => `/hms/billing?chargeId=${id}`, ['chargeCode', 'description', 'status', 'category'], ['patientId', 'amount']),
    S(PaymentModel, 'payment', 'Payment', id => `/hms/billing?paymentId=${id}`, ['reference', 'status', 'method'], ['patientId', 'amount']),
    S(RefundModel, 'refund', 'Refund', id => `/hms/billing?refundId=${id}`, ['reference', 'status', 'reason'], ['patientId', 'amount']),
    S(PaymentPlanModel, 'billing-plan', 'Payment Plan', id => `/hms/billing?paymentPlanId=${id}`, ['planName', 'status', 'frequency'], ['patientId', 'amount']),
    S(Staff, 'staff', 'Staff', id => `/hms/staff?staffId=${id}`, ['firstName', 'lastName', 'staffId'], ['role', 'jobTitle', 'contact.email']),
    S(WardModel, 'ward', 'Ward', () => '/hms/bed-ward', ['name', 'code'], ['department', 'floor', 'building']),
    S(BedModel, 'bed', 'Bed', () => '/hms/bed-ward', ['bedNumber', 'status', 'bedType'], ['wardId', 'roomNumber']),
    S(BedAssignmentModel, 'bed-assignment', 'Bed Assignment', () => '/hms/bed-ward', ['status', 'bedNumber'], ['patientId', 'wardId']),
    S(TransferRequestModel, 'transfer', 'Transfer Request', () => '/hms/bed-ward', ['status', 'reason'], ['patientId', 'fromWardId', 'toWardId']),
    S(AmbulanceModel, 'ambulance', 'Ambulance', () => '/hms/emergency', ['registrationNumber', 'vehicleModel', 'status'], ['vehicleType']),
    S(TripRequestModel, 'ambulance-trip', 'Ambulance Trip', () => '/hms/emergency', ['status', 'priority', 'reason'], ['patientId', 'registrationNumber']),
    S(SurgeryCaseModel, 'surgery', 'Surgery', id => `/hms/surgery/${id}`, ['procedureName', 'status', 'urgency'], ['patientId', 'theatreId']),
    S(OtSurgicalCaseModel, 'ot', 'Operating Theatre Case', id => `/hms/ot/${id}`, ['procedureName', 'status', 'urgency'], ['patientId', 'otRoomNumber']),
    S(MchRecordModel, 'mch', 'MCH Record', () => '/hms/outpatients', ['recordNumber', 'status', 'serviceType'], ['patientId', 'notes']),
    S(DentalChartModel, 'dental', 'Dental Chart', () => '/hms/outpatients', ['toothNumber', 'status', 'diagnosis'], ['patientId', 'notes']),
    S(DentalProcedureModel, 'dental', 'Dental Procedure', () => '/hms/outpatients', ['procedureName', 'status', 'code'], ['patientId']),
    S(EyeExamModel, 'eye', 'Eye Exam', () => '/hms/outpatients', ['diagnosis', 'status', 'examType'], ['patientId']),
    S(OpticalPrescriptionModel, 'eye', 'Optical Prescription', () => '/hms/outpatients', ['prescriptionNumber', 'status'], ['patientId']),
    S(MentalHealthAssessmentModel, 'mental-health', 'Mental Health Assessment', () => '/hms/outpatients', ['assessmentType', 'status', 'diagnosis'], ['patientId']),
    S(PsychotherapySessionModel, 'mental-health', 'Psychotherapy Session', () => '/hms/outpatients', ['sessionType', 'status', 'notes'], ['patientId']),
    S(DietaryOrderModel, 'dietary', 'Dietary Order', () => '/hms/outpatients', ['dietType', 'status', 'mealType'], ['patientId']),
    S(MealDeliveryModel, 'dietary', 'Meal Delivery', () => '/hms/outpatients', ['status', 'mealType'], ['patientId']),
    S(BloodUnitModel, 'blood-bank', 'Blood Unit', () => '/hms/emergency', ['unitNumber', 'bloodGroup', 'status'], ['component', 'expiryDate']),
    S(TransfusionRequestModel, 'blood-bank', 'Transfusion Request', () => '/hms/emergency', ['requestNumber', 'status', 'priority'], ['patientId', 'bloodGroup']),
    S(EquipmentModel, 'equipment', 'Equipment', () => '/hms/administration', ['name', 'assetTag', 'status'], ['category', 'location']),
    S(SupplierModel, 'supplier', 'Supplier', () => '/hms/administration', ['name', 'code', 'status'], ['email', 'phone']),
    S(PurchaseOrderModel, 'purchase-order', 'Purchase Order', () => '/hms/administration', ['poNumber', 'status', 'supplierName'], ['supplierId', 'totalAmount']),
    S(TelemedicineSessionModel, 'telemedicine', 'Telemedicine Session', id => `/hms/telemedicine?sessionId=${id}`, ['sessionId', 'status', 'type'], ['patientId', 'scheduledAt']),
];
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const valueAt = (doc, path) => {
    const value = path.split('.').reduce((v, key) => v?.[key], doc);
    if (value === undefined || value === null || value === '')
        return '';
    if (value instanceof Date)
        return value.toISOString().slice(0, 10);
    return typeof value === 'object' ? '' : String(value);
};
const stringPaths = (model) => Object.entries(model.schema.paths)
    .filter(([path, schemaType]) => path !== '__v' &&
    !path.toLowerCase().includes('password') &&
    schemaType?.instance === 'String')
    .map(([path]) => path)
    .filter(path => path.length <= 80)
    .slice(0, 100);
const titleFor = (doc, paths, fallback) => {
    if (paths.includes('firstName') && paths.includes('lastName')) {
        const full = `${valueAt(doc, 'firstName')} ${valueAt(doc, 'lastName')}`.trim();
        if (full)
            return full;
    }
    return paths.map(p => valueAt(doc, p)).find(Boolean) || fallback;
};
const subtitleFor = (doc, paths) => (paths || []).map(p => valueAt(doc, p)).filter(Boolean).slice(0, 3).join(' • ');
export class GlobalSearchService {
    static async search(hospitalId, query, limit = 30) {
        const q = query.trim();
        if (q.length < 2)
            return [];
        const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 50);
        const regex = new RegExp(escapeRegex(q), 'i');
        const tenantId = new Types.ObjectId(hospitalId);
        const chunks = await Promise.all(sources.map(async (source) => {
            const hospitalPath = source.model.schema.path('hospitalId');
            if (!hospitalPath)
                return [];
            const paths = stringPaths(source.model);
            const or = paths.map(path => ({ [path]: regex }));
            if (Types.ObjectId.isValid(q))
                or.push({ _id: new Types.ObjectId(q) });
            if (!or.length)
                return [];
            try {
                const docs = await source.model.find({ hospitalId: tenantId, $or: or })
                    .sort({ updatedAt: -1, createdAt: -1 })
                    .limit(4)
                    .lean();
                return docs.map((doc) => {
                    const id = String(doc._id);
                    const title = titleFor(doc, source.title, source.label);
                    const subtitle = subtitleFor(doc, source.subtitle);
                    const matching = paths.map(p => valueAt(doc, p)).find(v => v.toLowerCase().includes(q.toLowerCase()));
                    return {
                        id,
                        type: source.type,
                        label: source.label,
                        title,
                        subtitle: subtitle || undefined,
                        description: matching && matching !== title ? matching : undefined,
                        path: source.path(id),
                    };
                });
            }
            catch {
                return [];
            }
        }));
        return chunks.flat().slice(0, safeLimit);
    }
}
