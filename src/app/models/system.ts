import mongoose from 'mongoose';

const SystemSchema = new mongoose.Schema({
  borrowingLimit: { type: Number, default: 5 },
  fineRate: { type: Number, default: 1 },
  loanPeriod: { type: Number, default: 14 },
  reservationExpiryDays: { type: Number, default: 2 },
});

const System = mongoose.models.System || mongoose.model('System', SystemSchema, 'systems'); // ✅ 3rd arg is collection name

export default System;
