import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/mongodb';
import Borrow from '@/app/models/borrow';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized: No token' }, { status: 401 });
    if (!process.env.JWT_SECRET) return NextResponse.json({ success: false, message: 'Server misconfigured' }, { status: 500 });

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const userId = decoded.id;

    const history = await Borrow.find({ userId: new mongoose.Types.ObjectId(userId) })
      .populate({ path: 'bookId', select: 'title author' })
      .lean();

    // filter out any records with missing book data
    const filtered = history.filter((r: any) => r.bookId);

    return NextResponse.json({ success: true, history: filtered });
  } catch (err: any) {
    console.error('API /history error:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
