import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Book from '@/app/models/book';
import User from '@/app/models/user';
import Borrow from '@/app/models/borrow';

export async function GET() {
  try {
    await connectDB();

    const totalBooks = await Book.countDocuments();
    const totalPatrons = await User.countDocuments({ role: 'patron' });
    const totalLibrarians = await User.countDocuments({ role: 'librarian' });
    const overdueBooks = await Borrow.countDocuments({
      dueDate: { $lt: new Date() },
      returned: false,
    });

    return NextResponse.json({
      totalBooks,
      totalPatrons,
      totalLibrarians,
      overdueBooks,
    });
  } catch (err) {
    console.error('Dashboard fetch error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
