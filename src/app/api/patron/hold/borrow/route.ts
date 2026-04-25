import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/mongodb';
import Hold from '@/app/models/hold';
import Book from '@/app/models/book';
import Borrow from '@/app/models/borrow';

export async function POST(req: NextRequest) {
  await connectDB();
  const token = req.cookies.get('token')?.value;

  if (!token || !process.env.JWT_SECRET) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { holdId } = await req.json();
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const hold = await Hold.findOne({ _id: holdId, userId }).populate('bookId');
    if (!hold || hold.status !== 'available') {
      return NextResponse.json({ success: false, message: 'Book not available to borrow' }, { status: 400 });
    }

    const book = hold.bookId;
    if (book.availableCopies <= 0) {
      return NextResponse.json({ success: false, message: 'No copies available' }, { status: 400 });
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    await Borrow.create({
      userId,
      bookId: book._id,
      dueDate,
      status: 'borrowed',
      returned: false
    });

    book.availableCopies -= 1;
    await book.save();

    hold.status = 'fulfilled';
    await hold.save();

    return NextResponse.json({ success: true, message: 'Book borrowed successfully' });
  } catch {
    return NextResponse.json({ success: false, message: 'Borrow failed' }, { status: 500 });
  }
}
