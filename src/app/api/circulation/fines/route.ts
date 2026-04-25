import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/app/lib/mongodb';
import Borrow from '@/app/models/borrow';
import Book from '@/app/models/book';
import LoanConfig from '@/app/models/LoanConfig';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const patronId = searchParams.get('patronId');

    if (!patronId) {
      return NextResponse.json({ success: false, message: 'Missing patronId' }, { status: 400 });
    }

    const today = new Date();

    // Fine rate from LoanConfig (default 5 per day)
    let fineRate = 5;
    try {
      const loanConfig = await LoanConfig.findOne();
      if (loanConfig?.fineRate) fineRate = loanConfig.fineRate;
    } catch {
      console.warn('LoanConfig not found, using default fineRate=5');
    }

    // Only overdue & not yet fine collected
    const overdueBorrows = await Borrow.find({
      userId: new mongoose.Types.ObjectId(patronId),
      fineCollected: { $ne: true },
      dueDate: { $lt: today },
    }).populate('bookId');

    const fines = overdueBorrows.map((borrow) => {
      const overdueDays = Math.ceil(
        (today.getTime() - borrow.dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const fineAmount = overdueDays * fineRate;

      return {
        borrowId: borrow._id,
        bookTitle: borrow.bookId?.title || 'Unknown',
        dueDate: borrow.dueDate,
        overdueDays,
        fineAmount,
        fineCollected: borrow.fineCollected,
      };
    });

    const totalFine = fines.reduce((acc, f) => acc + f.fineAmount, 0);

    return NextResponse.json({
      success: true,
      patronId,
      overdueCount: fines.length,   // ✅ matches frontend
      totalFine,
      fines,
    });
  } catch (err: any) {
    console.error('Error in GET /api/circulation/fines:', err.message);
    return NextResponse.json(
      { success: false, message: 'Server error', error: err.message },
      { status: 500 }
    );
  }
}

// POST: Collect ALL fines for a patron
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { patronId, amount } = await req.json();

    if (!patronId) {
      return NextResponse.json({ success: false, message: 'Missing patronId' }, { status: 400 });
    }

    const today = new Date();

    // Find all overdue borrows for patron
    const overdueBorrows = await Borrow.find({
      userId: new mongoose.Types.ObjectId(patronId),
      fineCollected: { $ne: true },
      dueDate: { $lt: today },
    }).populate('bookId userId');

    if (!overdueBorrows.length) {
      return NextResponse.json({ success: false, message: 'No overdue fines to collect.' }, { status: 400 });
    }

    // Mark all as fine collected & returned
    for (const borrow of overdueBorrows) {
      borrow.fineCollected = true;
      borrow.fineCollectedAt = new Date();
      borrow.returned = true;
      borrow.returnedAt = new Date();
      await borrow.save();

      await Book.findByIdAndUpdate(borrow.bookId, {
        $set: { available: true, status: 'available' },
      });
    }

    return NextResponse.json({
      success: true,
      message: `₹${amount} collected successfully for patron.`,
      patronId,
      collectedCount: overdueBorrows.length,
      collectedAmount: amount,
    });
  } catch (err: any) {
    console.error('Error in POST /api/circulation/fines:', err.message);
    return NextResponse.json(
      { success: false, message: 'Server error', error: err.message },
      { status: 500 }
    );
  }
}
