import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email:     { type: String, required: true, unique: true },
    password:  { type: String, required: true },
    phone:     { type: String },
    address:   { type: String },
    dob:       { type: Date },
    role:      { type: String, enum: ['admin', 'librarian', 'patron'], required: true },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
