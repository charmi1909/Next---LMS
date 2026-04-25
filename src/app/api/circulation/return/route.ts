import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Borrow from '@/app/models/borrow';
import Book from '@/app/models/book';
import Hold from '@/app/models/hold';
import Notification from '@/app/models/notification';

const FINE_PER_DAY = 5; 

export async function PUT(req: Request) {
  try {
    await connectDB();
    const { patronId, bookId, bookIsbn } = await req.json();

    if (!patronId || (!bookId && !bookIsbn)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const book = bookId
      ? await Book.findById(bookId)
      : await Book.findOne({ isbn: bookIsbn });

    if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 });

    const borrow = await Borrow.findOne({
      userId: patronId,
      bookId: book._id,
      returned: false,
    });

    if (!borrow) return NextResponse.json({ error: 'Borrow record not found' }, { status: 404 });

    const now = new Date();
    const due = new Date(borrow.dueDate);
    const daysLate = Math.max(0, Math.ceil((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
    const fine = daysLate * FINE_PER_DAY;

    borrow.returned = true;
    borrow.returnedAt = now;
    await borrow.save();

    book.isAvailable = true;
    await book.save();

    const nextHold = await Hold.findOne({
      bookId: book._id,
      status: 'pending',
    }).sort({ holdPlacedAt: 1 });

    if (nextHold) {
      nextHold.status = 'available';
      nextHold.availableAt = now;
      await nextHold.save();

      const librarianActionKey = `librarian-action:inform-patron:${nextHold._id}`;
      const existingActionNotification = await Notification.findOne({ dedupeKey: librarianActionKey });

      if (!existingActionNotification) {
        await Notification.create({
          userId: nextHold.userId,
          bookId: book._id,
          message: `Hold available for "${book.title}".`,
          type: 'reservation_available',
          read: false,
          dedupeKey: librarianActionKey,
        });
      }
    }

    return NextResponse.json({
      message: 'Book returned successfully',
      fine: fine,
      daysLate,
    });
  } catch (err: any) {
    console.error('Return API error:', err);
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 });
  }
}
