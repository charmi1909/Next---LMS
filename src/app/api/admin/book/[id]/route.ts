import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/app/lib/mongodb';
import Book from '@/app/models/book';

// ✅ GET
export async function GET(req: NextRequest, context: any) {
  await connectDB();
  const { id } = context.params;

  try {
    // 🔒 Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid book ID' }, { status: 400 });
    }

    const book = await Book.findById(id);

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    return NextResponse.json(book);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch book' }, { status: 500 });
  }
}

// ✅ PUT
export async function PUT(req: NextRequest, context: any) {
  await connectDB();
  const { id } = context.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid book ID' }, { status: 400 });
    }

    const data = await req.json();

    const updatedBook = await Book.findByIdAndUpdate(id, data, {
      new: true,
    });

    if (!updatedBook) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    return NextResponse.json(updatedBook);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update book' }, { status: 500 });
  }
}

// ✅ DELETE
export async function DELETE(req: NextRequest, context: any) {
  await connectDB();
  const { id } = context.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid book ID' }, { status: 400 });
    }

    const deletedBook = await Book.findByIdAndDelete(id);

    if (!deletedBook) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Book deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete book' }, { status: 500 });
  }
}