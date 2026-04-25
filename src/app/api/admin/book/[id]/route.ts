
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Book from '@/app/models/book';


export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  await connectDB();
  const { id } = params;

  try {
    const book = await Book.findById(id);
    if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    return NextResponse.json(book);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch book' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  await connectDB();
  const { id } = params;
  const data = await req.json();

  try {
    const updatedBook = await Book.findByIdAndUpdate(id, data, { new: true });
    return NextResponse.json(updatedBook);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update book' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  await connectDB();
  const { id } = params;

  try {
    await Book.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Book deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete book' }, { status: 500 });
  }
}
