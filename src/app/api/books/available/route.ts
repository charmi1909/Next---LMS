import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Book from '@/app/models/book';

export async function GET() {
  try {
    await connectDB();

    const books = await Book.find({ isAvailable: true });

    return NextResponse.json({ success: true, books });

  } catch (error) {
    console.error('Fetch available books error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
