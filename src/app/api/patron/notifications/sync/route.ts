import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/mongodb';
import Borrow from '@/app/models/borrow';
import Notification from '@/app/models/notification';

const FINE_PER_DAY = 2;

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = req.cookies.get('token')?.value;
    if (!token || !process.env.JWT_SECRET) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: string; role: string };
    if (decoded.role !== 'patron') {
      return NextResponse.json({ success: false, message: 'Access denied' }, { status: 403 });
    }

    const userId = decoded.id;
    const now = new Date();

    const activeBorrows = await Borrow.find({ userId, returned: false }).populate('bookId', 'title');

    for (const borrow of activeBorrows) {
      const dueDate = new Date(borrow.dueDate);
      const msDiff = dueDate.getTime() - now.getTime();
      const daysUntilDue = Math.ceil(msDiff / (1000 * 60 * 60 * 24));

      if (daysUntilDue <= 2 && daysUntilDue >= 0) {
        const dueSoonKey = `due-soon:${borrow._id}`;
        const alreadyDueSoon = await Notification.findOne({ userId, dedupeKey: dueSoonKey });
        if (!alreadyDueSoon) {
          await Notification.create({
            userId,
            bookId: borrow.bookId?._id,
            borrowId: borrow._id,
            message: `Reminder: "${borrow.bookId?.title || 'Your borrowed book'}" is due in ${daysUntilDue} day(s).`,
            type: 'due_soon',
            read: false,
            dedupeKey: dueSoonKey,
          });
        }
      }

      if (daysUntilDue < 0) {
        const overdueDays = Math.abs(daysUntilDue);
        const estimatedFine = overdueDays * FINE_PER_DAY;
        const penaltyKey = `penalty:${borrow._id}`;
        const alreadyPenalty = await Notification.findOne({ userId, dedupeKey: penaltyKey });
        if (!alreadyPenalty) {
          await Notification.create({
            userId,
            bookId: borrow.bookId?._id,
            borrowId: borrow._id,
            message: `Penalty alert: "${borrow.bookId?.title || 'A borrowed book'}" is overdue by ${overdueDays} day(s). Estimated fine: Rs ${estimatedFine}.`,
            type: 'warning',
            read: false,
            dedupeKey: penaltyKey,
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Patron notification sync error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
