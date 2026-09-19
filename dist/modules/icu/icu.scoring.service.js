import { Types } from 'mongoose';
import { ICUAdmissionModel, ICUScoreModel, DeviceReadingModel, FlowsheetEntryModel, } from './icu.model.js';
import { ICUScoreStatus, ICUScoreType, } from './icu.types.js';
/**
 * Clinical scoring calculations are implemented as deterministic, versioned
 * functions. The service stores the inputs/components used for every result
 * so clinicians can audit how a score was produced.
 *
 * The application should treat a PARTIAL score as incomplete and must not
 * silently substitute missing values with normal values.
 */
const VERSION = '1.0.0';
function num(value) {
    return typeof value === 'number' && Number.isFinite(value)
        ? value
        : undefined;
}
function apacheTempPoints(t) {
    if (t === undefined)
        return undefined;
    if (t >= 41)
        return 4;
    if (t >= 39)
        return 3;
    if (t >= 38.5)
        return 1;
    if (t >= 36)
        return 0;
    if (t >= 34)
        return 1;
    if (t >= 32)
        return 2;
    if (t >= 30)
        return 3;
    return 4;
}
function apacheMapPoints(map) {
    if (map === undefined)
        return undefined;
    if (map >= 160)
        return 4;
    if (map >= 130)
        return 3;
    if (map >= 110)
        return 2;
    if (map >= 70)
        return 0;
    if (map >= 50)
        return 2;
    return 4;
}
function apacheHrPoints(hr) {
    if (hr === undefined)
        return undefined;
    if (hr >= 180)
        return 4;
    if (hr >= 140)
        return 3;
    if (hr >= 110)
        return 2;
    if (hr >= 70)
        return 0;
    if (hr >= 55)
        return 2;
    if (hr >= 40)
        return 3;
    return 4;
}
function apacheRrPoints(rr) {
    if (rr === undefined)
        return undefined;
    if (rr >= 50)
        return 4;
    if (rr >= 35)
        return 3;
    if (rr >= 25)
        return 1;
    if (rr >= 12)
        return 0;
    if (rr >= 10)
        return 1;
    if (rr >= 6)
        return 2;
    return 4;
}
function apacheOxygenationPoints(paO2, fio2, aaGradient) {
    if (fio2 === undefined || paO2 === undefined)
        return undefined;
    if (fio2 >= 0.5) {
        if (aaGradient === undefined)
            return undefined;
        if (aaGradient >= 500)
            return 3;
        if (aaGradient >= 350)
            return 2;
        if (aaGradient >= 200)
            return 1;
        return 0;
    }
    if (paO2 >= 70)
        return 0;
    if (paO2 >= 61)
        return 1;
    if (paO2 >= 55)
        return 3;
    return 4;
}
function apacheArterialPHPoints(ph) {
    if (ph === undefined)
        return undefined;
    if (ph >= 7.70)
        return 4;
    if (ph >= 7.60)
        return 3;
    if (ph >= 7.50)
        return 1;
    if (ph >= 7.33)
        return 0;
    if (ph >= 7.25)
        return 2;
    if (ph >= 7.15)
        return 3;
    return 4;
}
function apacheSodiumPoints(na) {
    if (na === undefined)
        return undefined;
    if (na >= 180)
        return 4;
    if (na >= 160)
        return 3;
    if (na >= 155)
        return 1;
    if (na >= 130)
        return 0;
    if (na >= 120)
        return 2;
    if (na >= 111)
        return 3;
    return 4;
}
function apachePotassiumPoints(k) {
    if (k === undefined)
        return undefined;
    if (k >= 7)
        return 4;
    if (k >= 6)
        return 3;
    if (k >= 5.5)
        return 1;
    if (k >= 3.5)
        return 0;
    if (k >= 3)
        return 1;
    if (k >= 2.5)
        return 2;
    return 4;
}
function apacheCreatininePoints(creatinine, acuteRenalFailure = false) {
    if (creatinine === undefined)
        return undefined;
    let points = 0;
    if (creatinine >= 3.5)
        points = 4;
    else if (creatinine >= 2)
        points = 3;
    else if (creatinine >= 1.5)
        points = 2;
    else if (creatinine >= 0.6)
        points = 0;
    else
        points = 2;
    return acuteRenalFailure ? points * 2 : points;
}
function apacheHematocritPoints(hct) {
    if (hct === undefined)
        return undefined;
    if (hct >= 60)
        return 4;
    if (hct >= 50)
        return 2;
    if (hct >= 46)
        return 1;
    if (hct >= 30)
        return 0;
    if (hct >= 20)
        return 2;
    return 4;
}
function apacheWbcPoints(wbc) {
    if (wbc === undefined)
        return undefined;
    if (wbc >= 40)
        return 4;
    if (wbc >= 20)
        return 1;
    if (wbc >= 15)
        return 1;
    if (wbc >= 3)
        return 0;
    if (wbc >= 1)
        return 2;
    return 4;
}
function apacheGcsPoints(gcs) {
    if (gcs === undefined)
        return undefined;
    return Math.max(0, 15 - gcs);
}
function apacheAgePoints(age) {
    if (age === undefined)
        return undefined;
    if (age >= 75)
        return 6;
    if (age >= 65)
        return 5;
    if (age >= 55)
        return 3;
    if (age >= 45)
        return 2;
    return 0;
}
function sofaRespiratoryPoints(pf) {
    if (pf === undefined)
        return undefined;
    if (pf >= 400)
        return 0;
    if (pf >= 300)
        return 1;
    if (pf >= 200)
        return 2;
    if (pf >= 100)
        return 3;
    return 4;
}
function sofaCoagulationPoints(platelets) {
    if (platelets === undefined)
        return undefined;
    if (platelets >= 150)
        return 0;
    if (platelets >= 100)
        return 1;
    if (platelets >= 50)
        return 2;
    if (platelets >= 20)
        return 3;
    return 4;
}
function sofaLiverPoints(bilirubin) {
    if (bilirubin === undefined)
        return undefined;
    if (bilirubin < 1.2)
        return 0;
    if (bilirubin < 2)
        return 1;
    if (bilirubin < 6)
        return 2;
    if (bilirubin < 12)
        return 3;
    return 4;
}
function sofaCardiovascularPoints(map, vasopressorPoints) {
    if (map === undefined && vasopressorPoints === undefined) {
        return undefined;
    }
    if (vasopressorPoints !== undefined) {
        return Math.max(0, Math.min(4, vasopressorPoints));
    }
    if (map !== undefined && map < 70)
        return 1;
    return 0;
}
function sofaCnsPoints(gcs) {
    if (gcs === undefined)
        return undefined;
    if (gcs >= 15)
        return 0;
    if (gcs >= 13)
        return 1;
    if (gcs >= 10)
        return 2;
    if (gcs >= 6)
        return 3;
    return 4;
}
function sofaRenalPoints(creatinine, urineMlPerDay) {
    if (creatinine === undefined &&
        urineMlPerDay === undefined) {
        return undefined;
    }
    if (urineMlPerDay !== undefined &&
        urineMlPerDay < 200) {
        return 4;
    }
    if (urineMlPerDay !== undefined &&
        urineMlPerDay < 500) {
        return 3;
    }
    if (creatinine !== undefined) {
        if (creatinine >= 5)
            return 4;
        if (creatinine >= 3.5)
            return 3;
        if (creatinine >= 2)
            return 2;
        if (creatinine >= 1.2)
            return 1;
    }
    return 0;
}
function component(name, value, points, unit, source) {
    return {
        name,
        value,
        points,
        unit,
        source,
        missing: value === undefined,
    };
}
export class ICUScoringService {
    calculateSOFA(input) {
        const fio2 = input.fio2;
        const paO2 = input.paO2;
        const pf = input.pao2Fio2 ??
            (paO2 !== undefined && fio2
                ? paO2 / fio2
                : undefined);
        const components = [
            component('respiratory', pf, sofaRespiratoryPoints(pf), 'mmHg', 'PaO2/FiO2'),
            component('coagulation', input.platelets, sofaCoagulationPoints(input.platelets), '10^3/uL', 'lab'),
            component('liver', input.bilirubin, sofaLiverPoints(input.bilirubin), 'mg/dL', 'lab'),
            component('cardiovascular', input.map, sofaCardiovascularPoints(input.map, input.vasopressorPoints), 'mmHg', 'vitals/vasopressor'),
            component('central_nervous_system', input.gcs, sofaCnsPoints(input.gcs), 'score', 'vitals'),
            component('renal', input.creatinine, sofaRenalPoints(input.creatinine, input.urineMlPerDay), 'mg/dL', 'lab/urine'),
        ];
        const complete = components.every((c) => !c.missing);
        const score = components.reduce((sum, c) => sum + (c.points || 0), 0);
        return {
            score,
            status: complete
                ? ICUScoreStatus.COMPLETE
                : ICUScoreStatus.PARTIAL,
            components,
        };
    }
    calculateAPACHEII(input) {
        const components = [
            component('temperature', input.temperature, apacheTempPoints(input.temperature), 'C', 'vitals'),
            component('mean_arterial_pressure', input.map, apacheMapPoints(input.map), 'mmHg', 'vitals'),
            component('heart_rate', input.heartRate, apacheHrPoints(input.heartRate), 'bpm', 'vitals'),
            component('respiratory_rate', input.respiratoryRate, apacheRrPoints(input.respiratoryRate), 'breaths/min', 'vitals'),
            component('oxygenation', input.paO2, apacheOxygenationPoints(input.paO2, input.fio2, input.aaGradient), 'mmHg', 'ABG'),
            component('arterial_pH', input.arterialPH, apacheArterialPHPoints(input.arterialPH), 'pH', 'ABG'),
            component('sodium', input.sodium, apacheSodiumPoints(input.sodium), 'mmol/L', 'lab'),
            component('potassium', input.potassium, apachePotassiumPoints(input.potassium), 'mmol/L', 'lab'),
            component('creatinine', input.creatinine, apacheCreatininePoints(input.creatinine, Boolean(input.acuteRenalFailure)), 'mg/dL', 'lab'),
            component('hematocrit', input.hematocrit, apacheHematocritPoints(input.hematocrit), '%', 'lab'),
            component('white_blood_cell_count', input.wbc, apacheWbcPoints(input.wbc), '10^3/uL', 'lab'),
            component('glasgow_coma_scale', input.gcs, apacheGcsPoints(input.gcs), 'score', 'clinical'),
            component('age', input.age, apacheAgePoints(input.age), 'years', 'patient'),
        ];
        // APACHE II chronic health points are context-dependent and require
        // documentation of severe organ-system insufficiency or
        // immunocompromise.
        const chronicHealth = num(input.chronicHealthPoints);
        const chronicComponent = component('chronic_health', chronicHealth, chronicHealth, 'points', 'clinician');
        const allComplete = components.every((c) => !c.missing) &&
            !chronicComponent.missing;
        const score = components.reduce((sum, c) => sum + (c.points || 0), 0) + (chronicHealth || 0);
        return {
            score,
            status: allComplete
                ? ICUScoreStatus.COMPLETE
                : ICUScoreStatus.PARTIAL,
            components: [
                ...components,
                chronicComponent,
            ],
        };
    }
    async collectUnderlyingInputs(hospitalId, admissionId) {
        if (!Types.ObjectId.isValid(hospitalId) ||
            !Types.ObjectId.isValid(admissionId)) {
            throw new Error('Invalid hospital or ICU admission ID.');
        }
        /*
         * Explicit lean result type.
         *
         * This fixes the patientId errors because TypeScript now knows that
         * admission is a single ICU admission record rather than a possible
         * array.
         */
        const admission = await ICUAdmissionModel.findOne({
            _id: admissionId,
            hospitalId,
        }).lean();
        if (!admission) {
            throw new Error('ICU admission not found.');
        }
        const [{ PatientModel }, { TestResultModel },] = await Promise.all([
            import('../patient/patient.model.js'),
            import('../lab/lab.extended.model.js'),
        ]);
        const [patient, readings, flowsheet, labResults,] = await Promise.all([
            /*
             * Explicit patient result type fixes dateOfBirth errors.
             */
            PatientModel.findOne({
                _id: admission.patientId,
                hospitalId,
            })
                .select('dateOfBirth')
                .lean(),
            DeviceReadingModel.find({
                'metadata.hospitalId': hospitalId,
                'metadata.admissionId': admissionId,
                quality: { $ne: 'INVALID' },
            })
                .sort({ recordedAt: -1 })
                .limit(2000)
                .lean(),
            FlowsheetEntryModel.find({
                hospitalId: new Types.ObjectId(hospitalId),
                admissionId: new Types.ObjectId(admissionId),
            })
                .sort({ recordedAt: -1 })
                .limit(2000)
                .lean(),
            TestResultModel.find({
                hospitalId: new Types.ObjectId(hospitalId),
                patientId: admission.patientId,
                numericValue: {
                    $exists: true,
                    $ne: null,
                },
            })
                .sort({ createdAt: -1 })
                .limit(1000)
                .lean(),
        ]);
        const input = {};
        const aliases = {
            temperature: [
                'temperature',
                'temperatureCelsius',
                'tempC',
                'temp',
            ],
            map: [
                'map',
                'meanArterialPressureMmHg',
                'meanArterialPressure',
            ],
            heartRate: [
                'heartRate',
                'heartRateBpm',
                'pulse',
                'pulseRate',
            ],
            respiratoryRate: [
                'respiratoryRate',
                'respiratoryRateBpm',
                'respRate',
            ],
            fio2: [
                'fio2',
                'fio2Pct',
            ],
            paO2: [
                'paO2',
                'pao2',
                'arterialPaO2',
            ],
            aaGradient: [
                'aaGradient',
                'aAGradient',
            ],
            arterialPH: [
                'arterialPH',
                'arterialPh',
                'ph',
            ],
            sodium: [
                'sodium',
                'na',
            ],
            potassium: [
                'potassium',
                'k',
            ],
            creatinine: [
                'creatinine',
                'creat',
            ],
            hematocrit: [
                'hematocrit',
                'hct',
            ],
            wbc: [
                'wbc',
                'whiteBloodCellCount',
                'whiteBloodCells',
            ],
            gcs: [
                'gcs',
                'glasgowComaScale',
            ],
            platelets: [
                'platelets',
                'plateletCount',
            ],
            bilirubin: [
                'bilirubin',
                'totalBilirubin',
            ],
            urineMlPerDay: [
                'urineMlPerDay',
                'urineOutput24h',
            ],
            vasopressorPoints: [
                'vasopressorPoints',
            ],
        };
        const normalized = (value) => value
            .replace(/[^a-z0-9]/gi, '')
            .toLowerCase();
        const lookup = new Map();
        for (const entry of flowsheet) {
            if (typeof entry.value === 'number') {
                lookup.set(normalized(entry.parameter), entry.value);
            }
        }
        for (const reading of readings) {
            for (const measurement of reading.measurements || []) {
                if (typeof measurement.value === 'number') {
                    const key = normalized(measurement.parameter);
                    if (!lookup.has(key)) {
                        lookup.set(key, measurement.value);
                    }
                }
            }
        }
        for (const result of labResults) {
            if (typeof result.numericValue !== 'number') {
                continue;
            }
            const key = normalized(result.parameterName);
            if (!lookup.has(key)) {
                lookup.set(key, result.numericValue);
            }
        }
        for (const [target, names,] of Object.entries(aliases)) {
            for (const name of names) {
                const value = lookup.get(normalized(name));
                if (value !== undefined) {
                    input[target] =
                        target === 'fio2' && value > 1
                            ? value / 100
                            : value;
                    break;
                }
            }
        }
        if (patient?.dateOfBirth) {
            const dob = new Date(patient.dateOfBirth);
            const now = new Date();
            let age = now.getUTCFullYear() -
                dob.getUTCFullYear();
            const month = now.getUTCMonth() -
                dob.getUTCMonth();
            if (month < 0 ||
                (month === 0 &&
                    now.getUTCDate() <
                        dob.getUTCDate())) {
                age -= 1;
            }
            input.age = age;
        }
        return input;
    }
    async recalculateFromUnderlyingData(hospitalId, actorId, admissionId) {
        const inputs = await this.collectUnderlyingInputs(hospitalId, admissionId);
        return this.recalculate(hospitalId, actorId, {
            admissionId,
            clinical: inputs,
        });
    }
    async recalculateActiveAdmissions(hospitalId, actorId) {
        /*
         * Explicit _id type fixes admission._id being inferred as unknown.
         */
        const admissions = await ICUAdmissionModel.find({
            hospitalId: new Types.ObjectId(hospitalId),
            status: {
                $in: [
                    'ADMITTED',
                    'STABILIZED',
                ],
            },
        })
            .select('_id')
            .lean();
        const results = [];
        for (const admission of admissions) {
            results.push(await this.recalculateFromUnderlyingData(hospitalId, actorId, admission._id.toString()));
        }
        return results;
    }
    async recalculate(hospitalId, actorId, input) {
        if (!Types.ObjectId.isValid(hospitalId) ||
            !Types.ObjectId.isValid(actorId)) {
            throw new Error('Invalid hospital or actor ID.');
        }
        if (!Types.ObjectId.isValid(input.admissionId)) {
            throw new Error('Invalid ICU admission ID.');
        }
        /*
         * Explicit lean result type fixes:
         * admission.hospitalId
         * admission._id
         * admission.patientId
         */
        const admission = await ICUAdmissionModel.findOne({
            _id: input.admissionId,
            hospitalId,
        }).lean();
        if (!admission) {
            throw new Error('ICU admission not found.');
        }
        const clinical = input.clinical || {};
        const labs = input.labs || {};
        const merged = {
            ...clinical,
            ...labs,
        };
        const sofa = this.calculateSOFA(merged);
        const apache = this.calculateAPACHEII(merged);
        const now = input.calculatedAt
            ? new Date(input.calculatedAt)
            : new Date();
        const docs = [
            {
                hospitalId: admission.hospitalId,
                admissionId: admission._id,
                patientId: admission.patientId,
                scoreType: ICUScoreType.SOFA,
                score: sofa.score,
                status: sofa.status,
                calculatedAt: now,
                windowStart: input.windowStart
                    ? new Date(input.windowStart)
                    : undefined,
                windowEnd: input.windowEnd
                    ? new Date(input.windowEnd)
                    : now,
                components: sofa.components,
                inputs: merged,
                calculationVersion: VERSION,
            },
            {
                hospitalId: admission.hospitalId,
                admissionId: admission._id,
                patientId: admission.patientId,
                scoreType: ICUScoreType.APACHE_II,
                score: apache.score,
                status: apache.status,
                calculatedAt: now,
                windowStart: input.windowStart
                    ? new Date(input.windowStart)
                    : undefined,
                windowEnd: input.windowEnd
                    ? new Date(input.windowEnd)
                    : now,
                components: apache.components,
                inputs: merged,
                calculationVersion: VERSION,
            },
        ];
        const saved = await ICUScoreModel.insertMany(docs);
        return saved;
    }
}
export const icuScoringService = new ICUScoringService();
