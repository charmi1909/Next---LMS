import mongoose, { Schema, model, models } from 'mongoose';

const patronSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: String,
    },
    address: {
      type: String,
    },
    membershipDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Patron = models.Patron || model('Patron', patronSchema);

export default Patron;
