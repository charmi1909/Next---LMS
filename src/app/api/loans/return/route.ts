import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Book from '@/app/models/book';
import Loan from '@/app/models/loan';

export async function POST(req: Request) {
    const { bookIsbn, patronId } = await req.json();
    await connectDB();

    const book = await Book.findOne({ isbn: bookIsbn });
    if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 });

    const query: any = { bookId: book._id, returned: false };
    if (patronId) query.patronId = patronId;

    const loan = await Loan.findOne(query);
    if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });

    loan.returned = true;
    loan.returnedAt = new Date();
    await loan.save();

    book.status = 'available';
    await book.save();

    return NextResponse.json({ message: 'Book returned successfully' });
}
