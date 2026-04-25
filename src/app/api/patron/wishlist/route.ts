import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/mongodb';
import Wishlist from '@/app/models/wishlist';

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

  const wishlist = await Wishlist.find({ userId: patron.id })
    .populate({ path: 'bookId', select: 'title author location isAvailable' })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({
    success: true,
    ids: wishlist.map((w: any) => String(w.bookId?._id)).filter(Boolean),
    items: wishlist
      .filter((w: any) => w.bookId)
      .map((w: any) => ({ _id: w._id, book: w.bookId })),
  });
}

export async function POST(req: NextRequest) {
  await connectDB();
  const patron = getPatronFromToken(req);
  if (!patron) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  const { bookId } = await req.json();
  if (!bookId) return NextResponse.json({ success: false, message: 'bookId is required' }, { status: 400 });

  const existing = await Wishlist.findOne({ userId: patron.id, bookId });
  if (existing) {
    await Wishlist.deleteOne({ _id: existing._id });
    return NextResponse.json({ success: true, action: 'removed', message: 'Removed from wishlist' });
  }

  await Wishlist.create({ userId: patron.id, bookId });
  return NextResponse.json({ success: true, action: 'added', message: 'Added to wishlist' });
}
