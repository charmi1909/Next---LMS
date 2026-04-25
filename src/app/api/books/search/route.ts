import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Book from '@/app/models/book';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const type = searchParams.get('type'); 
    const location = searchParams.get('location');
    const availability = searchParams.get('availability'); 

    const regex = new RegExp(query, 'i'); 

    const mongoQuery: any = {
      $or: [
        { title: regex },
        { author: regex },
        { isbn: regex },
        { subject: regex },
        { keywords: regex },
        { description: regex },
      ],
    };

    if (type) mongoQuery.type = type;
    if (location) mongoQuery.location = location;
    if (availability === 'available') mongoQuery.isAvailable = true;
    if (availability === 'unavailable') mongoQuery.isAvailable = false;

    const results = await Book.find(mongoQuery);

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { success: false, message: 'Search failed', error },
      { status: 500 }
    );
  }
}
