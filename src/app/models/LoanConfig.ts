// /app/models/loanConfig.ts
import mongoose from 'mongoose';

const loanConfigSchema = new mongoose.Schema({
  loanPeriodDays: {
    type: Number,
    required: true,
    default: 14,
  },
  fineRatePerDay: {
    type: Number,
    required: true,
    default: 1,
  },
  borrowLimit: {
    type: Number,
    required: true,
    default: 5,
  },
}, { timestamps: true });

export default mongoose.models.LoanConfig || mongoose.model('LoanConfig', loanConfigSchema);
