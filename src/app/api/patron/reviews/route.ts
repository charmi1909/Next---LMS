import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/mongodb';
import Review from '@/app/models/review';

function getPatronFromToken(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token || !process.env.JWT_SECRET) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: string; role: string };
    return decoded.role === 'patron' ? decoded : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  await connectDB();
  const patron = getPatronFromToken(req);
  if (!patron) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  const bookId = req.nextUrl.searchParams.get('bookId');
  if (!bookId) return NextResponse.json({ success: false, message: 'bookId is required' }, { status: 400 });

  const reviews = await Review.find({ bookId })
    .populate({ path: 'userId', select: 'name' })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({
    success: true,
    data: reviews.map((r: any) => ({
      _id: r._id,
      userId: r.userId?._id,
      userName: r.userId?.name || 'Patron',
      rating: r.rating,
      comment: r.comment || '',
      createdAt: r.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  await connectDB();
  const patron = getPatronFromToken(req);
  if (!patron) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  const { bookId, rating, comment } = await req.json();
  if (!bookId || !rating) {
    return NextResponse.json({ success: false, message: 'bookId and rating are required' }, { status: 400 });
  }

  const safeRating = Math.max(1, Math.min(5, Number(rating)));
  await Review.findOneAndUpdate(
    { userId: patron.id, bookId },
    { rating: safeRating, comment: (comment || '').trim() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return NextResponse.json({ success: true, message: 'Review saved successfully' });
}
