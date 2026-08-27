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
      departmentName: 'Pharmacy',
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
    const billingChargeIds: Types.ObjectId[] =
      [];

    const billingErrors: string[] = [];

    let successfulCharges = 0;

    for (
      let index = 0;
      index < record.items.length;
      index += 1
    ) {
      const item =
        record.items[index];

      try {
        const inventoryItem =
          await InventoryItemModel.findOne({
            _id: item.inventoryItemId,
            hospitalId,
          });

        if (!inventoryItem) {
          throw new Error(
            `Inventory item ${String(
              item.inventoryItemId
            )} no longer exists.`
          );
        }

        let billingCode =
          inventoryItem.billingCode?.trim().toUpperCase() ||
          generateBillingCode(
            inventoryItem.name
          );

        /*
         * When a dispense item has an explicit Pricing Catalogue, the
         * catalogue's own service code must be used for Billing.
         * Do not derive the service code from the medicine name because
         * a valid centralized catalogue may use a generic code such as
         * PHARMACY_SERVICE.
         */
        if (item.pricingCatalogueItemId) {
          const selectedCatalogue =
            await PricingCatalogueModel.findOne({
              _id: item.pricingCatalogueItemId,
              hospitalId: new Types.ObjectId(hospitalId),
              isActive: true,
            }).lean();

          if (!selectedCatalogue) {
            throw new Error(
              'The selected pricing catalogue could not be found, is inactive, or does not belong to this hospital.'
            );
          }

          billingCode = String(selectedCatalogue.code).trim().toUpperCase();
        }

        const sourceId =
          createBillingSourceId(
            record._id,
            index
          );

        const charge =
          await createCharge({
            hospitalId,

            patientId:
              record.patientId,

            description:
              `${inventoryItem.name} ` +
              `(${inventoryItem.unitOfMeasure}) x ${item.quantity}`,

            category:
              ChargeCategory.PHARMACY,

            sourceModule:
              BillingSourceModule.PHARMACY,

            sourceId,

            serviceCode:
              billingCode,

            catalogueItemId: item.pricingCatalogueItemId,

            departmentName:
              'Pharmacy',

            quantity:
              item.quantity,

            chargedBy:
              dispensedByUserId,

            chargeDate:
              record.createdAt,

            notes:
              `Pharmacy dispense ${String(
                record._id
              )}`,
          });

        const chargeId =
          new Types.ObjectId(
            String(charge._id)
          );

        billingChargeIds.push(
          chargeId
        );

        item.billingChargeId =
          chargeId;

        item.billingCode =
          billingCode;

        item.billingError =
          undefined;

        /**
         * createCharge stores the resolved
         * catalogue price on the charge.
         *
         * Read it back for the dispense snapshot.
         */
        const chargeObject =
          charge as unknown as {
            unitPrice?: number;
            currency?: string;
            catalogueVersion?: number;
            cataloguePlanName?: string;
            cataloguePrice?: number;
            catalogueItemId?: Types.ObjectId;
          };

        item.billingUnitPrice =
          chargeObject.unitPrice;

        item.billingCurrency =
          chargeObject.currency;

        item.billingCatalogueVersion =
          chargeObject.catalogueVersion;

        item.pricingCatalogueItemId =
          chargeObject.catalogueItemId;
        item.pricingCataloguePlanName =
          chargeObject.cataloguePlanName;
        item.pricingCataloguePrice =
          chargeObject.cataloguePrice;
        item.pricingCatalogueCurrency =
          chargeObject.currency;
        item.pricingCatalogueVersion =
          chargeObject.catalogueVersion;

        successfulCharges += 1;
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unknown billing error.';

        item.billingError =
          message;

        billingErrors.push(
          `${record.items[index].inventoryItemId}: ${message}`
        );
      }
    }

    record.billingChargeIds =
      billingChargeIds;

    record.billingErrors =
      billingErrors;

    if (
      successfulCharges ===
      record.items.length
    ) {
      record.billingStatus =
        PharmacyBillingStatus.CAPTURED;

      record.billingCapturedAt =
        new Date();
    } else if (
      successfulCharges > 0
    ) {
      record.billingStatus =
        PharmacyBillingStatus.PARTIAL;
    } else {
      record.billingStatus =
        PharmacyBillingStatus.FAILED;
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
    const processedItems:
      IDispenseItem[] = [];

    let totalAmount = 0;

    if (
      !dto.items ||
      dto.items.length === 0
    ) {
      throw createError(
        'At least one medicine is required.',
        400
      );
    }

    /*
     * Preserve the existing stock workflow.
     */
    for (
      const reqItem of dto.items
    ) {
      const inventoryItem =
        await InventoryItemModel.findOne({
          _id: reqItem.inventoryItemId,
          hospitalId,
        });

      if (!inventoryItem) {
        throw createError(
          `Item ID ${reqItem.inventoryItemId} not found in inventory.`,
          404
        );
      }

      if (
        inventoryItem.quantityInStock <
        reqItem.quantity
      ) {
        throw createError(
          `Insufficient stock for '${inventoryItem.name}'. Available: ${inventoryItem.quantityInStock}, Requested: ${reqItem.quantity}`,
          400
        );
      }

      let billingCode =
        inventoryItem.billingCode?.trim().toUpperCase() ||
        generateBillingCode(
          inventoryItem.name
        );

      /*
       * If the Pharmacy UI explicitly selected a catalogue, use the
       * selected catalogue's service code. This is essential because
       * centralized Pharmacy plans may use generic service codes such
       * as PHARMACY_SERVICE rather than PHARMACY_<MEDICINE_NAME>.
       *
       * An inventory-level catalogue is also accepted as a fallback for
       * legacy inventory records, while the dispense-level selection
       * always takes precedence.
       */
      const catalogueItemId =
        reqItem.pricingCatalogueItemId ||
        (inventoryItem.pricingCatalogueItemId
          ? String(inventoryItem.pricingCatalogueItemId)
          : undefined);

      if (catalogueItemId) {
        if (!Types.ObjectId.isValid(catalogueItemId)) {
          throw createError(
            'Invalid pricing catalogue item ID.',
            400
          );
        }

        const selectedCatalogue =
          await PricingCatalogueModel.findOne({
            _id: new Types.ObjectId(catalogueItemId),
            hospitalId: new Types.ObjectId(hospitalId),
            isActive: true,
          }).lean();

        if (!selectedCatalogue) {
          throw createError(
            'The selected pricing catalogue is not active, does not belong to this hospital, or could not be found.',
            400
          );
        }

        billingCode = String(selectedCatalogue.code)
          .trim()
          .toUpperCase();
      }

      /*
       * Resolve the Pharmacy Pricing Catalogue before stock is
       * deducted. Billing performs the final hospital, category,
       * department, active-state, and effective-date validation.
       */
      const resolvedCatalogue =
        await resolvePrice({
          hospitalId,
          code: billingCode,
          catalogueItemId: catalogueItemId,
          departmentName: 'Pharmacy',
          category: ChargeCategory.PHARMACY,
          serviceDate: new Date(),
        });

      /*
       * Preserve the existing internal pharmacy inventory price.
       * Patient billing price comes from the selected catalogue.
       */
      const itemTotal =
        inventoryItem.unitPrice *
        reqItem.quantity;

      totalAmount +=
        itemTotal;

      /* Deduct stock only after catalogue validation succeeds. */
      inventoryItem.quantityInStock -=
        reqItem.quantity;

      inventoryItem.isLowStock =
        inventoryItem.quantityInStock <=
        inventoryItem.reorderLevel;

      await inventoryItem.save();

      processedItems.push({
        inventoryItemId:
          inventoryItem._id,

        quantity:
          reqItem.quantity,

        unitPrice:
          inventoryItem.unitPrice,

        totalPrice:
          itemTotal,

        billingCode,

        pricingCatalogueItemId:
          resolvedCatalogue.catalogueItemId,
        pricingCataloguePlanName:
          resolvedCatalogue.planName,
        pricingCataloguePrice:
          resolvedCatalogue.price,
        pricingCatalogueCurrency:
          resolvedCatalogue.currency,
        pricingCatalogueVersion:
          resolvedCatalogue.version,
      });
    }

    /*
     * Create the pharmacy record first.
     *
     * This guarantees the clinical/pharmacy workflow
     * succeeds even if Billing temporarily fails.
     */
    const dispenseRecord =
      await DispenseRecordModel.create({
        hospitalId:
          new Types.ObjectId(
            hospitalId
          ),

        patientId:
          new Types.ObjectId(
            dto.patientId
          ),

        consultationId:
          dto.consultationId
            ? new Types.ObjectId(
                dto.consultationId
              )
            : undefined,

        dispensedBy:
          new Types.ObjectId(
            dispensedByUserId
          ),

        items:
          processedItems,

        totalAmount,

        status:
          DispenseStatus.DISPENSED,

        notes:
          dto.notes,

        billingStatus:
          PharmacyBillingStatus.NOT_ATTEMPTED,

        billingChargeIds: [],

        billingErrors: [],
      });

    /*
     * Billing is intentionally isolated from the
     * dispensing workflow.
     *
     * If catalogue pricing is missing, the dispense
     * still succeeds and billingStatus becomes FAILED.
     */
    try {
      await this.captureBilling(
        hospitalId,
        dispensedByUserId,
        dispenseRecord
      );
    } catch (error: unknown) {
      dispenseRecord.billingStatus =
        PharmacyBillingStatus.FAILED;

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