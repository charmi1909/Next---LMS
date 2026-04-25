import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import connectDB from '@/app/lib/mongodb';
import Borrow from '@/app/models/borrow';

export async function GET(req: NextRequest) {
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

    const userId = new mongoose.Types.ObjectId(decoded.id);

    const monthlyBorrowTrend = await Borrow.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: { year: { $year: '$borrowedAt' }, month: { $month: '$borrowedAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          _id: 0,
          label: { $concat: [{ $toString: '$_id.month' }, '/', { $toString: '$_id.year' }] },
          count: 1,
        },
      },
    ]);

    const topAuthors = await Borrow.aggregate([
      { $match: { userId } },
      {
        $lookup: {
          from: 'books',
          localField: 'bookId',
          foreignField: '_id',
          as: 'book',
        },
      },
      { $unwind: '$book' },
      {
        $group: {
          _id: '$book.author',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, author: '$_id', count: 1 } },
    ]);

    const summary = await Borrow.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalBorrowed: { $sum: 1 },
          currentlyBorrowed: {
            $sum: {
              $cond: [{ $eq: ['$returned', false] }, 1, 0],
            },
          },
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      summary: summary[0] || { totalBorrowed: 0, currentlyBorrowed: 0 },
      monthlyBorrowTrend,
      topAuthors,
    });
  } catch (error) {
    console.error('Patron analytics error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
