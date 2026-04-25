import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/mongodb';
import Hold from '@/app/models/hold';
import Book from '@/app/models/book';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = req.cookies.get('token')?.value;
    if (!token || !process.env.JWT_SECRET) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const holds = await Hold.find({ userId })
      .populate({
        path: 'bookId',
        model: Book,
        select: 'title author', 
      })
      .sort({ createdAt: -1 });

    console.log('Populated holds:', holds.map(h => ({
      holdId: h._id,
      bookExists: !!h.bookId,
      title: h.bookId?.title,
    })));

    return NextResponse.json(holds);
  } catch (error) {
    console.error('GET /holds error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
