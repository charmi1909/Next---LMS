import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/app/lib/mongodb';
import Borrow from '@/app/models/borrow';
import Book from '@/app/models/book';

export async function PUT(req: Request) {
  try {
    await connectDB();
    const { patronId, bookId, bookIsbn } = await req.json();

    if (!patronId || (!bookId && !bookIsbn)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let book = null;

    if (bookId) {
      if (!mongoose.Types.ObjectId.isValid(bookId)) {
        return NextResponse.json({ error: 'Invalid book ID' }, { status: 400 });
      }
      book = await Book.findById(bookId);
    } else if (bookIsbn) {
      book = await Book.findOne({ isbn: bookIsbn });
    }

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const borrowRecord = await Borrow.findOne({
      userId: patronId,
      bookId: book._id,
      returned: false,
    });

    if (!borrowRecord) {
      return NextResponse.json({ error: 'Borrow record not found' }, { status: 404 });
    }

    const newDueDate = new Date(borrowRecord.dueDate);
    newDueDate.setDate(newDueDate.getDate() + 14);
    borrowRecord.dueDate = newDueDate;

    await borrowRecord.save();

    return NextResponse.json({ message: 'Book renewed successfully', newDueDate });
  } catch (error: any) {
    console.error('Renew Book API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
