// app/models/loan.ts
import mongoose, { Schema, models, model } from 'mongoose';

const loanSchema = new Schema({
  book: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
  patron: { type: Schema.Types.ObjectId, ref: 'Patron', required: true },
  loanDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  returned: { type: Boolean, default: false },
}, { timestamps: true });

const Loan = models.Loan || model('Loan', loanSchema);
export default Loan;
