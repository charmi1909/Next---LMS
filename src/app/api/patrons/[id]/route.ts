import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import User from '@/app/models/user';
import Borrow from '@/app/models/borrow';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';

interface LeanPatron {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  address: string;
  role: 'patron';
}

// ✅ GET
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();

  try {
    const { id } = await params;

    const patron = await User.findById(id)
      .select('-password')
      .lean<LeanPatron | null>();

    if (!patron || patron.role !== 'patron') {
      return NextResponse.json({ error: 'Patron not found' }, { status: 404 });
    }

    const currentBorrowed = await Borrow.find({
      userId: patron._id,
      returned: false,
    })
      .populate('bookId', 'title author isbn')
      .lean();

    const borrowingHistory = await Borrow.find({
      userId: patron._id,
      returned: true,
    })
      .populate('bookId', 'title author isbn')
      .lean();

    return NextResponse.json({
      ...patron,
      currentBorrowed,
      borrowingHistory,
    });
  } catch {
    return NextResponse.json(
      { error: 'Invalid ID or Server Error' },
      { status: 500 }
    );
  }
}

// ✅ PUT
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();

  try {
    const { id } = await params;
    const body = await req.json();

    const updateData: Record<string, unknown> = {
      name: body.name,
      email: body.email,
      phone: body.phone,
      address: body.address,
    };

    if (body.password && body.password.trim() !== '') {
      updateData.password = await bcrypt.hash(body.password, 10);
    }

    const updatedPatron = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    ).select('-password');

    if (!updatedPatron || updatedPatron.role !== 'patron') {
      return NextResponse.json({ error: 'Patron not found' }, { status: 404 });
    }

    return NextResponse.json(updatedPatron);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Update failed';

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}