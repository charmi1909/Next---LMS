import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Borrow from '@/app/models/borrow';
import { Types } from 'mongoose';

export async function PATCH(req: NextRequest, context: any) {
  try {
    await connectDB();

    const { id } = context.params;

    // 🔒 Validate ID
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid borrow ID' },
        { status: 400 }
      );
    }

    const borrow = await Borrow.findById(id);

    if (!borrow) {
      return NextResponse.json(
        { success: false, message: 'Borrow record not found' },
        { status: 404 }
      );
    }

    borrow.fineCollected = true;
    await borrow.save();

    return NextResponse.json({
      success: true,
      message: 'Fine collected',
    });
  } catch (error) {
    console.error('Error collecting fine:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}