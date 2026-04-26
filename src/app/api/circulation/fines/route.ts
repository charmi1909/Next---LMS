import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/app/lib/mongodb';
import Borrow from '@/app/models/borrow';
import Book from '@/app/models/book';
import LoanConfig from '@/app/models/LoanConfig';
import Fine from '@/app/models/fine';
import Notification from '@/app/models/notification';
import { getUserFromToken } from '@/app/lib/auth';

const DAY_MS = 1000 * 60 * 60 * 24;

const getOverdueDays = (dueDate: Date, today: Date) =>
  Math.max(0, Math.ceil((today.getTime() - dueDate.getTime()) / DAY_MS));

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
      const overdueDays = getOverdueDays(borrow.dueDate, today);
      const fineAmount = overdueDays * fineRate;
      borrow.fine = fineAmount;

      return {
        borrowId: borrow._id,
        bookTitle: borrow.bookId?.title || 'Unknown',
        dueDate: borrow.dueDate,
        overdueDays,
        fineAmount,
        fineCollected: borrow.fineCollected,
      };
    });
    await Promise.all(overdueBorrows.map((borrow) => borrow.save()));

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

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { patronId, borrowId } = await req.json();

    const today = new Date();
    let collectedFines: {
      borrowerName: string;
      borrowerId: string;
      bookTitle: string;
      bookId: string;
      fineAmount: number;
      collectedAt: Date;
    }[] = [];
    const fineRateDoc = await LoanConfig.findOne();
    const fineRate = fineRateDoc?.fineRate || 5;

    if (borrowId) {
      // Single fine collection from librarian overdue page
      const borrow = await Borrow.findById(borrowId).populate('bookId userId');
      if (!borrow || !borrow.bookId) {
         return NextResponse.json({ success: false, message: 'Borrow record not found' }, { status: 404 });
      }
      
      const overdueDays = getOverdueDays(borrow.dueDate, today);
      const actualAmount = overdueDays * fineRate;

      borrow.fine = actualAmount;
      borrow.fineCollected = true;
      borrow.fineCollectedAt = today;
      borrow.finePaid = true;
      borrow.finePaidAt = today;
      borrow.returned = true;
      borrow.returnedAt = today;
      borrow.status = 'returned';
      await borrow.save();

      await Book.findByIdAndUpdate(borrow.bookId._id, {
        $set: { available: true, status: 'available' },
      });

      await Fine.create({
        userId: borrow.userId._id,
        bookId: borrow.bookId._id,
        borrowId: borrow._id,
        amount: actualAmount,
        collectedBy: new mongoose.Types.ObjectId(user.id),
        collectedAt: today,
        status: 'paid'
      });

      await Notification.create({
        userId: borrow.userId._id,
        bookId: borrow.bookId._id,
        borrowId: borrow._id,
        message: `Fine collected for "${(borrow.bookId as any).title}". Amount: Rs ${actualAmount.toFixed(2)}.`,
        type: 'overdue_fine',
        read: false,
        dedupeKey: `fine-collected:${borrow._id}:${today.getTime()}`,
      });

      collectedFines.push({
        borrowerName: (borrow.userId as any).name || 'Unknown',
        borrowerId: String(borrow.userId._id),
        bookTitle: (borrow.bookId as any).title || 'Unknown',
        bookId: String(borrow.bookId._id),
        fineAmount: actualAmount,
        collectedAt: today
      });

      return NextResponse.json({
        success: true,
        message: 'Fine collected successfully. Book marked as returned.',
        collectedFine: collectedFines[0],
        collectedAmount: actualAmount,
      });

    } else if (patronId) {
      // Collect all fines for a patron
      const overdueBorrows = await Borrow.find({
        userId: new mongoose.Types.ObjectId(patronId),
        fineCollected: { $ne: true },
        dueDate: { $lt: today },
      }).populate('bookId userId');

      if (!overdueBorrows.length) {
        return NextResponse.json({ success: false, message: 'No overdue fines to collect.' }, { status: 400 });
      }

      let totalCalculatedAmount = 0;

      for (const borrow of overdueBorrows) {
        const overdueDays = getOverdueDays(borrow.dueDate, today);
        const borrowFineAmount = overdueDays * fineRate;
        totalCalculatedAmount += borrowFineAmount;

        borrow.fine = borrowFineAmount;
        borrow.fineCollected = true;
        borrow.fineCollectedAt = today;
        borrow.finePaid = true;
        borrow.finePaidAt = today;
        borrow.returned = true;
        borrow.returnedAt = today;
        borrow.status = 'returned';
        await borrow.save();

        await Book.findByIdAndUpdate(borrow.bookId._id, {
          $set: { available: true, status: 'available' },
        });

        await Fine.create({
          userId: borrow.userId._id,
          bookId: borrow.bookId._id,
          borrowId: borrow._id,
          amount: borrowFineAmount,
          collectedBy: new mongoose.Types.ObjectId(user.id),
          collectedAt: today,
          status: 'paid'
        });

        await Notification.create({
          userId: borrow.userId._id,
          bookId: borrow.bookId._id,
          borrowId: borrow._id,
          message: `Fine collected for "${(borrow.bookId as any).title}". Amount: Rs ${borrowFineAmount.toFixed(2)}.`,
          type: 'overdue_fine',
          read: false,
          dedupeKey: `fine-collected:${borrow._id}:${today.getTime()}`,
        });

        collectedFines.push({
          borrowerName: (borrow.userId as any).name || 'Unknown',
          borrowerId: String(borrow.userId._id),
          bookTitle: (borrow.bookId as any).title || 'Unknown',
          bookId: String(borrow.bookId._id),
          fineAmount: borrowFineAmount,
          collectedAt: today,
        });
      }

      return NextResponse.json({
        success: true,
        message: `₹${totalCalculatedAmount.toFixed(2)} collected successfully for patron.`,
        patronId,
        collectedCount: overdueBorrows.length,
        collectedAmount: totalCalculatedAmount,
        collectedFines,
      });
    } else {
      return NextResponse.json({ success: false, message: 'Missing patronId or borrowId' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('Error in POST /api/circulation/fines:', err.message);
    return NextResponse.json(
      { success: false, message: 'Server error', error: err.message },
      { status: 500 }
    );
  }
}
