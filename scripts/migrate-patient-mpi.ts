import mongoose from 'mongoose';
import crypto from 'node:crypto';
import { PatientModel } from '../src/modules/patient/patient.model.js';

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGO_URI) throw new Error('Set MONGODB_URI or MONGO_URI before running the migration.');

const generateMPI = () => `MPI-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

await mongoose.connect(MONGO_URI);

const cursor = PatientModel.find({
  $or: [
    { universalPatientId: { $exists: false } },
    { universalPatientId: null },
    { active: { $exists: false } },
  ],
}).cursor();

let migrated = 0;
for await (const patient of cursor) {
  if (!patient.universalPatientId) {
    let mpi = generateMPI();
    while (await PatientModel.exists({ universalPatientId: mpi })) mpi = generateMPI();
    patient.universalPatientId = mpi;
  }
  if (patient.active === undefined) patient.active = true;
  await patient.save();
  migrated += 1;
}

console.log(`Migrated ${migrated} Patient records.`);
await mongoose.disconnect();
