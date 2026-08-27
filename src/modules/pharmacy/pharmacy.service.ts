import { createHash } from 'crypto';
import { Types } from 'mongoose';

import { PricingCatalogueModel } from '../billing/billing.model.js';

import {
  InventoryItemModel,
  DispenseRecordModel,
} from './pharmacy.model.js';

import {
  CreateInventoryItemDTO,
  UpdateStockDTO,
  CreateDispenseRecordDTO,
  GetInventoryQueryDTO,
  GetDispenseQueryDTO,
  IInventoryItemDocument,
  IDispenseRecordDocument,
  DispenseStatus,
  IDispenseItem,
  PharmacyBillingStatus,
} from './pharmacy.types.js';

import {
  createCharge,
  getPricingCatalogue,
  resolvePrice,
} from '../billing/billing.service.js';

import {
  BillingSourceModule,
  ChargeCategory,
} from '../billing/billing.types.js';

/* =========================================================
   HELPERS
========================================================= */

const createError = (
  message: string,
  statusCode: number
) => {
  const error = new Error(message) as Error & {
    statusCode?: number;
  };

  error.statusCode = statusCode;

  return error;
};

/**
 * Generates a predictable Billing catalogue code.
 *
 * Example:
 *
 * Paracetamol 500mg
 * =>
 * PHARMACY_PARACETAMOL_500MG
 */
const generateBillingCode = (
  name: string
): string => {
  const normalized = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return `PHARMACY_${normalized}`;
};

/**
 * Billing's sourceId must be an ObjectId.
 *
 * A dispense record can contain several medicines, so each
 * medicine receives a deterministic ObjectId derived from
 * the dispense record ID and item index.
 *
 * This makes billing retries idempotent.
 */
const createBillingSourceId = (
  dispenseId: Types.ObjectId,
  itemIndex: number
): Types.ObjectId => {
  const hash = createHash('sha256')
    .update(
      `${String(dispenseId)}:PHARMACY:${itemIndex}`
    )
    .digest('hex')
    .slice(0, 24);

  return new Types.ObjectId(hash);
};

/**
 * Pharmacy medication billing is calculated from the inventory price
 * at dispense time. This generic catalogue is used only as the
 * centralized Pharmacy billing service metadata/currency source; its
 * catalogue price is never used as the medication charge price.
 */
const PHARMACY_SERVICE_CODE = 'PHARMACY_SERVICE';
const PHARMACY_DEPARTMENT_NAME = 'Pharmacy';

/* =========================================================
   SERVICE
========================================================= */

export class PharmacyService {
  /* =======================================================
     INVENTORY
  ======================================================= */

  static async createInventoryItem(
    hospitalId: string,
    dto: CreateInventoryItemDTO
  ): Promise<IInventoryItemDocument> {
    const reorderLevel =
      dto.reorderLevel ?? 10;

    const isLowStock =
      dto.quantityInStock <= reorderLevel;

    const billingCode =
      dto.billingCode?.trim().toUpperCase() ||
      generateBillingCode(dto.name);

    const item =
      await InventoryItemModel.create({
        hospitalId: new Types.ObjectId(hospitalId),

        name: dto.name,

        genericName:
          dto.genericName,

        category:
          dto.category,

        batchNumber:
          dto.batchNumber,

        unitPrice:
          dto.unitPrice,

        billingCode,

        pricingCatalogueItemId: dto.pricingCatalogueItemId
          ? new Types.ObjectId(dto.pricingCatalogueItemId)
          : undefined,

        quantityInStock:
          dto.quantityInStock,

        reorderLevel,

        unitOfMeasure:
          dto.unitOfMeasure,

        expiryDate:
          new Date(dto.expiryDate),

        isLowStock,
      });

    return item;
  }

  static async getInventory(
    hospitalId: string,
    query: GetInventoryQueryDTO
  ) {
    const page =
      Number(query.page) || 1;

    const limit =
      Number(query.limit) || 10;

    const skip =
      (page - 1) * limit;

    const filter: Record<
      string,
      unknown
    > = {
      hospitalId,
    };

    if (query.category) {
      filter.category =
        query.category;
    }

    if (query.isLowStock === 'true') {
      filter.isLowStock = true;
    }

    if (query.search) {
      filter.$or = [
        {
          name: {
            $regex: query.search,
            $options: 'i',
          },
        },
        {
          genericName: {
            $regex: query.search,
            $options: 'i',
          },
        },
        {
          batchNumber: {
            $regex: query.search,
            $options: 'i',
          },
        },
        {
          billingCode: {
            $regex: query.search,
            $options: 'i',
          },
        },
      ];
    }

    const [items, total] =
      await Promise.all([
        InventoryItemModel.find(filter)
          .sort({ name: 1 })
          .skip(skip)
          .limit(limit),

        InventoryItemModel.countDocuments(
          filter
        ),
      ]);

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(
        total / limit
      ),
    };
  }

  static async getInventoryItemById(
    hospitalId: string,
    itemId: string
  ): Promise<IInventoryItemDocument> {
    const item =
      await InventoryItemModel.findOne({
        _id: itemId,
        hospitalId,
      });

    if (!item) {
      throw createError(
        'Inventory item not found.',
        404
      );
    }

    return item;
  }

  static async updateStock(
    hospitalId: string,
    itemId: string,
    dto: UpdateStockDTO
  ): Promise<IInventoryItemDocument> {
    const item =
      await this.getInventoryItemById(
        hospitalId,
        itemId
      );

    const newQuantity =
      item.quantityInStock +
      dto.quantityChange;

    if (newQuantity < 0) {
      throw createError(
        'Stock quantity cannot drop below 0.',
        400
      );
    }

    item.quantityInStock =
      newQuantity;

    item.isLowStock =
      newQuantity <=
      item.reorderLevel;

    await item.save();

    return item;
  }

  /* =======================================================
     BILLING PRICING CATALOGUE
  ======================================================= */

  static async getPricingCatalogues(
    hospitalId: string,
    query: { search?: string; code?: string; planName?: string; page?: string; limit?: string }
  ) {
    return getPricingCatalogue(hospitalId, {
      search: query.search,
      code: query.code,
      planName: query.planName,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 50,
      category: ChargeCategory.PHARMACY,
      departmentName: PHARMACY_DEPARTMENT_NAME,
      activeOnly: true,
    });
  }

  /* =======================================================
     BILLING CAPTURE
  ======================================================= */

  private static async captureBilling(
    hospitalId: string,
    dispensedByUserId: string,
    record: IDispenseRecordDocument
  ) {
    const billingChargeIds: Types.ObjectId[] = [];
    const billingErrors: string[] = [];
    let successfulCharges = 0;

    for (let index = 0; index < record.items.length; index += 1) {
      const item = record.items[index];

      /*
       * An already captured item must never be charged again.
       * This also makes billing retries safe.
       */
      if (item.billingChargeId) {
        billingChargeIds.push(item.billingChargeId);
        successfulCharges += 1;
        continue;
      }

      try {
        const inventoryItem =
          await InventoryItemModel.findOne({
            _id: item.inventoryItemId,
            hospitalId,
          });

        if (!inventoryItem) {
          throw new Error(
            `Inventory item ${String(item.inventoryItemId)} no longer exists.`
          );
        }

        /*
         * Pharmacy medication billing is NOT based on a fixed pricing
         * catalogue price. The patient's charge is:
         *
         *   inventory unit price × dispensed quantity
         *
         * PHARMACY_SERVICE is only the centralized Billing service code
         * used to obtain the hospital's Pharmacy billing metadata/currency.
         */
        const billingUnitPrice = Number(item.unitPrice);
        if (!Number.isFinite(billingUnitPrice) || billingUnitPrice < 0) {
          throw new Error(
            `Invalid pharmacy unit price for '${inventoryItem.name}'.`
          );
        }

        const charge = await createCharge({
          hospitalId,
          patientId: record.patientId,
          description:
            `${inventoryItem.name} ` +
            `(${inventoryItem.unitOfMeasure}) x ${item.quantity}`,
          category: ChargeCategory.PHARMACY,
          sourceModule: BillingSourceModule.PHARMACY,
          sourceId: createBillingSourceId(record._id, index),
          serviceCode: PHARMACY_SERVICE_CODE,
          departmentName: PHARMACY_DEPARTMENT_NAME,
          quantity: item.quantity,
          overridePrice: billingUnitPrice,
          overrideReason:
            'Pharmacy medication billing uses the inventory unit price multiplied by the dispensed quantity.',
          chargedBy: dispensedByUserId,
          chargeDate: record.createdAt,
          notes: `Pharmacy medication dispense ${String(record._id)}`,
        });

        const chargeId = new Types.ObjectId(String(charge._id));
        billingChargeIds.push(chargeId);

        item.billingChargeId = chargeId;
        item.billingCode = PHARMACY_SERVICE_CODE;
        item.billingError = undefined;

        const chargeObject = charge as unknown as {
          unitPrice?: number;
          currency?: string;
          catalogueVersion?: number;
          cataloguePlanName?: string;
          cataloguePrice?: number;
          catalogueItemId?: Types.ObjectId;
        };

        item.billingUnitPrice = chargeObject.unitPrice ?? billingUnitPrice;
        item.billingCurrency = chargeObject.currency ?? 'NGN';
        item.billingCatalogueVersion = chargeObject.catalogueVersion;
        item.pricingCatalogueItemId = chargeObject.catalogueItemId;
        item.pricingCataloguePlanName = chargeObject.cataloguePlanName;
        item.pricingCataloguePrice = chargeObject.cataloguePrice;
        item.pricingCatalogueCurrency = chargeObject.currency ?? 'NGN';
        item.pricingCatalogueVersion = chargeObject.catalogueVersion;

        successfulCharges += 1;
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unknown billing error.';

        item.billingError = message;
        billingErrors.push(
          `${String(item.inventoryItemId)}: ${message}`
        );
      }
    }

    record.billingChargeIds = billingChargeIds;
    record.billingErrors = billingErrors;

    if (successfulCharges === record.items.length) {
      record.billingStatus = PharmacyBillingStatus.CAPTURED;
      record.billingCapturedAt = new Date();
    } else if (successfulCharges > 0) {
      record.billingStatus = PharmacyBillingStatus.PARTIAL;
      record.billingCapturedAt = undefined;
    } else {
      record.billingStatus = PharmacyBillingStatus.FAILED;
      record.billingCapturedAt = undefined;
    }

    await record.save();
    return record;
  }

  /* =======================================================
     DISPENSING
  ======================================================= */

  static async createDispenseRecord(
    hospitalId: string,
    dispensedByUserId: string,
    dto: CreateDispenseRecordDTO
  ): Promise<IDispenseRecordDocument> {
    const processedItems: IDispenseItem[] = [];
    let totalAmount = 0;
    const stockDeductions: Array<{
      item: IInventoryItemDocument;
      quantity: number;
    }> = [];

    if (!dto.items || dto.items.length === 0) {
      throw createError(
        'At least one medicine is required.',
        400
      );
    }

    if (!Types.ObjectId.isValid(dto.patientId)) {
      throw createError('Invalid patient ID.', 400);
    }

    if (dto.consultationId && !Types.ObjectId.isValid(dto.consultationId)) {
      throw createError('Invalid consultation ID.', 400);
    }

    /*
     * Pharmacy medication billing is calculated from the actual inventory
     * unit price. No Pharmacy pricing plan is required from the UI.
     *
     * We still resolve PHARMACY_SERVICE automatically so Billing can use
     * the hospital's centralized Pharmacy currency/service metadata. The
     * resolved catalogue price itself is never used as the medication
     * price.
     */
    let pharmacyCatalogue;
    try {
      pharmacyCatalogue = await resolvePrice({
        hospitalId,
        code: PHARMACY_SERVICE_CODE,
        departmentName: PHARMACY_DEPARTMENT_NAME,
        category: ChargeCategory.PHARMACY,
        serviceDate: new Date(),
      });
    } catch (error: unknown) {
      throw createError(
        error instanceof Error
          ? error.message
          : 'No active Pharmacy billing configuration is available.',
        400
      );
    }

    for (const reqItem of dto.items) {
      if (!Types.ObjectId.isValid(reqItem.inventoryItemId)) {
        throw createError(
          `Invalid inventory item ID: ${reqItem.inventoryItemId}.`,
          400
        );
      }

      const quantity = Number(reqItem.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw createError(
          'Each dispense quantity must be a positive whole number.',
          400
        );
      }

      const inventoryItem = await InventoryItemModel.findOne({
        _id: reqItem.inventoryItemId,
        hospitalId,
      });

      if (!inventoryItem) {
        throw createError(
          `Item ID ${reqItem.inventoryItemId} not found in inventory.`,
          404
        );
      }

      if (inventoryItem.quantityInStock < quantity) {
        throw createError(
          `Insufficient stock for '${inventoryItem.name}'. Available: ${inventoryItem.quantityInStock}, Requested: ${quantity}`,
          400
        );
      }

      const unitPrice = Number(inventoryItem.unitPrice);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw createError(
          `Invalid unit price for '${inventoryItem.name}'.`,
          400
        );
      }

      const itemTotal = unitPrice * quantity;
      totalAmount += itemTotal;

      processedItems.push({
        inventoryItemId: inventoryItem._id,
        quantity,
        unitPrice,
        totalPrice: itemTotal,
        billingCode: PHARMACY_SERVICE_CODE,
        pricingCatalogueItemId: pharmacyCatalogue.catalogueItemId,
        pricingCataloguePlanName: pharmacyCatalogue.name,
        pricingCataloguePrice: pharmacyCatalogue.price,
        pricingCatalogueCurrency: pharmacyCatalogue.currency,
        pricingCatalogueVersion: pharmacyCatalogue.version,
      });

      /* Deduct only after every validation above succeeds. */
      inventoryItem.quantityInStock -= quantity;
      inventoryItem.isLowStock =
        inventoryItem.quantityInStock <= inventoryItem.reorderLevel;
      stockDeductions.push({ item: inventoryItem, quantity });
    }

    let dispenseRecord: IDispenseRecordDocument;

    try {
      await Promise.all(
        stockDeductions.map(({ item }) => item.save())
      );

      dispenseRecord = await DispenseRecordModel.create({
        hospitalId: new Types.ObjectId(hospitalId),
        patientId: new Types.ObjectId(dto.patientId),
        consultationId: dto.consultationId
          ? new Types.ObjectId(dto.consultationId)
          : undefined,
        dispensedBy: new Types.ObjectId(dispensedByUserId),
        items: processedItems,
        totalAmount,
        status: DispenseStatus.DISPENSED,
        notes: dto.notes,
        billingStatus: PharmacyBillingStatus.NOT_ATTEMPTED,
        billingChargeIds: [],
        billingErrors: [],
      });
    } catch (error: unknown) {
      /*
       * Do not leave stock reduced if the dispense record could not be
       * created. Restore exactly what this request deducted.
       */
      await Promise.all(
        stockDeductions.map(async ({ item, quantity }) => {
          item.quantityInStock += quantity;
          item.isLowStock = item.quantityInStock <= item.reorderLevel;
          await item.save();
        })
      );

      throw error;
    }

    /*
     * Billing is isolated from the dispensing workflow. The dispense is
     * already recorded even if Billing temporarily fails.
     */
    try {
      await this.captureBilling(
        hospitalId,
        dispensedByUserId,
        dispenseRecord
      );
    } catch (error: unknown) {
      dispenseRecord.billingStatus = PharmacyBillingStatus.FAILED;
      dispenseRecord.billingErrors = [
        error instanceof Error
          ? error.message
          : 'Unable to capture pharmacy billing.',
      ];
      await dispenseRecord.save();
    }

    return dispenseRecord.populate([
      {
        path: 'patientId',
        select: 'firstName lastName mrn phone',
      },
      {
        path: 'dispensedBy',
        select: 'firstName lastName email',
      },
      {
        path: 'items.inventoryItemId',
        select: 'name genericName unitOfMeasure billingCode',
      },
      {
        path: 'billingChargeIds',
        select:
          'serviceCode description quantity unitPrice currency cataloguePrice catalogueVersion netAmount status',
      },
    ]);
  }

  /* =======================================================
     RETRY BILLING
  ======================================================= */

  static async retryBilling(
    hospitalId: string,
    dispensedByUserId: string,
    dispenseId: string
  ) {
    const record =
      await DispenseRecordModel.findOne({
        _id: dispenseId,
        hospitalId,
      });

    if (!record) {
      throw createError(
        'Dispense record not found.',
        404
      );
    }

    if (
      record.billingStatus ===
      PharmacyBillingStatus.CAPTURED
    ) {
      return record.populate([
        {
          path: 'patientId',
          select:
            'firstName lastName mrn phone',
        },
        {
          path: 'dispensedBy',
          select:
            'firstName lastName email',
        },
        {
          path:
            'items.inventoryItemId',
          select:
            'name genericName unitOfMeasure billingCode',
        },
        {
          path:
            'billingChargeIds',
          select:
            'serviceCode description quantity unitPrice currency cataloguePrice catalogueVersion netAmount status',
        },
      ]);
    }

    await this.captureBilling(
      hospitalId,
      dispensedByUserId,
      record
    );

    return record.populate([
      {
        path: 'patientId',
        select:
          'firstName lastName mrn phone',
      },

      {
        path: 'dispensedBy',
        select:
          'firstName lastName email',
      },

      {
        path:
          'items.inventoryItemId',
        select:
          'name genericName unitOfMeasure billingCode',
      },

      {
        path:
          'billingChargeIds',
        select:
          'serviceCode description quantity unitPrice currency cataloguePrice catalogueVersion netAmount status',
      },
    ]);
  }

  /* =======================================================
     LIST DISPENSE RECORDS
  ======================================================= */

  static async getDispenseRecords(
    hospitalId: string,
    query: GetDispenseQueryDTO
  ) {
    const page =
      Number(query.page) || 1;

    const limit =
      Number(query.limit) || 10;

    const skip =
      (page - 1) * limit;

    const filter: Record<
      string,
      unknown
    > = {
      hospitalId,
    };

    if (query.patientId) {
      filter.patientId =
        new Types.ObjectId(
          query.patientId
        );
    }

    if (query.status) {
      filter.status =
        query.status;
    }

    if (query.billingStatus) {
      filter.billingStatus =
        query.billingStatus;
    }

    const [records, total] =
      await Promise.all([
        DispenseRecordModel.find(filter)
          .populate(
            'patientId',
            'firstName lastName mrn phone'
          )
          .populate(
            'dispensedBy',
            'firstName lastName email'
          )
          .populate(
            'items.inventoryItemId',
            'name genericName unitOfMeasure billingCode'
          )
          .populate(
            'billingChargeIds',
            'serviceCode description quantity unitPrice currency cataloguePrice catalogueVersion netAmount status'
          )
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit),

        DispenseRecordModel.countDocuments(
          filter
        ),
      ]);

    return {
      records,
      total,
      page,
      limit,
      pages: Math.ceil(
        total / limit
      ),
    };
  }
}