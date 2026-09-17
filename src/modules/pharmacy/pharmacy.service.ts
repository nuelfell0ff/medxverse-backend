import { Types } from 'mongoose';
import { createHash } from 'node:crypto';
import {
  InventoryItemModel, DispenseRecordModel, PrescriptionModel, FormularyEntryModel,
  InventoryTransactionModel,
} from './pharmacy.model.js';
import {
  CreateInventoryItemDTO, UpdateStockDTO, CreateDispenseRecordDTO,
  GetInventoryQueryDTO, GetDispenseQueryDTO, CreatePrescriptionDTO,
  PrescriptionStatus, ScreeningStatus, DispenseStatus, InventoryTransactionType,
  CreateFormularyEntryDTO, GetPrescriptionQueryDTO, GetFormularyQueryDTO,
  FormularyStatus, PharmacyBillingStatus,
} from './pharmacy.types.js';
import { PharmacyScreeningService } from './pharmacy.screening.service.js';
import { PharmacyInventoryService } from './pharmacy.inventory.service.js';
import { PharmacyControlledService } from './pharmacy.controlled.service.js';
import { emitPharmacyEvent, PharmacyEventType } from './pharmacy.events.js';
import { publishEhrResource } from '../patient/ehr.publisher.js';
import { createCharge, resolvePrice } from '../billing/billing.service.js';
import { BillingSourceModule, ChargeCategory } from '../billing/billing.types.js';

const err = (message: string, statusCode = 400) => Object.assign(new Error(message), { statusCode });

export class PharmacyService {
  static async createInventoryItem(hospitalId: string, dto: CreateInventoryItemDTO) {
    if (!Types.ObjectId.isValid(hospitalId)) throw err('Invalid hospital ID.');
    const item = await InventoryItemModel.create({
      ...dto,
      hospitalId: new Types.ObjectId(hospitalId),
      pricingCatalogueItemId: dto.pricingCatalogueItemId ? new Types.ObjectId(dto.pricingCatalogueItemId) : undefined,
      expiryDate: new Date(dto.expiryDate),
      reorderLevel: dto.reorderLevel ?? 10,
      controlledSubstance: dto.controlledSubstance ?? false,
      isLowStock: dto.quantityInStock <= (dto.reorderLevel ?? 10),
    });
    if (item.quantityInStock > 0) {
      await InventoryTransactionModel.create({
        hospitalId: new Types.ObjectId(hospitalId),
        inventoryItemId: item._id,
        type: InventoryTransactionType.RECEIPT,
        quantity: item.quantityInStock,
        quantityBefore: 0,
        quantityAfter: item.quantityInStock,
        performedBy: new Types.ObjectId((dto as any).performedBy || hospitalId),
        reason: 'Initial pharmacy inventory receipt',
      });
    }
    if (item.isLowStock) emitPharmacyEvent(PharmacyEventType.LOW_STOCK, { hospitalId, inventoryItemId: String(item._id), quantity: item.quantityInStock });
    return item;
  }

  static async getInventory(hospitalId: string, query: GetInventoryQueryDTO) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const filter: any = { hospitalId: new Types.ObjectId(hospitalId) };
    if (query.category) filter.category = query.category;
    if (query.isLowStock === 'true') filter.isLowStock = true;
    if (query.controlledSubstance === 'true') filter.controlledSubstance = true;
    if (query.search) filter.$or = ['name', 'genericName', 'batchNumber', 'barcode', 'gtin'].map(field => ({ [field]: { $regex: query.search, $options: 'i' } }));
    const [items, total] = await Promise.all([
      InventoryItemModel.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
      InventoryItemModel.countDocuments(filter),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  static async getInventoryItemById(hospitalId: string, id: string) {
    const item = await InventoryItemModel.findOne({ _id: id, hospitalId });
    if (!item) throw err('Inventory item not found.', 404);
    return item;
  }

  static async updateStock(hospitalId: string, userId: string, itemId: string, dto: UpdateStockDTO) {
    const type = dto.transactionType || (dto.quantityChange >= 0 ? InventoryTransactionType.ADJUSTMENT_IN : InventoryTransactionType.ADJUSTMENT_OUT);
    const updated = await PharmacyInventoryService.adjust(hospitalId, itemId, dto.quantityChange, type, userId, dto.reason);
    emitPharmacyEvent(PharmacyEventType.STOCK_CHANGED, { hospitalId, inventoryItemId: itemId, quantityInStock: updated.quantityInStock });
    if (updated.isLowStock) emitPharmacyEvent(PharmacyEventType.LOW_STOCK, { hospitalId, inventoryItemId: itemId, quantity: updated.quantityInStock });
    return updated;
  }

  static async createPrescription(hospitalId: string, dto: CreatePrescriptionDTO) {
    if (!Types.ObjectId.isValid(dto.patientId)) throw err('Invalid patient ID.');
    if (dto.prescriberId && !Types.ObjectId.isValid(dto.prescriberId)) throw err('Invalid prescriber ID.');
    if (!dto.prescriberId && !dto.prescriberName?.trim()) throw err('A registered prescriber or prescriber name is required.');
    if (!dto.medications?.length) throw err('At least one prescribed medication is required.');

    const duplicate = dto.sourceRecordId ? await PrescriptionModel.findOne({
      hospitalId, source: dto.source, sourceRecordId: dto.sourceRecordId,
    }) : null;
    if (duplicate) return duplicate;

    const prescriptionNumber = `RX-${Date.now()}-${createHash('sha256').update(`${hospitalId}:${Date.now()}:${Math.random()}`).digest('hex').slice(0, 10).toUpperCase()}`;

    const prescription = await PrescriptionModel.create({
      hospitalId: new Types.ObjectId(hospitalId),
      patientId: new Types.ObjectId(dto.patientId),
      prescriberId: dto.prescriberId ? new Types.ObjectId(dto.prescriberId) : undefined,
      prescriberName: dto.prescriberName?.trim() || undefined,
      prescriptionNumber,
      source: dto.source,
      sourceRecordId: dto.sourceRecordId ? new Types.ObjectId(dto.sourceRecordId) : undefined,
      sourceSystem: dto.sourceSystem,
      department: dto.department,
      encounterId: dto.encounterId ? new Types.ObjectId(dto.encounterId) : undefined,
      medications: dto.medications.map(m => ({
        ...m,
        inventoryItemId: m.inventoryItemId ? new Types.ObjectId(m.inventoryItemId) : undefined,
      })),
      status: PrescriptionStatus.RECEIVED,
      screeningStatus: ScreeningStatus.PENDING,
      requestedAt: new Date(),
      notes: dto.notes,
    });

    emitPharmacyEvent(PharmacyEventType.PRESCRIPTION_RECEIVED, { hospitalId, prescriptionId: String(prescription._id), patientId: dto.patientId });
    return prescription;
  }

  static async screenPrescription(hospitalId: string, prescriptionId: string) {
    const result = await PharmacyScreeningService.screenPrescription(hospitalId, prescriptionId);
    emitPharmacyEvent(PharmacyEventType.SCREENING_COMPLETED, { hospitalId, prescriptionId, screeningStatus: result.status });
    return result;
  }

  static async approvePrescription(hospitalId: string, prescriptionId: string, pharmacistId: string) {
    const prescription = await PrescriptionModel.findOne({ _id: prescriptionId, hospitalId });
    if (!prescription) throw err('Prescription not found.', 404);
    if (prescription.screeningStatus === ScreeningStatus.BLOCKED) throw err('Prescription is blocked by clinical screening.', 409);
    prescription.status = PrescriptionStatus.APPROVED;
    prescription.approvedAt = new Date();
    prescription.reviewedAt = new Date();
    await prescription.save();
    return prescription;
  }

  static async getPrescriptions(hospitalId: string, query: GetPrescriptionQueryDTO) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const filter: any = { hospitalId: new Types.ObjectId(hospitalId) };
    if (query.patientId) filter.patientId = new Types.ObjectId(query.patientId);
    if (query.status) filter.status = query.status;
    const [prescriptions, total] = await Promise.all([
      PrescriptionModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      PrescriptionModel.countDocuments(filter),
    ]);
    return { prescriptions, total, page, limit, pages: Math.ceil(total / limit) };
  }

  static async getPrescriptionById(hospitalId: string, id: string) {
    const prescription = await PrescriptionModel.findOne({ _id: id, hospitalId })
      .populate('patientId', 'firstName lastName mrn allergies')
      .populate('prescriberId', 'firstName lastName email');
    if (!prescription) throw err('Prescription not found.', 404);
    return prescription;
  }

  static async createFormularyEntry(hospitalId: string, dto: CreateFormularyEntryDTO) {
    return FormularyEntryModel.create({
      hospitalId: new Types.ObjectId(hospitalId),
      ...dto,
      inventoryItemId: dto.inventoryItemId ? new Types.ObjectId(dto.inventoryItemId) : undefined,
      substituteInventoryItemIds: (dto.substituteInventoryItemIds || []).map(id => new Types.ObjectId(id)),
      status: dto.status || FormularyStatus.APPROVED,
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
    });
  }

  static async getFormulary(hospitalId: string, query: GetFormularyQueryDTO) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const filter: any = { hospitalId: new Types.ObjectId(hospitalId) };
    if (query.department) filter.department = query.department;
    if (query.status) filter.status = query.status;
    if (query.search) filter.$or = [{ medicationName: { $regex: query.search, $options: 'i' } }, { genericName: { $regex: query.search, $options: 'i' } }];
    const [entries, total] = await Promise.all([
      FormularyEntryModel.find(filter).sort({ medicationName: 1 }).skip((page - 1) * limit).limit(limit).lean(),
      FormularyEntryModel.countDocuments(filter),
    ]);
    return { entries, total, page, limit, pages: Math.ceil(total / limit) };
  }

  private static async captureBilling(hospitalId: string, dispensedByUserId: string, record: any) {
    if (record.billingChargeIds?.length) {
      record.billingChargeId = record.billingChargeIds[0];
      record.billingStatus = PharmacyBillingStatus.CAPTURED;
      record.billingErrors = [];
      record.billingCapturedAt = record.billingCapturedAt ?? new Date();
      await record.save();
      return record;
    }

    if (!record.items?.length) {
      record.billingStatus = PharmacyBillingStatus.FAILED;
      record.billingErrors = ['Cannot bill an empty pharmacy dispense.'];
      await record.save();
      return record;
    }

    const calculatedTotal = record.items.reduce((total: number, item: any) => {
      const unitPrice = Number(item.unitPrice);
      const quantity = Number(item.quantity);
      const itemTotal = Number(item.totalPrice);
      if (!Number.isFinite(unitPrice) || unitPrice < 0 || !Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(itemTotal) || Math.abs(itemTotal - unitPrice * quantity) > 0.01) {
        throw err(`Invalid pricing data for inventory item ${String(item.inventoryItemId)}.`);
      }
      return total + unitPrice * quantity;
    }, 0);

    if (Math.abs(Number(record.totalAmount) - calculatedTotal) > 0.01) {
      throw err('Pharmacy dispense total does not match the medication totals.');
    }

    const catalogue = await resolvePrice({
      hospitalId,
      code: 'PHARMACY_SERVICE',
      departmentName: 'Pharmacy',
      category: ChargeCategory.PHARMACY,
      serviceDate: record.createdAt,
    });

    const descriptionLines = await Promise.all(record.items.map(async (item: any) => {
      const inventoryItem = await InventoryItemModel.findOne({ _id: item.inventoryItemId, hospitalId }).select('name unitOfMeasure');
      return `${inventoryItem?.name || `Inventory item ${String(item.inventoryItemId)}`} (${inventoryItem?.unitOfMeasure || 'UNIT'}) x ${item.quantity}`;
    }));

    const sourceId = new Types.ObjectId(createHash('sha256').update(`${String(record._id)}:PHARMACY`).digest('hex').slice(0, 24));
    const cataloguePrice = Number(catalogue.price);
    const chargeInput: any = {
      hospitalId,
      patientId: record.patientId,
      description: `Pharmacy dispense ${String(record._id)}: ${descriptionLines.join('; ')}`,
      category: ChargeCategory.PHARMACY,
      sourceModule: BillingSourceModule.PHARMACY,
      sourceId,
      serviceCode: 'PHARMACY_SERVICE',
      departmentName: 'Pharmacy',
      quantity: 1,
      chargedBy: dispensedByUserId,
      chargeDate: record.createdAt,
      notes: `Aggregate Pharmacy medication dispense ${String(record._id)}`,
    };

    if (!Number.isFinite(cataloguePrice) || cataloguePrice < 0) {
      throw err('The active Pharmacy pricing catalogue returned an invalid price.');
    }

    if (Math.abs(calculatedTotal - cataloguePrice) > 0.01) {
      chargeInput.overridePrice = calculatedTotal;
      chargeInput.overrideReason = 'Pharmacy medication billing uses the sum of each dispensed medicine inventory unit price multiplied by quantity.';
    }

    const charge = await createCharge(chargeInput);
    const chargeId = new Types.ObjectId(String(charge._id));
    const chargeObject = charge as any;

    record.billingChargeId = chargeId;
    record.billingChargeIds = [chargeId];
    record.billingErrors = [];
    record.billingStatus = PharmacyBillingStatus.CAPTURED;
    record.billingCapturedAt = new Date();

    for (const item of record.items) {
      item.billingChargeId = undefined;
      item.billingCode = 'PHARMACY_SERVICE';
      item.billingError = undefined;
      item.billingUnitPrice = item.unitPrice;
      item.billingCurrency = chargeObject.currency ?? catalogue.currency ?? 'NGN';
      item.billingCatalogueVersion = chargeObject.catalogueVersion ?? catalogue.version;
      item.pricingCatalogueItemId = chargeObject.catalogueItemId ?? catalogue.catalogueItemId;
      item.pricingCataloguePlanName = chargeObject.cataloguePlanName ?? catalogue.name;
      item.pricingCataloguePrice = chargeObject.cataloguePrice ?? catalogue.price;
      item.pricingCatalogueCurrency = chargeObject.currency ?? catalogue.currency ?? 'NGN';
      item.pricingCatalogueVersion = chargeObject.catalogueVersion ?? catalogue.version;
    }

    await record.save();
    return record;
  }

  static async retryBilling(hospitalId: string, pharmacistId: string, dispenseId: string) {
    if (!Types.ObjectId.isValid(dispenseId)) throw err('Invalid dispense record ID.');
    const record = await DispenseRecordModel.findOne({ _id: dispenseId, hospitalId });
    if (!record) throw err('Dispense record not found.', 404);
    if (record.billingStatus === PharmacyBillingStatus.CAPTURED) return record;
    try {
      await this.captureBilling(hospitalId, pharmacistId, record);
    } catch (error: any) {
      record.billingStatus = PharmacyBillingStatus.FAILED;
      record.billingErrors = [error?.message || 'Unable to capture pharmacy billing.'];
      await record.save();
      throw error;
    }
    return record;
  }

  static async createDispenseRecord(hospitalId: string, pharmacistId: string, dto: CreateDispenseRecordDTO) {
    const session = await (await import('mongoose')).default.startSession();
    let record: any;
    try {
      await session.withTransaction(async () => {
        const prescription = await PrescriptionModel.findOne({ _id: dto.prescriptionId, hospitalId }).session(session);
        if (!prescription) throw err('Prescription not found.', 404);
        if (![PrescriptionStatus.APPROVED, PrescriptionStatus.PARTIALLY_DISPENSED].includes(prescription.status)) throw err('Prescription is not approved for dispensing.', 409);
        if (prescription.screeningStatus === ScreeningStatus.BLOCKED) throw err('Prescription is blocked by screening.', 409);
        if (!dto.items?.length) throw err('At least one medicine is required for dispensing.');

        const processed: any[] = [];
        let totalAmount = 0;

        for (const requested of dto.items) {
          const medication = prescription.medications[requested.prescriptionMedicationIndex];
          if (!medication) throw err(`Invalid prescription medication index: ${requested.prescriptionMedicationIndex}.`);
          if (!Types.ObjectId.isValid(requested.inventoryItemId)) throw err('Invalid inventory item ID.');
          if (!requested.barcodeScanned?.trim()) throw err(`A barcode scan is required for ${medication.medicationName}.`);

          const inventory = await InventoryItemModel.findOne({
            _id: requested.inventoryItemId,
            hospitalId,
            isActive: true,
          }).session(session);
          if (!inventory) throw err('Inventory item not found.', 404);

          if (medication.barcode && medication.barcode !== requested.barcodeScanned) throw err(`Barcode does not match the prescribed medication: ${medication.medicationName}.`, 409);
          if (inventory.barcode && inventory.barcode !== requested.barcodeScanned) throw err(`Scanned barcode does not match inventory item ${inventory.name}.`, 409);
          if (inventory.expiryDate <= new Date()) throw err(`Inventory item ${inventory.name} is expired.`, 409);
          if (inventory.controlledSubstance && !dto.secondVerifierId) throw err(`Controlled substance ${inventory.name} requires a second authorized sign-off.`, 403);
          if (inventory.controlledSubstance && dto.secondVerifierId === pharmacistId) throw err('The second controlled-substance verifier must be a different user.', 400);

          const before = inventory.quantityInStock;
          const updated = await PharmacyInventoryService.atomicDecrement(
            hospitalId,
            requested.inventoryItemId,
            requested.quantity,
            pharmacistId,
            `Dispense against prescription ${dto.prescriptionId}`,
            'Prescription',
            dto.prescriptionId,
            session,
          );

          const total = inventory.unitPrice * requested.quantity;
          totalAmount += total;
          processed.push({
            prescriptionMedicationIndex: requested.prescriptionMedicationIndex,
            inventoryItemId: new Types.ObjectId(requested.inventoryItemId),
            quantity: requested.quantity,
            barcodeScanned: requested.barcodeScanned,
            barcodeVerified: true,
            unitPrice: inventory.unitPrice,
            totalPrice: total,
            _controlled: inventory.controlledSubstance ? {
              before,
              after: updated.quantityInStock,
              inventoryItemId: requested.inventoryItemId,
              quantity: requested.quantity,
            } : undefined,
          });
        }

        record = await DispenseRecordModel.create([{
          hospitalId: new Types.ObjectId(hospitalId),
          patientId: prescription.patientId,
          prescriptionId: prescription._id,
          encounterId: prescription.encounterId,
          dispensedBy: new Types.ObjectId(pharmacistId),
          secondVerifierId: dto.secondVerifierId ? new Types.ObjectId(dto.secondVerifierId) : undefined,
          items: processed.map(({ _controlled, ...item }) => item),
          totalAmount,
          status: DispenseStatus.DISPENSED,
          screeningStatus: prescription.screeningStatus,
          emarReferenceId: dto.emarReferenceId ? new Types.ObjectId(dto.emarReferenceId) : undefined,
          notes: dto.notes,
          billingStatus: PharmacyBillingStatus.NOT_ATTEMPTED,
          billingErrors: [],
        }], { session }).then(rows => rows[0]);

        for (const item of processed) {
          if (item._controlled) {
            await PharmacyControlledService.appendDispenseLog({
              hospitalId,
              prescriptionId: dto.prescriptionId,
              dispenseRecordId: String(record._id),
              inventoryItemId: item._controlled.inventoryItemId,
              patientId: String(prescription.patientId),
              quantity: item._controlled.quantity,
              quantityBefore: item._controlled.before,
              quantityAfter: item._controlled.after,
              performedBy: pharmacistId,
              secondVerifierId: dto.secondVerifierId!,
              reason: `Controlled substance dispense ${String(record._id)}`,
              session,
            });
          }
        }

        prescription.status = PrescriptionStatus.DISPENSED;
        await prescription.save({ session });

        emitPharmacyEvent(PharmacyEventType.DISPENSED, {
          hospitalId, dispenseRecordId: String(record._id), patientId: String(record.patientId),
        });
      });
    } finally {
      await session.endSession();
    }

    try {
      await this.captureBilling(hospitalId, pharmacistId, record);
    } catch (error: any) {
      record.billingStatus = PharmacyBillingStatus.FAILED;
      record.billingErrors = [error?.message || 'Unable to capture pharmacy billing.'];
      await record.save();
    }

    // Downstream integrations happen after the clinical transaction commits.
    try {
      await publishEhrResource({
        hospitalId,
        patientId: String(record.patientId),
        actorId: pharmacistId,
        role: 'PHARMACY',
        resourceType: 'MedicationStatement',
        resourceId: String(record._id),
        status: record.status,
        department: 'Pharmacy',
        resource: {
          resourceType: 'MedicationStatement',
          id: String(record._id),
          prescriptionId: String(record.prescriptionId),
          effectiveDateTime: record.createdAt,
          medication: record.items.map((item: any) => ({
            inventoryItemId: String(item.inventoryItemId),
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            barcodeVerified: item.barcodeVerified,
          })),
          emarReferenceId: record.emarReferenceId ? String(record.emarReferenceId) : undefined,
        },
        reason: 'Integrated Pharmacy dispense published to Unified EHR.',
      });
    } catch {
      // The dispense remains authoritative; EHR publication can be retried by an outbox worker.
    }

    return record.populate([
      { path: 'patientId', select: 'firstName lastName mrn phone allergies' },
      { path: 'prescriptionId' },
      { path: 'dispensedBy', select: 'firstName lastName email' },
      { path: 'items.inventoryItemId', select: 'name genericName strength dosageForm unitOfMeasure barcode controlledSubstance' },
    ]);
  }

  static async getDispenseRecords(hospitalId: string, query: GetDispenseQueryDTO) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const filter: any = { hospitalId: new Types.ObjectId(hospitalId) };
    if (query.patientId) filter.patientId = new Types.ObjectId(query.patientId);
    if (query.prescriptionId) filter.prescriptionId = new Types.ObjectId(query.prescriptionId);
    if (query.status) filter.status = query.status;
    if (query.billingStatus) filter.billingStatus = query.billingStatus;
    const [records, total] = await Promise.all([
      DispenseRecordModel.find(filter)
        .populate('patientId', 'firstName lastName mrn phone allergies')
        .populate('prescriptionId')
        .populate('dispensedBy', 'firstName lastName email')
        .populate('items.inventoryItemId', 'name genericName strength dosageForm unitOfMeasure barcode controlledSubstance')
        .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      DispenseRecordModel.countDocuments(filter),
    ]);
    return { records, total, page, limit, pages: Math.ceil(total / limit) };
  }

  static async getInventoryLedger(hospitalId: string, itemId: string, page = 1, limit = 50) {
    return InventoryTransactionModel.find({ hospitalId, inventoryItemId: itemId }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
  }
}
