import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Borrow from '@/app/models/borrow';
import Hold from '@/app/models/hold';
import Notification from '@/app/models/notification';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  await connectDB();

  try {
    const { id } = params;

    const borrow = await Borrow.findById(id).populate('bookId');
    if (!borrow || borrow.returned) {
      return NextResponse.json({ success: false, message: 'Invalid borrow record' }, { status: 404 });
    }

    const book = borrow.bookId;

    // ✅ Update borrow record
    borrow.returned = true;
    borrow.returnedAt = new Date();
    await borrow.save();

    // ✅ Update book availability
    book.availableCopies += 1;
    book.isAvailable = true; // <-- THIS LINE FIXES YOUR ISSUE
    await book.save();

    await Notification.create({
      userId: borrow.userId,
      bookId: book._id,
      borrowId: borrow._id,
      message: `You returned "${book.title}" successfully.`,
      type: 'book_returned',
      read: false,
      dedupeKey: `return:${borrow._id}`,
    });

    // ✅ Handle holds
    const nextHold = await Hold.findOne({
      bookId: book._id,
      status: 'pending',
    }).sort({ holdPlacedAt: 1 });

    if (nextHold) {
      nextHold.status = 'available';
      nextHold.availableAt = new Date();
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

    return NextResponse.json({ success: true, message: 'Book returned successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Return failed' }, { status: 500 });
  }
}
