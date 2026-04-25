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

    const userId = new mongoose.Types.ObjectId(decoded.id);

    // Sum fines (assumes Borrow.fine stores current fine amounts)
    const agg = await Borrow.aggregate([
      { $match: { userId } },
      { $group: { _id: null, totalFines: { $sum: { $ifNull: ['$fine', 0] } } } }
    ]);

    const totalFines = agg.length > 0 ? agg[0].totalFines : 0;

    // Also return detailed overdue records (optional)
    const overdueDetails = await Borrow.find({ userId, fine: { $gt: 0 } })
      .populate({ path: 'bookId', select: 'title author' })
      .lean();

    const details = overdueDetails.map((d: any) => ({
      borrowId: d._id,
      bookId: d.bookId?._id || null,
      title: d.bookId?.title || 'Unknown',
      dueDate: d.dueDate,
      fine: d.fine || 0,
      returned: !!d.returned,
    }));

    return NextResponse.json({ success: true, totalFines, details });
  } catch (err: any) {
    console.error('API /fines error:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
