import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/mongodb';
import Borrow from '@/app/models/borrow';
import Book from '@/app/models/book';
import System from '@/app/models/system';
import Notification from '@/app/models/notification';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { bookId } = await req.json();
    if (!bookId) {
      return NextResponse.json({ success: false, message: 'Missing bookId' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized: No token' }, { status: 401 });
    }

    if (!process.env.JWT_SECRET) {
      return NextResponse.json({ success: false, message: 'JWT_SECRET not set' }, { status: 500 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: string };
    const userId = decoded.id;

    const book = await Book.findById(bookId);
    if (!book) {
      return NextResponse.json({ success: false, message: 'Book not found' }, { status: 404 });
    }

    if (!book.isAvailable) {
      return NextResponse.json({ success: false, message: 'Book already borrowed' }, { status: 400 });
    }

    const config = await System.findOne();
    const loanPeriod = config?.loanPeriod || 14;
    const borrowingLimit = config?.borrowingLimit || 5;

    const activeBorrows = await Borrow.countDocuments({
      userId,
      returnedAt: null,
    });

    if (activeBorrows >= borrowingLimit) {
      return NextResponse.json({
        success: false,
        message: `You have reached your borrowing limit of ${borrowingLimit} books.`,
      }, { status: 403 });
    }

    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(now.getDate() + loanPeriod);

    await Borrow.create({
      userId,
      bookId,
      borrowedAt: now,
      dueDate,
      returnedAt: null,
    });

    book.isAvailable = false;
    await book.save();

    await Notification.create({
      userId,
      bookId: book._id,
      message: `You borrowed "${book.title}". It is due on ${dueDate.toLocaleDateString()}.`,
      type: 'info',
      read: false,
      dedupeKey: `borrow:${userId}:${book._id}:${dueDate.toISOString().slice(0, 10)}`,
    });

    return NextResponse.json({
      success: true,
      message: 'Book borrowed successfully!',
    });

  } catch (error: any) {
    console.error('Borrow API error (POST):', error);

    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ success: false, message: 'Invalid or expired token' }, { status: 401 });
    }

    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
