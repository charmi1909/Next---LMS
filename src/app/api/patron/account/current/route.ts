import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/mongodb';
import Borrow from '@/app/models/borrow';
import Book from '@/app/models/book';
import mongoose from 'mongoose';

async function getUserIdFromToken(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) throw { status: 401, message: 'Unauthorized: No token' };
  if (!process.env.JWT_SECRET) throw { status: 500, message: 'Server misconfigured' };
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.id;
  } catch (err) {
    throw { status: 401, message: 'Unauthorized: Invalid token' };
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const userId = await getUserIdFromToken(req);
    const borrows = await Borrow.find({ userId: new mongoose.Types.ObjectId(userId), returned: false })
      .populate({ path: 'bookId', select: 'title author status available' })
      .lean();

    const currentBorrowed = borrows.map(b => ({
      _id: b._id,
      bookId: b.bookId?._id || null,
      title: b.bookId?.title || 'Unknown',
      author: b.bookId?.author || 'Unknown',
      borrowedAt: b.borrowedAt,
      dueDate: b.dueDate,
      fine: b.fine || 0,
      status: b.bookId?.status ?? null,
    }));

    return NextResponse.json({ success: true, currentBorrowed });
  } catch (err: any) {
    console.error('API /current error:', err);
    const status = err?.status || 500;
    const message = err?.message || 'Internal server error';
    return NextResponse.json({ success: false, message }, { status });
  }
}
