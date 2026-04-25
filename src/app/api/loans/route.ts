import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Loan from '@/app/models/loan';
import Book from '@/app/models/book';
import LoanConfig from '@/app/models/LoanConfig';
import Patron from '@/app/models/patron';

export async function POST(req: Request) {
  try {
    await connectDB();
    const { bookId, patronId } = await req.json();

    if (!bookId || !patronId) {
      return NextResponse.json({ message: 'Missing bookId or patronId' }, { status: 400 });
    }

    const book = await Book.findById(bookId);
    if (!book || !book.isAvailable) {
      return NextResponse.json({ message: 'Book not available' }, { status: 400 });
    }

    const patron = await Patron.findById(patronId);
    if (!patron) {
      return NextResponse.json({ message: 'Invalid patron' }, { status: 400 });
    }

    const config = await LoanConfig.findOne() || { loanPeriod: 14 };
    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(today.getDate() + config.loanPeriod);

    const loan = await Loan.create({
      book: book._id,
      patron: patron._id,
      issueDate: today,
      dueDate,
      returnDate: null,
    });

    book.isAvailable = false;
    await book.save();

    return NextResponse.json({ message: 'Book issued successfully', loan }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
