import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Book from '@/app/models/book';
import Borrow from '@/app/models/borrow';
import LoanConfig from '@/app/models/LoanConfig';

export async function PUT(req: Request) {
  try {
    await connectDB();
    const { patronId, bookId } = await req.json();

    if (!patronId || !bookId) {
      return NextResponse.json({ error: 'Missing patronId or bookId' }, { status: 400 });
    }

    const book = await Book.findById(bookId);
    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    if (!book.isAvailable) {
      return NextResponse.json({ error: `Book "${book.title}" is not available` }, { status: 400 });
    }

    const loanConfig = await LoanConfig.findOne() || { borrowLimit: 5, loanPeriodDays: 14 };

    const activeBorrows = await Borrow.countDocuments({
      userId: patronId,
      returned: false,
    });

    if (activeBorrows >= loanConfig.borrowLimit) {
      return NextResponse.json({ error: 'Borrow limit reached' }, { status: 400 });
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + loanConfig.loanPeriodDays);

    const borrow = await Borrow.create({
      userId: patronId,
      bookId: book._id,
      dueDate,
      returned: false,
      status: 'borrowed',
    });

    book.isAvailable = false;
    await book.save();

    return NextResponse.json({ message: 'Book issued successfully', borrow });
  } catch (error: any) {
    console.error('Issue Book Error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
