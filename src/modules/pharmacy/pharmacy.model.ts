import { Schema, model } from 'mongoose';

import {
  IInventoryItemDocument,
  IDispenseRecordDocument,
  DrugCategory,
  UnitOfMeasure,
  DispenseStatus,
  PharmacyBillingStatus,
} from './pharmacy.types.js';

/* =========================================================
   INVENTORY ITEM
========================================================= */

const InventoryItemSchema =
  new Schema<IInventoryItemDocument>(
    {
      hospitalId: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
        required: true,
        index: true,
      },

      name: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },

      genericName: {
        type: String,
        trim: true,
      },

      category: {
        type: String,
        enum: Object.values(DrugCategory),
        default: DrugCategory.OTHER,
        index: true,
      },

      batchNumber: {
        type: String,
        required: true,
        trim: true,
      },

      /**
       * Internal pharmacy inventory price.
       * Patient billing is resolved through the centralized
       * Billing Pricing Catalogue.
       */
      unitPrice: {
        type: Number,
        required: true,
        min: 0,
      },

      /**
       * Central Billing Pricing Catalogue code.
       */
      billingCode: {
        type: String,
        trim: true,
        uppercase: true,
        index: true,
      },

      quantityInStock: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },

      reorderLevel: {
        type: Number,
        required: true,
        default: 10,
        min: 0,
      },

      unitOfMeasure: {
        type: String,
        enum: Object.values(UnitOfMeasure),
        default: UnitOfMeasure.TABLET,
      },

      expiryDate: {
        type: Date,
        required: true,
        index: true,
      },

      isLowStock: {
        type: Boolean,
        default: false,
        index: true,
      },
    },
    {
      timestamps: true,
    }
  );

/* =========================================================
   LOW STOCK HOOK
========================================================= */

InventoryItemSchema.pre('save', function () {
  this.isLowStock =
    this.quantityInStock <= this.reorderLevel;
});

/* =========================================================
   DISPENSE ITEM
========================================================= */

const DispenseItemSchema = new Schema(
  {
    inventoryItemId: {
      type: Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    /**
     * Internal pharmacy inventory price snapshot.
     */
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    billingCode: {
      type: String,
      trim: true,
      uppercase: true,
    },

    pricingCatalogueItemId: {
      type: Schema.Types.ObjectId,
      ref: 'PricingCatalogue',
    },

    pricingCataloguePlanName: {
      type: String,
      trim: true,
    },

    pricingCataloguePrice: {
      type: Number,
      min: 0,
    },

    pricingCatalogueCurrency: {
      type: String,
      trim: true,
      uppercase: true,
    },

    pricingCatalogueVersion: {
      type: Number,
      min: 1,
    },

    billingChargeId: {
      type: Schema.Types.ObjectId,
      ref: 'BillingCharge',
    },

    billingUnitPrice: {
      type: Number,
      min: 0,
    },

    billingCurrency: {
      type: String,
      trim: true,
      uppercase: true,
    },

    billingCatalogueVersion: {
      type: Number,
      min: 1,
    },

    billingError: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   DISPENSE RECORD
========================================================= */

const DispenseRecordSchema =
  new Schema<IDispenseRecordDocument>(
    {
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

      consultationId: {
        type: Schema.Types.ObjectId,
        ref: 'Consultation',
        index: true,
      },

      dispensedBy: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
        required: true,
        index: true,
      },

      items: {
        type: [DispenseItemSchema],
        required: true,
      },

      /**
       * Internal pharmacy total.
       */
      totalAmount: {
        type: Number,
        required: true,
        min: 0,
      },

      status: {
        type: String,
        enum: Object.values(DispenseStatus),
        default: DispenseStatus.DISPENSED,
        index: true,
      },

      notes: {
        type: String,
        trim: true,
      },

      /* =====================================================
         BILLING
      ===================================================== */

      billingStatus: {
        type: String,
        enum: Object.values(PharmacyBillingStatus),
        default: PharmacyBillingStatus.NOT_ATTEMPTED,
        index: true,
      },

      billingChargeIds: {
        type: [
          {
            type: Schema.Types.ObjectId,
            ref: 'BillingCharge',
          },
        ],
        default: [],
      },

      billingErrors: {
        type: [String],
        default: [],
      },

      billingCapturedAt: {
        type: Date,
      },
    },
    {
      timestamps: true,
    }
  );

/* =========================================================
   INDEXES
========================================================= */

DispenseRecordSchema.index({
  hospitalId: 1,
  patientId: 1,
  createdAt: -1,
});

DispenseRecordSchema.index({
  hospitalId: 1,
  billingStatus: 1,
  createdAt: -1,
});

InventoryItemSchema.index({
  hospitalId: 1,
  billingCode: 1,
});

/* =========================================================
   MODELS
========================================================= */

export const InventoryItemModel =
  model<IInventoryItemDocument>(
    'InventoryItem',
    InventoryItemSchema
  );

export const DispenseRecordModel =
  model<IDispenseRecordDocument>(
    'DispenseRecord',
    DispenseRecordSchema
  );