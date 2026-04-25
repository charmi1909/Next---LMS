import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Book from '@/app/models/book';
import Borrow from '@/app/models/borrow';

export async function GET() {
  try {
    await connectDB();

    const totalBooks = await Book.countDocuments();

    const borrowedBooks = await Borrow.countDocuments({
      $or: [{ returned: null }, { returned: false }]
    });

    const overdueBooks = await Borrow.countDocuments({
      dueDate: { $lt: new Date() },
      returned: false,
    });

    return NextResponse.json({
      totalBooks,
      borrowedBooks,
      overdueBooks,
    });
  } catch (error) {
    console.error('[LIBRARIAN_STATS_ERROR]', error);
    return NextResponse.json({ message: 'Error fetching stats' }, { status: 500 });
  }
}
