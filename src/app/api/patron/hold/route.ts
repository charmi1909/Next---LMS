import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/mongodb';
import Hold from '@/app/models/hold';
import Book from '@/app/models/book';
import Notification from '@/app/models/notification';

export async function GET(req: NextRequest) {
  await connectDB();
  const token = req.cookies.get('token')?.value;

  if (!token || !process.env.JWT_SECRET) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const holds = await Hold.find({ userId }).populate('bookId').sort({ createdAt: -1 });
    return NextResponse.json(holds);
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  await connectDB();
  const token = req.cookies.get('token')?.value;

  if (!token || !process.env.JWT_SECRET) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { bookId } = await req.json();
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const existing = await Hold.findOne({ userId, bookId, status: { $in: ['pending', 'available'] } });
    if (existing) {
      return NextResponse.json({ success: false, message: 'Already on hold' }, { status: 409 });
    }

    await Hold.create({ userId, bookId, status: 'pending' });
    const book = await Book.findById(bookId).select('title');
    await Notification.create({
      userId,
      bookId,
      message: `Hold placed for "${book?.title || 'selected book'}".`,
      type: 'info',
      read: false,
      dedupeKey: `hold-placed:${userId}:${bookId}`,
    });
    return NextResponse.json({ success: true, message: 'Hold placed' });
  } catch {
    return NextResponse.json({ success: false, message: 'Error placing hold' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  await connectDB();
  const token = req.cookies.get('token')?.value;

  if (!token || !process.env.JWT_SECRET) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { holdId } = await req.json();
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const hold = await Hold.findOne({ _id: holdId, userId });
    if (!hold) {
      return NextResponse.json({ success: false, message: 'Hold not found' }, { status: 404 });
    }

    await Hold.deleteOne({ _id: holdId });
    return NextResponse.json({ success: true, message: 'Hold cancelled' });
  } catch {
    return NextResponse.json({ success: false, message: 'Error canceling hold' }, { status: 500 });
  }
}
