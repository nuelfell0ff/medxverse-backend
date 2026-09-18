import { Types } from 'mongoose';
import { AnalyzerInterfaceModel, SpecimenModel } from './lab.extended.model.js';
import { LabOrderModel } from './lab.model.js';
import { AnalyzerProtocol, EntryMethod, ILabResultField } from './lab.types.js';
import { LabService } from './lab.service.js';

const unwrap = (value: string) => value.replace(/^\u000b|\u001c\r?\n?$/g, '');

export class LabAnalyzerService {
  static parseHL7(message: string): { accessionNumber: string; analyzerName?: string; analyzerResultId?: string; results: ILabResultField[] } {
    const segments = unwrap(message).split(/\r?\n|\r/).filter(Boolean);
    let accessionNumber = '';
    let analyzerName: string | undefined;
    let analyzerResultId: string | undefined;
    const results: ILabResultField[] = [];
    for (const segment of segments) {
      const fields = segment.split('|');
      if (fields[0] === 'MSH') analyzerName = fields[2] || fields[3] || undefined;
      if (fields[0] === 'OBR') accessionNumber = fields[3] || fields[2] || fields[4] || accessionNumber;
      if (fields[0] === 'OBX') {
        const value = fields[5] || '';
        const parameterName = fields[3] || fields[2] || 'Unknown';
        const unit = fields[6] || undefined;
        const referenceRange = fields[7] || undefined;
        analyzerResultId = fields[1] || analyzerResultId;
        results.push({ parameterName, value, unit, referenceRange, flag: 'NORMAL' as any, entryMethod: EntryMethod.ANALYZER_AUTOMATED, analyzerName, analyzerResultId });
      }
    }
    if (!accessionNumber) throw new Error('HL7 message does not contain an accession number.');
    if (!results.length) throw new Error('HL7 message does not contain laboratory results.');
    return { accessionNumber, analyzerName, analyzerResultId, results };
  }

  static parseASTM(message: string): { accessionNumber: string; analyzerName?: string; analyzerResultId?: string; results: ILabResultField[] } {
    const records = unwrap(message).split(/\r?\n|\r/).filter(Boolean).map(line => line.replace(/^\d+/, ''));
    let accessionNumber = '';
    let analyzerName: string | undefined;
    let analyzerResultId: string | undefined;
    const results: ILabResultField[] = [];
    for (const record of records) {
      const fields = record.split('|');
      if (record.startsWith('H|')) analyzerName = fields[4] || fields[3] || undefined;
      if (record.startsWith('P|')) accessionNumber = fields[3] || accessionNumber;
      if (record.startsWith('O|')) accessionNumber = fields[2] || accessionNumber;
      if (record.startsWith('R|')) {
        const parameterName = fields[2] || fields[1] || 'Unknown';
        const value = fields[3] || '';
        const unit = fields[4] || undefined;
        const referenceRange = fields[5] || undefined;
        analyzerResultId = fields[1] || analyzerResultId;
        results.push({ parameterName, value, unit, referenceRange, flag: 'NORMAL' as any, entryMethod: EntryMethod.ANALYZER_AUTOMATED, analyzerName, analyzerResultId });
      }
    }
    if (!accessionNumber) throw new Error('ASTM message does not contain an accession number.');
    if (!results.length) throw new Error('ASTM message does not contain laboratory results.');
    return { accessionNumber, analyzerName, analyzerResultId, results };
  }

  static async ingest(hospitalId: string, userId: string, protocol: AnalyzerProtocol, payload: string | { accessionNumber: string; analyzerName: string; analyzerResultId?: string; results: ILabResultField[] }) {
    const parsed = typeof payload === 'string' ? (protocol === AnalyzerProtocol.HL7 ? this.parseHL7(payload) : this.parseASTM(payload)) : payload;
    const order = await LabOrderModel.findOne({ hospitalId: new Types.ObjectId(hospitalId), accessionNumber: parsed.accessionNumber });
    if (!order) throw new Error('Laboratory order not found for analyzer accession number.');
    const analyzerName = parsed.analyzerName || 'Analyzer';
    await AnalyzerInterfaceModel.findOneAndUpdate({ hospitalId: new Types.ObjectId(hospitalId), name: analyzerName }, { $set: { lastMessageAt: new Date(), lastSeenAt: new Date() }, $setOnInsert: { hospitalId: new Types.ObjectId(hospitalId), name: analyzerName, protocol, isActive: true } }, { upsert: true, new: true });
    const specimen = await SpecimenModel.findOne({ orderId: order._id, hospitalId: new Types.ObjectId(hospitalId) });
    if (specimen && specimen.status !== 'PROCESSED') await LabService.processSpecimen(hospitalId, order._id.toString(), userId, { barcode: specimen.barcode, notes: 'Analyzer processing initiated.' });
    return LabService.recordResults(hospitalId, order._id.toString(), userId, { results: parsed.results.map(result => ({ ...result, entryMethod: EntryMethod.ANALYZER_AUTOMATED, analyzerName, analyzerResultId: parsed.analyzerResultId || result.analyzerResultId })) });
  }

  static async buildOrderMessage(hospitalId: string, orderId: string, protocol: AnalyzerProtocol) {
    const order = await LabOrderModel.findOne({ _id: orderId, hospitalId: new Types.ObjectId(hospitalId) }).populate('patientId', 'firstName lastName mrn');
    if (!order) throw new Error('Laboratory order not found.');
    const patient = order.patientId as any;
    if (protocol === AnalyzerProtocol.HL7) {
      return [
        `MSH|^~\\&|MEDXVERSE|LIS|||${new Date().toISOString()}||ORM^O01|${order._id}|P|2.5`,
        `PID|||${patient?._id || ''}||${patient?.lastName || ''}^${patient?.firstName || ''}|||`,
        `OBR|1|${order.accessionNumber}|${order.accessionNumber}|${order.testName}|||${order.sampleCollectionScheduledAt?.toISOString() || ''}`,
      ].join('\r');
    }
    return [
      `H|\\^&|||MEDXVERSE LIS`,
      `P|1|${patient?._id || ''}||${patient?.lastName || ''}^${patient?.firstName || ''}`,
      `O|1|${order.accessionNumber}||${order.testName}`,
      'L|1|N',
    ].join('\r');
  }
}
