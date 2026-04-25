import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Borrow from '@/app/models/borrow';

export async function GET() {
  await connectDB();

  const today = new Date();

  try {
    const overdueDocs = await Borrow.find({
      dueDate: { $lt: today },
      returned: false,
    })
      .populate('bookId')
      .populate('userId');

    const overdueItems = overdueDocs.map((borrow) => ({
      _id: borrow._id.toString(),
      bookId: borrow.bookId?._id.toString() || null,
      book: {
        title: borrow.bookId?.title || 'Unknown',
        isbn: borrow.bookId?.isbn || 'N/A',
      },
      userId: {
        _id: borrow.userId?._id.toString(),
        name: borrow.userId?.name || 'Unknown',
        email: borrow.userId?.email || 'N/A',
      },
      dueDate: borrow.dueDate,
      fine: borrow.fine || 0,
      fineCollected: borrow.fineCollected || false,
    }));

    return NextResponse.json(overdueItems);
  } catch (error) {
    console.error('Failed to fetch overdue items:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
