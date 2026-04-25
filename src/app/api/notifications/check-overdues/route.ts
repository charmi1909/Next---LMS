import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Borrow from '@/app/models/borrow';
import Notification from '@/app/models/notification';

export async function GET() {
  await connectDB();

  const now = new Date();
  const overdueBorrows = await Borrow.find({
    dueDate: { $lt: now },
    returned: false,
  });

  for (const borrow of overdueBorrows) {
    const exists = await Notification.findOne({
      message: { $regex: borrow.bookTitle },
      type: 'overdue_book',
    });

    if (!exists) {
      await Notification.create({
        message: `Book overdue: ${borrow.bookTitle}`,
        type: 'overdue_book',
        read: false,
      });
    }
  }

  return NextResponse.json({ success: true });
}
