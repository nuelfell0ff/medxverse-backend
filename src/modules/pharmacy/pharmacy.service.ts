import { Types } from 'mongoose';
import { Medication, Prescription } from './pharmacy.model.js';
import { Patient } from '../patient/patient.model.js';
import { Staff } from '../staff/staff.model.js';
import {
  CreateMedicationDTO,
  AddStockBatchDTO,
  CreatePrescriptionDTO,
  DispensePrescriptionDTO,
  PrescriptionStatus,
  IPrescriptionItem,
  IStockBatch,
} from './pharmacy.types.js';

export class PharmacyService {
  // --- MEDICATION INVENTORY MANAGEMENT ---

  public static async createMedication(hospitalId: string, dto: CreateMedicationDTO) {
    const existing = await Medication.findOne({ hospitalId, name: dto.name });
    if (existing) {
      throw new Error(`Medication '${dto.name}' already exists in inventory`);
    }

    const batches = [];
    if (dto.initialStock) {
      batches.push({
        batchNumber: dto.initialStock.batchNumber,
        quantity: dto.initialStock.quantity,
        unitPrice: dto.initialStock.unitPrice,
        expiryDate: new Date(dto.initialStock.expiryDate),
        receivedDate: new Date(),
      });
    }

    const totalQuantity = batches.reduce((acc, b) => acc + b.quantity, 0);

    const medication = await Medication.create({
      ...dto,
      hospitalId,
      batches,
      totalQuantity,
    });

    return medication;
  }

  public static async getMedications(
    hospitalId: string,
    filters: { search?: string; category?: string; lowStock?: boolean; page?: number; limit?: number }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = { hospitalId };

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { genericName: { $regex: filters.search, $options: 'i' } },
      ];
    }
    if (filters.category) query.category = filters.category;
    if (filters.lowStock) {
      query.$expr = { $lte: ['$totalQuantity', '$minReorderLevel'] };
    }

    const [medications, total] = await Promise.all([
      Medication.find(query).sort({ name: 1 }).skip(skip).limit(limit),
      Medication.countDocuments(query),
    ]);

    return {
      medications,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    };
  }

  public static async addStockBatch(medicationId: string, hospitalId: string, dto: AddStockBatchDTO) {
    const medication = await Medication.findOne({ _id: medicationId, hospitalId });
    if (!medication) {
      throw new Error('Medication record not found');
    }

    medication.batches.push({
      batchNumber: dto.batchNumber,
      quantity: dto.quantity,
      unitPrice: dto.unitPrice,
      expiryDate: new Date(dto.expiryDate),
      receivedDate: new Date(),
    });

    await medication.save();
    return medication;
  }

  // --- PRESCRIPTION MANAGEMENT ---

  public static async createPrescription(hospitalId: string, dto: CreatePrescriptionDTO) {
    const patient = await Patient.findOne({ _id: dto.patientId, hospitalId });
    if (!patient) throw new Error('Patient record not found');

    const doctor = await Staff.findOne({ _id: dto.doctorId, hospitalId, role: 'DOCTOR' });
    if (!doctor) throw new Error('Doctor record not found');

    // Build items with selling prices from inventory
    const preparedItems = await Promise.all(
      dto.items.map(async (item) => {
        const med = await Medication.findOne({ _id: item.medicationId, hospitalId });
        if (!med) throw new Error(`Medication with ID ${item.medicationId} not found`);

        return {
          medicationId: med._id,
          medicationName: med.name,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          quantityPrescribed: item.quantityPrescribed,
          quantityDispensed: 0,
          unitPrice: med.sellingPricePerUnit,
          isDispensed: false,
        };
      })
    );

    const rxCount = await Prescription.countDocuments({ hospitalId });
    const prescriptionNumber = `RX-${Date.now().toString().slice(-6)}-${rxCount + 1}`;

    const prescription = await Prescription.create({
      hospitalId,
      prescriptionNumber,
      patientId: dto.patientId,
      doctorId: dto.doctorId,
      ipdAdmissionId: dto.ipdAdmissionId,
      items: preparedItems,
      notes: dto.notes,
      status: PrescriptionStatus.PENDING,
    });

    return prescription.populate([
      { path: 'patientId', select: 'mrn firstName lastName category' },
      { path: 'doctorId', select: 'firstName lastName department' },
    ]);
  }

  public static async getPrescriptions(
    hospitalId: string,
    filters: { status?: PrescriptionStatus; patientId?: string; page?: number; limit?: number }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = { hospitalId };

    if (filters.status) query.status = filters.status;
    if (filters.patientId) query.patientId = filters.patientId;

    const [prescriptions, total] = await Promise.all([
      Prescription.find(query)
        .populate('patientId', 'mrn firstName lastName category')
        .populate('doctorId', 'firstName lastName department')
        .populate('dispensedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Prescription.countDocuments(query),
    ]);

    return {
      prescriptions,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // --- DISPENSING & FEFO INVENTORY DEPLETION ---

  public static async dispensePrescription(
    prescriptionId: string,
    hospitalId: string,
    dto: DispensePrescriptionDTO
  ) {
    const rx = await Prescription.findOne({ _id: prescriptionId, hospitalId });
    if (!rx) throw new Error('Prescription not found');

    if (rx.status === PrescriptionStatus.DISPENSED) {
      throw new Error('Prescription has already been fully dispensed');
    }

    // Process each item to dispense
    for (const reqItem of dto.items) {
      const rxItem = rx.items.find((i: IPrescriptionItem) => i.medicationId.toString() === reqItem.medicationId);
      if (!rxItem) throw new Error(`Item ${reqItem.medicationId} is not in this prescription`);

      const remainingNeeded = rxItem.quantityPrescribed - rxItem.quantityDispensed;
      if (reqItem.quantityToDispense > remainingNeeded) {
        throw new Error(
          `Cannot dispense ${reqItem.quantityToDispense} for ${rxItem.medicationName}. Only ${remainingNeeded} remaining.`
        );
      }

      // Deplete from Medication Stock (First-Expiry-First-Out / FEFO)
      const med = await Medication.findOne({ _id: reqItem.medicationId, hospitalId });
      if (!med) throw new Error(`Medication ${rxItem.medicationName} missing from inventory`);

      if (med.totalQuantity < reqItem.quantityToDispense) {
        throw new Error(`Insufficient stock for ${med.name}. Available: ${med.totalQuantity}`);
      }

      let toDeduct = reqItem.quantityToDispense;

      // Sort batches by earliest expiry date (FEFO)
      med.batches.sort((a: IStockBatch, b: IStockBatch) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

      for (const batch of med.batches) {
        if (toDeduct <= 0) break;

        if (batch.quantity >= toDeduct) {
          batch.quantity -= toDeduct;
          toDeduct = 0;
        } else {
          toDeduct -= batch.quantity;
          batch.quantity = 0;
        }
      }

      // Remove depleted batches
      med.batches = med.batches.filter((b: IStockBatch) => b.quantity > 0);
      await med.save();

      // Update RX Item status
      rxItem.quantityDispensed += reqItem.quantityToDispense;
      if (rxItem.quantityDispensed >= rxItem.quantityPrescribed) {
        rxItem.isDispensed = true;
      }
    }

    // Evaluate global status of prescription
    const allDispensed = rx.items.every((i: IPrescriptionItem) => i.isDispensed);
    const someDispensed = rx.items.some((i: IPrescriptionItem) => i.quantityDispensed > 0);

    rx.status = allDispensed
      ? PrescriptionStatus.DISPENSED
      : someDispensed
      ? PrescriptionStatus.PARTIALLY_DISPENSED
      : PrescriptionStatus.PENDING;

    rx.dispensedBy = new Types.ObjectId(dto.dispensedById);
    rx.dispensedAt = new Date();

    await rx.save();
    return rx.populate([
      { path: 'patientId', select: 'mrn firstName lastName category' },
      { path: 'doctorId', select: 'firstName lastName' },
    ]);
  }
}