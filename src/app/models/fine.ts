import mongoose from 'mongoose';

const fineSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: String,
  amount: Number,
  paid: { type: Boolean, default: false },
});

export default mongoose.models.Fine || mongoose.model('Fine', fineSchema);
