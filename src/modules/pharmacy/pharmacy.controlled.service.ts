import { createHash } from 'crypto';
import { ClientSession, Types } from 'mongoose';
import { ControlledSubstanceLogModel } from './pharmacy.model.js';
import { ControlledSubstanceAction } from './pharmacy.types.js';

export class PharmacyControlledService {
  static async appendDispenseLog(input: {
    hospitalId: string;
    prescriptionId: string;
    dispenseRecordId: string;
    inventoryItemId: string;
    patientId: string;
    quantity: number;
    quantityBefore: number;
    quantityAfter: number;
    performedBy: string;
    secondVerifierId: string;
    reason: string;
    session?: ClientSession;
  }) {
    if (input.performedBy === input.secondVerifierId) {
      throw Object.assign(new Error('Controlled-substance dual sign-off requires two different authorized users.'), { statusCode: 400 });
    }

    const payload = JSON.stringify({ ...input, action: ControlledSubstanceAction.DISPENSE });
    const immutableHash = createHash('sha256').update(payload).digest('hex');

    return ControlledSubstanceLogModel.create({
      hospitalId: new Types.ObjectId(input.hospitalId),
      action: ControlledSubstanceAction.DISPENSE,
      prescriptionId: new Types.ObjectId(input.prescriptionId),
      dispenseRecordId: new Types.ObjectId(input.dispenseRecordId),
      inventoryItemId: new Types.ObjectId(input.inventoryItemId),
      patientId: new Types.ObjectId(input.patientId),
      quantity: input.quantity,
      quantityBefore: input.quantityBefore,
      quantityAfter: input.quantityAfter,
      performedBy: new Types.ObjectId(input.performedBy),
      secondVerifierId: new Types.ObjectId(input.secondVerifierId),
      reason: input.reason,
      immutableHash,
    }, { session: input.session });
  }
}
