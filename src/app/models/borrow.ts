import mongoose, { Schema, model, models } from 'mongoose';

const BorrowSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
  borrowedAt: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  returned: { type: Boolean, default: false },
  returnedAt: { type: Date, default: null },
  status: {
    type: String,
    enum: ['borrowed', 'returned', 'overdue'],
    default: 'borrowed',
  },
  fine: { type: Number, default: 0, min: 0 },
  finePaid: { type: Boolean, default: false },
  finePaidAt: { type: Date, default: null },
  fineCollected: { type: Boolean, default: false },
  fineCollectedAt: { type: Date, default: null },
  reservationId: { type: Schema.Types.ObjectId, ref: 'Hold', default: null },
}, {
  timestamps: true
});

BorrowSchema.index({ userId: 1, returned: 1, dueDate: 1 });
BorrowSchema.index({ bookId: 1, returned: 1 });

const Borrow = models.Borrow || model('Borrow', BorrowSchema);
export default Borrow;
