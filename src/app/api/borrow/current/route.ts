import { NextResponse, NextRequest } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Borrow from '@/app/models/borrow';
import jwt from 'jsonwebtoken';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = req.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No token' }, { status: 401 });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'JWT_SECRET not set in environment' }, { status: 500 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, secret) as { id: string };
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const userId = decoded.id;

    const borrows = await Borrow.find({ userId, returned: false }).populate({
      path: 'bookId',
      select: 'title author',
    });

    const fineRatePerDay = 2;
    const today = new Date();

    const enrichedBorrows = borrows.map((borrow) => {
      const dueDate = new Date(borrow.dueDate);
      let fine = 0;

      if (today > dueDate) {
        const overdueDays = Math.ceil(
          (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        fine = overdueDays * fineRatePerDay;
      }

      return {
        ...borrow.toObject(),
        fine,
      };
    });

    return NextResponse.json(enrichedBorrows);
  } catch (error: any) {
    console.error('Borrow current error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
