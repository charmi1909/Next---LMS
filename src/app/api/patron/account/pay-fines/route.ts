import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/mongodb';
import Borrow from '@/app/models/borrow';
import Book from '@/app/models/book';
import mongoose from 'mongoose';
import Fine from '@/app/models/fine';
import Notification from '@/app/models/notification';
export async function POST(req: NextRequest) {
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

    // Find borrows with fines > 0 and not yet returned
    const borrowsWithFines = await Borrow.find({
      userId,
      fine: { $gt: 0 },
      returned: false,
    });

    if (!borrowsWithFines.length) {
      return NextResponse.json({ success: false, message: 'No outstanding fines to pay' }, { status: 400 });
    }

    // Sum total and update each record, also update Book to available
    let totalCollected = 0;
    const updates: Promise<any>[] = [];

    for (const b of borrowsWithFines) {
      const amountPaid = b.fine || 0;
      totalCollected += amountPaid;
      b.fine = 0;
      b.finePaid = true;
      b.finePaidAt = new Date();
      b.fineCollected = true;
      b.fineCollectedAt = new Date();
      b.returned = true;
      b.returnedAt = new Date();
      b.status = 'returned';
      updates.push(b.save());

      // update associated Book document (set available / status)
      updates.push(Book.findByIdAndUpdate(b.bookId, { $set: { status: 'available', available: true } }));
      
      // create Fine history record
      updates.push(Fine.create({
          userId: b.userId,
          bookId: b.bookId,
          borrowId: b._id,
          amount: amountPaid,
          collectedBy: userId, // Patron self-paid
          collectedAt: new Date(),
          status: 'paid'
      }));

      updates.push(Notification.create({
        userId: b.userId,
        bookId: b.bookId,
        borrowId: b._id,
        message: `Fine payment received for this book. Amount: Rs ${amountPaid.toFixed(2)}.`,
        type: 'overdue_fine',
        read: false,
        dedupeKey: `fine-self-paid:${b._id}:${Date.now()}`,
      }));
    }

    await Promise.all(updates);

    return NextResponse.json({
      success: true,
      message: `Fines paid successfully. ₹${totalCollected.toFixed(2)} collected.`,
      collectedAmount: totalCollected,
    });
  } catch (err: any) {
    console.error('API /pay-fines error:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
