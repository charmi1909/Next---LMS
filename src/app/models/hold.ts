import mongoose, { Schema, Document } from 'mongoose';

export interface IHold extends Document {
  userId: mongoose.Types.ObjectId;
  bookId: mongoose.Types.ObjectId;
  holdPlacedAt: Date;
  status: 'pending' | 'available' | 'fulfilled' | 'cancelled' | 'expired';
  queuePosition: number;
  availableAt?: Date | null;
  expiresAt?: Date | null;
  notifiedAt?: Date | null;
  fulfilledAt?: Date | null;
  cancelledAt?: Date | null;
}

const HoldSchema: Schema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true,
  },
  holdPlacedAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['pending', 'available', 'fulfilled', 'cancelled', 'expired'],
    default: 'pending',
  },
  queuePosition: {
    type: Number,
    default: 1,
  },
  availableAt: {
    type: Date,
    default: null,
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  notifiedAt: {
    type: Date,
    default: null,
  },
  fulfilledAt: {
    type: Date,
    default: null,
  },
  cancelledAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});
HoldSchema.index({ bookId: 1, status: 1, holdPlacedAt: 1 });
HoldSchema.index({ userId: 1, bookId: 1, status: 1 });

const Hold = mongoose.models.Hold || mongoose.model<IHold>('Hold', HoldSchema);
export default Hold;
