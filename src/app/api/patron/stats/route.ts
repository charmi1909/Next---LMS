import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import User from '@/app/models/user';
import Book from '@/app/models/book';
import Borrow from '@/app/models/borrow';
import connectDB from '@/app/lib/mongodb';
import { getUserFromToken } from '@/app/lib/auth';

export async function GET(req: NextRequest) {
  await connectDB();

const user = await getUserFromToken();

if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}  

  const userId = user.id; 

  const totalBorrows = await Borrow.countDocuments({ patron: userId });

  const currentBorrows = await Borrow.find({ patron: userId, returned: false });

  const overdueCount = currentBorrows.filter(b => new Date(b.dueDate) < new Date()).length;

  const recentBorrows = await Borrow.find({ patron: userId })
    .sort({ borrowedAt: -1 })
    .limit(5)
    .populate('book');

  const recentFormatted = recentBorrows.map(b => ({
    bookTitle: b.book?.title || 'Unknown Title',
    borrowedDate: b.borrowedAt,
    dueDate: b.dueDate,
    returned: b.returned,
  }));

  return NextResponse.json({
    totalBorrows,
    currentActiveBorrows: currentBorrows.length,
    overdueCount,
    recentBorrows: recentFormatted,
  });
}
