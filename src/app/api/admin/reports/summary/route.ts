import connectDB from '@/app/lib/mongodb';
import User from '@/app/models/user';
import Book from '@/app/models/book';
import Borrow from '@/app/models/borrow';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await connectDB();

    const totalUsers = await User.countDocuments();

    const roleAggregation = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);
    const userRoles = roleAggregation.map(r => ({
      role: r._id,
      count: r.count,
    }));

    const totalBooks = await Book.countDocuments();

    const booksBorrowed = await Borrow.countDocuments({
      $or: [{ returned: null }, { returned: false }],
    });

    const booksOnHold = await Borrow.countDocuments({ status: 'on_hold' });

    const today = new Date();
    const overdueBooksDocs = await Borrow.find({
      dueDate: { $lt: today },
      returned: false,
    }).populate('userId').populate('bookId');

    const overdue = overdueBooksDocs.length;

    const overdueBooks = overdueBooksDocs.map(entry => ({
      id: entry._id,
      title: entry.bookId?.title || 'Unknown Book',
      user: entry.userId?.name || 'Unknown User',
      dueDate: entry.dueDate ? new Date(entry.dueDate).toISOString().split('T')[0] : 'N/A',
      daysOverdue: Math.ceil(
        (today.getTime() - new Date(entry.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      ),
    }));

    const past7Days = new Date();
    past7Days.setDate(past7Days.getDate() - 6);
    past7Days.setHours(0, 0, 0, 0);

    const borrowTrendsAgg = await Borrow.aggregate([
      {
        $match: {
          createdAt: { $gte: past7Days },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const borrowTrends = Array.from({ length: 7 }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      date.setHours(0, 0, 0, 0);
      const dateString = date.toISOString().split('T')[0];

      const match = borrowTrendsAgg.find(entry => entry._id === dateString);
      return {
        date: dateString,
        count: match?.count || 0,
      };
    });

    const fineAgg = await Borrow.aggregate([
      { $group: { _id: null, totalFines: { $sum: '$fine' } } },
    ]);
    const totalFines = fineAgg.length > 0 ? fineAgg[0].totalFines : 0;

    return NextResponse.json({
      summary: {
        totalBooks,
        totalUsers,
        booksBorrowed,
        booksOnHold,
        overdue,
        totalFines,
      },
      userRoles,
      borrowTrends,
      overdueBooks,
    });
  } catch (error) {
    console.error('Report Summary API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}
