import { Schema, model } from 'mongoose';
import { SurgeryStatus, UrgencyLevel, AnesthesiaType, SurgicalRole, ASAClassification, SterilizationStatus, ConsentType, MedicationStatus, EquipmentStatus, } from './surgery.types.js';
const SurgicalTeamMemberSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'Staff',
        required: true,
        index: true,
    },
    role: {
        type: String,
        enum: Object.values(SurgicalRole),
        required: true,
    },
    credentialVerified: {
        type: Boolean,
        default: false,
    },
    assignedAt: {
        type: Date,
        default: Date.now,
    },
    notes: {
        type: String,
        trim: true,
        default: '',
    },
}, { _id: false });
const PreOpVitalsSchema = new Schema({
    bpSystolic: Number,
    bpDiastolic: Number,
    heartRate: Number,
    tempCelsius: Number,
    spO2: Number,
    respiratoryRate: Number,
    weightKg: Number,
    heightCm: Number,
}, { _id: false });
const PreOpAssessmentSchema = new Schema({
    diagnosis: String,
    surgicalIndication: String,
    surgicalHistory: String,
    medicalHistory: String,
    allergies: [String],
    currentMedications: [String],
    laboratoryResults: String,
    imagingResults: String,
    anestheticAssessment: String,
    asaClassification: {
        type: String,
        enum: Object.values(ASAClassification),
    },
    mallampatiScore: {
        type: String,
        enum: ['CLASS_I', 'CLASS_II', 'CLASS_III', 'CLASS_IV'],
    },
    airwayAssessment: String,
    vteRiskScore: String,
    infectionScreeningNotes: String,
    pregnancyStatus: {
        type: String,
        enum: ['NOT_APPLICABLE', 'NEGATIVE', 'POSITIVE', 'UNKNOWN'],
        default: 'NOT_APPLICABLE',
    },
    preOpVitals: PreOpVitalsSchema,
    optimizationChecklist: {
        fastingConfirmed: Boolean,
        bloodAvailable: Boolean,
        investigationsReviewed: Boolean,
        medicationsReviewed: Boolean,
        allergiesReviewed: Boolean,
        airwayAssessed: Boolean,
        consentCompleted: Boolean,
        siteMarked: Boolean,
        patientIdentified: Boolean,
    },
    clearedForSurgery: {
        type: Boolean,
        default: false,
    },
    clearedAt: Date,
    clearedBy: {
        type: Schema.Types.ObjectId,
        ref: 'Staff',
    },
    notes: String,
}, { _id: false });
const ConsentVersionSchema = new Schema({
    version: {
        type: Number,
        required: true,
    },
    type: {
        type: String,
        enum: Object.values(ConsentType),
        required: true,
    },
    consented: {
        type: Boolean,
        required: true,
    },
    signedByPatient: {
        type: Boolean,
        required: true,
    },
    witnessName: String,
    witnessId: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
    },
    digitalSignatureUrl: String,
    signedAt: Date,
    recordedBy: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
    },
    notes: String,
}, { _id: false });
const SurgicalConsentSchema = new Schema({
    procedureConsent: {
        type: Boolean,
        default: false,
    },
    anesthesiaConsent: {
        type: Boolean,
        default: false,
    },
    bloodTransfusionConsent: {
        type: Boolean,
        default: false,
    },
    highRiskConsent: {
        type: Boolean,
        default: false,
    },
    additionalProcedureConsent: {
        type: Boolean,
        default: false,
    },
    signedByPatient: {
        type: Boolean,
        default: false,
    },
    witnessName: String,
    witnessId: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
    },
    digitalSignatureUrl: String,
    signedAt: Date,
    versions: {
        type: [ConsentVersionSchema],
        default: [],
    },
}, { _id: false });
const MedicationSchema = new Schema({
    medicationName: {
        type: String,
        required: true,
        trim: true,
    },
    dose: String,
    route: String,
    scheduledAt: Date,
    administeredAt: Date,
    administeredBy: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
    },
    status: {
        type: String,
        enum: Object.values(MedicationStatus),
        default: MedicationStatus.PLANNED,
    },
    indication: String,
    notes: String,
});
const EquipmentItemSchema = new Schema({
    itemName: {
        type: String,
        required: true,
        trim: true,
    },
    category: String,
    equipmentId: String,
    status: {
        type: String,
        enum: Object.values(EquipmentStatus),
        default: EquipmentStatus.AVAILABLE,
    },
    sterileStatus: {
        type: String,
        enum: Object.values(SterilizationStatus),
        default: SterilizationStatus.STERILE,
    },
    maintenanceOk: {
        type: Boolean,
        default: true,
    },
    sterilizationBatch: String,
    lastSterilizedAt: Date,
    expiryDate: Date,
    quantity: Number,
    notes: String,
}, { _id: false });
const InstrumentItemSchema = new Schema({
    instrumentName: {
        type: String,
        required: true,
    },
    instrumentId: String,
    quantityExpected: {
        type: Number,
        default: 0,
    },
    quantityPresent: {
        type: Number,
        default: 0,
    },
    sterilizationStatus: {
        type: String,
        enum: Object.values(SterilizationStatus),
        default: SterilizationStatus.STERILE,
    },
    notes: String,
}, { _id: false });
const ConsumableItemSchema = new Schema({
    itemName: {
        type: String,
        required: true,
    },
    category: String,
    quantityUsed: {
        type: Number,
        required: true,
        default: 1,
    },
    unit: String,
    unitCost: {
        type: Number,
        default: 0,
    },
    lotNumber: String,
    expiryDate: Date,
    notes: String,
}, { _id: false });
const WHOSignInSchema = new Schema({
    completed: {
        type: Boolean,
        default: false,
    },
    completedAt: Date,
    completedBy: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
    },
    patientIdentityConfirmed: Boolean,
    procedureConfirmed: Boolean,
    siteSideConfirmed: Boolean,
    consentVerified: Boolean,
    anesthesiaSafetyConfirmed: Boolean,
    pulseOximeterOn: Boolean,
    allergiesReviewed: Boolean,
    allergyKnown: Boolean,
    airwayRisk: Boolean,
    bloodLossRisk: Boolean,
    bloodLossRiskOver500ml: Boolean,
    siteMarked: Boolean,
    notes: String,
}, { _id: false });
const WHOTimeOutSchema = new Schema({
    completed: {
        type: Boolean,
        default: false,
    },
    completedAt: Date,
    completedBy: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
    },
    patientConfirmed: Boolean,
    patientIdentityConfirmed: Boolean,
    procedureConfirmed: Boolean,
    surgicalSiteConfirmed: Boolean,
    confirmPatientSiteProcedure: Boolean,
    consentVerified: Boolean,
    siteMarked: Boolean,
    teamIntroduced: Boolean,
    antibioticProphylaxisConfirmed: Boolean,
    antibioticProphylaxisGiven: Boolean,
    imagingAvailable: Boolean,
    imagingDisplayed: Boolean,
    criticalConcernsSurgeon: String,
    criticalConcernsAnaesthetist: String,
    criticalConcernsNursing: String,
}, { _id: false });
const WHOSignOutSchema = new Schema({
    completed: {
        type: Boolean,
        default: false,
    },
    completedAt: Date,
    completedBy: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
    },
    procedureRecorded: String,
    instrumentCountCorrect: Boolean,
    spongeCountCorrect: Boolean,
    needleCountCorrect: Boolean,
    specimenLabeled: Boolean,
    equipmentIssuesNoted: String,
    postOperativePlan: String,
    postOpRecoveryPlan: String,
    countsCorrect: Boolean,
    notes: String,
}, { _id: false });
const WHOChecklistSchema = new Schema({
    signIn: {
        type: WHOSignInSchema,
        default: () => ({ completed: false }),
    },
    timeOut: {
        type: WHOTimeOutSchema,
        default: () => ({ completed: false }),
    },
    signOut: {
        type: WHOSignOutSchema,
        default: () => ({ completed: false }),
    },
}, { _id: false });
const IntraopVitalsSchema = new Schema({
    timestamp: {
        type: Date,
        default: Date.now,
    },
    bpSystolic: Number,
    bpDiastolic: Number,
    heartRate: Number,
    spO2: Number,
    respRate: Number,
    tempCelsius: Number,
    etCO2: Number,
    ecgRhythm: String,
    oxygenFlow: String,
    ventilationMode: String,
    anesthesiaEvent: String,
    notes: String,
}, { _id: false });
const AnesthesiaDrugSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    dose: String,
    route: String,
    administeredAt: Date,
    administeredBy: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
    },
});
const AnesthesiaRecordSchema = new Schema({
    preAnestheticAssessment: String,
    airwayManagement: String,
    airwayDevice: String,
    anesthesiaType: {
        type: String,
        enum: Object.values(AnesthesiaType),
    },
    drugs: {
        type: [AnesthesiaDrugSchema],
        default: [],
    },
    fluidsMl: Number,
    bloodLossMl: Number,
    urineOutputMl: Number,
    complications: String,
    recoveryAssessment: String,
    notes: String,
}, { _id: false });
const IntraopDocumentationSchema = new Schema({
    procedureStartTime: Date,
    procedureEndTime: Date,
    incisionTime: Date,
    closureTime: Date,
    operativeDiagnosis: String,
    postOperativeDiagnosis: String,
    procedurePerformed: String,
    surgicalFindings: String,
    techniqueNotes: String,
    eblMl: Number,
    fluidsAdministeredMl: Number,
    bloodProductsAdministered: String,
    drainsInserted: String,
    implantsUsed: String,
    specimensCollected: String,
    complications: String,
    surgeonNotes: String,
}, { _id: false });
const RecoveryAssessmentSchema = new Schema({
    arrivalTime: Date,
    consciousness: String,
    airway: String,
    breathing: String,
    circulation: String,
    painScore: Number,
    nauseaVomiting: Boolean,
    dischargeCriteriaMet: Boolean,
    assessedBy: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
    },
    notes: String,
}, { _id: false });
const SurgeryBillingSchema = new Schema({
    status: {
        type: String,
        enum: ['NOT_ATTEMPTED', 'CAPTURED', 'PARTIAL', 'FAILED'],
        default: 'NOT_ATTEMPTED',
    },
    chargeIds: {
        type: [Schema.Types.ObjectId],
        default: [],
    },
    errors: {
        type: [String],
        default: [],
    },
    catalogueItemId: {
        type: Schema.Types.ObjectId,
        ref: 'PricingCatalogue',
    },
    cataloguePlanName: String,
    cataloguePrice: Number,
    catalogueVersion: Number,
    currency: String,
    lastAttemptAt: Date,
    capturedAt: Date,
}, { _id: false });
const SurgeryCaseSchema = new Schema({
    hospitalId: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
        required: true,
        index: true,
    },
    patientId: {
        type: Schema.Types.ObjectId,
        ref: 'Patient',
        required: true,
        index: true,
    },
    leadSurgeonId: {
        type: Schema.Types.ObjectId,
        ref: 'Staff',
        required: true,
        index: true,
    },
    theatreId: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    procedureName: {
        type: String,
        required: true,
        trim: true,
    },
    pricingCatalogueItemId: {
        type: Schema.Types.ObjectId,
        ref: 'PricingCatalogue',
        index: true,
    },
    pricingCataloguePlanName: {
        type: String,
        trim: true,
    },
    pricingCataloguePrice: {
        type: Number,
        min: 0,
    },
    pricingCatalogueVersion: {
        type: Number,
        min: 1,
    },
    pricingCatalogueCurrency: {
        type: String,
        trim: true,
        uppercase: true,
    },
    icdCode: {
        type: String,
        trim: true,
    },
    urgency: {
        type: String,
        enum: Object.values(UrgencyLevel),
        default: UrgencyLevel.ELECTIVE,
        required: true,
    },
    priority: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: Object.values(SurgeryStatus),
        default: SurgeryStatus.SCHEDULED,
        required: true,
        index: true,
    },
    scheduledStartTime: {
        type: Date,
        required: true,
    },
    scheduledEndTime: {
        type: Date,
        required: true,
    },
    estimatedDurationMinutes: Number,
    actualStartTime: Date,
    actualEndTime: Date,
    anesthesiaType: {
        type: String,
        enum: Object.values(AnesthesiaType),
        required: true,
    },
    surgicalTeam: {
        type: [SurgicalTeamMemberSchema],
        default: [],
    },
    preOpAssessment: PreOpAssessmentSchema,
    consent: SurgicalConsentSchema,
    medications: {
        type: [MedicationSchema],
        default: [],
    },
    equipmentChecklist: {
        type: [EquipmentItemSchema],
        default: [],
    },
    instrumentChecklist: {
        type: [InstrumentItemSchema],
        default: [],
    },
    consumablesUsed: {
        type: [ConsumableItemSchema],
        default: [],
    },
    whoChecklist: {
        type: WHOChecklistSchema,
        default: () => ({
            signIn: { completed: false },
            timeOut: { completed: false },
            signOut: { completed: false },
        }),
    },
    vitalsTimeline: {
        type: [IntraopVitalsSchema],
        default: [],
    },
    anesthesiaRecord: AnesthesiaRecordSchema,
    intraopDocs: IntraopDocumentationSchema,
    recoveryAssessment: RecoveryAssessmentSchema,
    billing: {
        type: SurgeryBillingSchema,
        default: () => ({
            status: 'NOT_ATTEMPTED',
            chargeIds: [],
            errors: [],
        }),
    },
    postOpNotes: {
        type: String,
        trim: true,
        maxlength: 10000,
    },
    cancellationReason: String,
    postponementReason: String,
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
    },
}, {
    timestamps: true,
});
SurgeryCaseSchema.index({
    hospitalId: 1,
    theatreId: 1,
    scheduledStartTime: 1,
    scheduledEndTime: 1,
});
SurgeryCaseSchema.index({
    hospitalId: 1,
    patientId: 1,
});
SurgeryCaseSchema.index({
    hospitalId: 1,
    leadSurgeonId: 1,
    scheduledStartTime: 1,
});
export const SurgeryCaseModel = model('SurgeryCase', SurgeryCaseSchema);
