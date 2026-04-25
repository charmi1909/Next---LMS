import { NextResponse } from 'next/server';
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

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  await connectDB();

  try {
    const patron = await User.findById(params.id)
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
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid ID or Server Error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  await connectDB();

  try {
    const body = await req.json();
    const { name, email, phone, address, password } = body;

    const updateData: Record<string, any> = { name, email, phone, address };

    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedPatron = await User.findByIdAndUpdate(
      params.id,
      { $set: updateData },
      { new: true }
    ).select('-password');

    if (!updatedPatron || updatedPatron.role !== 'patron') {
      return NextResponse.json({ error: 'Patron not found' }, { status: 404 });
    }

    return NextResponse.json(updatedPatron, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Update failed' },
      { status: 500 }
    );
  }
}
