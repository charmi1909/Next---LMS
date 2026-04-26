import mongoose, { Schema, model, models } from 'mongoose';

const fineSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
  borrowId: { type: Schema.Types.ObjectId, ref: 'Borrow' },
  amount: { type: Number, required: true },
  collectedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  collectedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['paid', 'unpaid'], default: 'paid' },
  reason: { type: String, default: 'Overdue Fine' }
}, { timestamps: true });

export default models.Fine || model('Fine', fineSchema);
