import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Borrow from '@/app/models/borrow';
import Book from '@/app/models/book';
import LoanConfig from '@/app/models/LoanConfig';

export async function POST(req: Request) {
  try {
    await connectDB();

    const { patronId } = await req.json();

    if (!patronId || typeof patronId !== 'string') {
      return NextResponse.json({ error: 'Invalid or missing patronId' }, { status: 400 });
    }

    const config = await LoanConfig.findOne({});
    const finePerDay = config?.fineRate || 5;

    const overdueBorrows = await Borrow.find({
      userId: patronId,
      returned: false,
      dueDate: { $lt: new Date() },
    });

    let totalFine = 0;

    for (const borrow of overdueBorrows) {
      const daysLate = Math.ceil(
        (Date.now() - new Date(borrow.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      const fine = daysLate * finePerDay;
      totalFine += fine;

      borrow.fine = fine;
      borrow.fineCollected = true;
      borrow.returned = true;   // 👈 mark returned
      await borrow.save();

      // make book available again
      await Book.findByIdAndUpdate(borrow.bookId, { available: true });
    }

    return NextResponse.json({
      success: true,
      totalFineCollected: totalFine,
      message: `₹${totalFine} collected. Books returned and available.`,
    });
  } catch (err: any) {
    console.error('Fines API Error (POST):', err);
    return NextResponse.json({ error: 'Server error', details: err.message }, { status: 500 });
  }
}
