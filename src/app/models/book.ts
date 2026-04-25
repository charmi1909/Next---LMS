import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    isbn: { type: String, trim: true, index: true, sparse: true },
    category: { type: String, trim: true, default: '' },
    subject: { type: String, trim: true, default: '' },
    keywords: { type: [String], default: [] },

    type: {
      type: String,
      enum: ['book', 'magazine', 'novel', 'journal', 'reference', 'textbook'],
      default: 'book',
    },

    status: {
      type: String,
      enum: ['available', 'borrowed', 'reserved', 'lost', 'damaged'],
      default: 'available',
    },

    isAvailable: { type: Boolean, default: true },

    location: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

/* Indexes (only valid ones) */
bookSchema.index({ title: 1, author: 1 });
bookSchema.index({ category: 1, status: 1 });

/* Optional: auto-sync status with isAvailable */
bookSchema.pre('save', function (next) {
  if (this.status === 'available') {
    this.isAvailable = true;
  } else {
    this.isAvailable = false;
  }
  next();
});

const Book = mongoose.models.Book || mongoose.model('Book', bookSchema);

export default Book;