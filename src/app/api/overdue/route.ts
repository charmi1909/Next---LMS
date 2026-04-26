import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Borrow from '@/app/models/borrow';
import LoanConfig from '@/app/models/LoanConfig';

export async function GET() {
  await connectDB();

  const today = new Date();

  try {
    const config = await LoanConfig.findOne();
    const fineRate = config?.fineRate || 5;

    const overdueDocs = await Borrow.find({
      dueDate: { $lt: today },
      returned: false,
    })
      .populate('bookId')
      .populate('userId');

    const overdueItems = overdueDocs.map((borrow) => {
      const overdueDays = Math.max(
        0,
        Math.ceil((today.getTime() - new Date(borrow.dueDate).getTime()) / (1000 * 60 * 60 * 24))
      );
      const fineAmount = overdueDays * fineRate;
      borrow.fine = fineAmount;

      return {
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
      fine: fineAmount,
      fineCollected: borrow.fineCollected || false,
      };
    });
    await Promise.all(overdueDocs.map((borrow) => borrow.save()));

    return NextResponse.json(overdueItems);
  } catch (error) {
    console.error('Failed to fetch overdue items:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
