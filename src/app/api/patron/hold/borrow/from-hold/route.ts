import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Hold from '@/app/models/hold';
import Book from '@/app/models/book';
import Borrow from '@/app/models/borrow';
import Notification from '@/app/models/notification';
import jwt from 'jsonwebtoken';

export async function POST(req: NextRequest) {
  await connectDB();

  try {
    const token = req.cookies.get('token')?.value;

    if (!token || !process.env.JWT_SECRET) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
      id: string;
      role: string;
      name: string;
      email: string;
    };

    if (decoded.role !== 'patron') {
      return NextResponse.json({ success: false, message: 'Access denied' }, { status: 403 });
    }

    const { holdId } = await req.json();

    const hold = await Hold.findById(holdId);
    if (!hold || hold.status !== 'available') {
      return NextResponse.json({ success: false, message: 'Hold not available for borrowing' }, { status: 400 });
    }

    const book = await Book.findById(hold.bookId);
    if (!book || book.availableCopies < 1) {
      return NextResponse.json({ success: false, message: 'Book not available' }, { status: 400 });
    }

    const loanPeriodDays = 14;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + loanPeriodDays);

    await Borrow.create({
      userId: decoded.id,
      bookId: book._id,
      borrowedAt: new Date(),
      dueDate,
      returned: false,
      status: 'borrowed',
    });

    book.availableCopies -= 1;
    await book.save();

    hold.status = 'completed';
    await hold.save();

    await Notification.create({
      userId: decoded.id,
      message: `You have successfully borrowed "${book.title}".`,
      type: 'borrow_success',
      read: false,
    });

    return NextResponse.json({ success: true, message: 'Book borrowed from hold successfully.' });

  } catch (error) {
    console.error('Borrow from Hold Error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
