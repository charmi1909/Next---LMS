// File: /app/models/notification.ts

import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: [
      'login',
      'book_added',
      'book_returned',
      'overdue',
      'failed_login',
      'info',
      'warning',
      'due_soon',
      'hold_available',
      'borrow_confirmation',
      'return_confirmation',
      'due_reminder',
      'overdue_fine',
      'reservation_available',
      'reservation_expired',
      'system_configuration',
    ],
    default: 'info',
  },
  read: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: false,
  },
  borrowId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Borrow',
    required: false,
  },
  dedupeKey: {
    type: String,
    required: false,
    index: true,
  },
});

const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
export default Notification;
