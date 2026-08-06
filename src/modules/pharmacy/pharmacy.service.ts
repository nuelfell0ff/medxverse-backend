import { Drug, DispenseRecord } from './pharmacy.model.js';
import { OPDVisit } from '../opd/opd.model.js';
import {
  CreateDrugDto,
  UpdateDrugDto,
  DispensePrescriptionDto,
  DrugQueryFilters,
  IDispensedItem,
} from './pharmacy.types.js';
import { ApiError } from '../../utils/ApiError.js';

export class PharmacyService {
  /**
   * Helper to generate unique SKU for inventory item
   */
  private static generateSKU(name: string): string {
    const prefix = name.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `DRG-${prefix}${random}`;
  }

  /**
   * Adds a new drug item to hospital inventory
   */
  static async addDrug(dto: CreateDrugDto, organizationId: string) {
    const sku = dto.sku ? dto.sku.toUpperCase() : this.generateSKU(dto.name);

    const existingSku = await Drug.findOne({ sku });
    if (existingSku) {
      throw new ApiError(409, `Drug item with SKU '${sku}' already exists.`);
    }

    const drug = await Drug.create({
      ...dto,
      sku,
      organizationId,
    });

    return drug;
  }

  /**
   * Retrieves paginated list of inventory drugs with search and filters
   */
  static async getInventory(organizationId: string, filters: DrugQueryFilters) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const query: any = { organizationId, isActive: true };

    if (filters.category) query.category = filters.category;

    if (filters.lowStock) {
      query.$expr = { $lte: ['$quantityInStock', '$reorderLevel'] };
    }

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { genericName: { $regex: filters.search, $options: 'i' } },
        { sku: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const [drugs, total] = await Promise.all([
      Drug.find(query).sort({ name: 1 }).skip(skip).limit(limit),
      Drug.countDocuments(query),
    ]);

    return {
      drugs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Gets a single drug item by ID
   */
  static async getDrugById(id: string, organizationId: string) {
    const drug = await Drug.findOne({ _id: id, organizationId });
    if (!drug) {
      throw new ApiError(404, 'Drug record not found in inventory.');
    }
    return drug;
  }

  /**
   * Updates drug item details or updates stock level
   */
  static async updateDrug(id: string, dto: UpdateDrugDto, organizationId: string) {
    const drug = await Drug.findOneAndUpdate(
      { _id: id, organizationId },
      { $set: dto },
      { new: true, runValidators: true }
    );

    if (!drug) {
      throw new ApiError(404, 'Drug record not found in inventory.');
    }

    return drug;
  }

  /**
   * Dispenses medication to a patient and updates inventory stock levels
   */
  static async dispensePrescription(
    dto: DispensePrescriptionDto,
    pharmacistId: string,
    organizationId: string
  ) {
    if (!dto.items || dto.items.length === 0) {
      throw new ApiError(400, 'At least one drug item must be selected for dispensing.');
    }

    const dispensedItems: IDispensedItem[] = [];
    let totalAmount = 0;

    // Process each requested drug item and verify stock availability
    for (const item of dto.items) {
      const drug = await Drug.findOne({
        _id: item.drugId,
        organizationId,
        isActive: true,
      });

      if (!drug) {
        throw new ApiError(404, `Drug ID '${item.drugId}' not found or inactive.`);
      }

      if (drug.quantityInStock < item.quantity) {
        throw new ApiError(
          400,
          `Insufficient stock for '${drug.name}'. Requested: ${item.quantity}, Available: ${drug.quantityInStock}`
        );
      }

      const subtotal = drug.unitPrice * item.quantity;
      totalAmount += subtotal;

      // Deduct stock
      drug.quantityInStock -= item.quantity;
      await drug.save();

      dispensedItems.push({
        drugId: drug._id,
        drugName: drug.name,
        quantity: item.quantity,
        unitPrice: drug.unitPrice,
        subtotal,
      });
    }

    // Create Dispense Record
    const dispenseRecord = await DispenseRecord.create({
      patientId: dto.patientId,
      opdVisitId: dto.opdVisitId,
      dispensedBy: pharmacistId,
      organizationId,
      items: dispensedItems,
      totalAmount,
      paymentStatus: dto.paymentStatus || 'PENDING',
      notes: dto.notes,
    });

    // If linked to an OPD Visit, mark prescribed items as dispensed
    if (dto.opdVisitId) {
      const visit = await OPDVisit.findOne({ _id: dto.opdVisitId, organizationId });
      if (visit && visit.prescriptions) {
        visit.prescriptions.forEach((p) => {
          const matched = dispensedItems.some((di) =>
            di.drugName.toLowerCase().includes(p.drugName.toLowerCase())
          );
          if (matched) p.dispensed = true;
        });
        await visit.save();
      }
    }

    return dispenseRecord.populate([
      { path: 'patientId', select: 'firstName lastName mrn insuranceType' },
      { path: 'dispensedBy', select: 'firstName lastName staffCode' },
    ]);
  }

  /**
   * Retrieves dispense history records
   */
  static async getDispenseHistory(organizationId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      DispenseRecord.find({ organizationId })
        .populate('patientId', 'firstName lastName mrn insuranceType')
        .populate('dispensedBy', 'firstName lastName staffCode')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      DispenseRecord.countDocuments({ organizationId }),
    ]);

    return {
      records,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}