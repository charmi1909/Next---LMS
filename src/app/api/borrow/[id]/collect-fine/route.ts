import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Borrow from '@/app/models/borrow';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const borrowId = params.id;

    const borrow = await Borrow.findById(borrowId);
    if (!borrow) {
      return NextResponse.json({ success: false, message: 'Borrow record not found' }, { status: 404 });
    }

    borrow.fineCollected = true;
    await borrow.save();

    return NextResponse.json({ success: true, message: 'Fine collected' });
  } catch (error) {
    console.error('Error collecting fine:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
