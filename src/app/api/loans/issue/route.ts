import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Book from '@/app/models/book';
import Loan from '@/app/models/loan';

export async function POST(req: Request) {
    const { patronId, bookIsbn } = await req.json();
    await connectDB();

    const book = await Book.findOne({ isbn: bookIsbn });
    if (!book || book.status === 'borrowed') {
        return NextResponse.json({ error: 'Book unavailable' }, { status: 400 });
    }

    const loan = await Loan.create({
        patronId,
        bookId: book._id,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 
    });

    book.status = 'borrowed';
    await book.save();

    return NextResponse.json({ message: 'Book issued successfully', loan });
}
