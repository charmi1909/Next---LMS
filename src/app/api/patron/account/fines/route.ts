import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/mongodb';
import Borrow from '@/app/models/borrow';
import mongoose from 'mongoose';
import Fine from '@/app/models/fine';

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

    // Sum only outstanding fines.
    const agg = await Borrow.aggregate([
      { $match: { userId, fineCollected: { $ne: true }, fine: { $gt: 0 } } },
      { $group: { _id: null, totalFines: { $sum: { $ifNull: ['$fine', 0] } } } }
    ]);

    const totalFines = agg.length > 0 ? agg[0].totalFines : 0;

    const overdueDetails = await Borrow.find({ userId, fine: { $gt: 0 }, fineCollected: { $ne: true } })
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

    const collectedHistory = await Fine.find({ userId })
      .populate({ path: 'bookId', select: 'title author' })
      .sort({ collectedAt: -1 })
      .lean();

    const collected = collectedHistory.map((item: any) => ({
      fineId: item._id,
      borrowId: item.borrowId || null,
      amount: item.amount || 0,
      collectedAt: item.collectedAt,
      bookTitle: item.bookId?.title || 'Unknown',
      reason: item.reason || 'Overdue Fine',
    }));

    return NextResponse.json({ success: true, totalFines, details, collected });
  } catch (err: any) {
    console.error('API /fines error:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
