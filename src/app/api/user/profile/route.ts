import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import User from '@/app/models/user';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

export async function GET() {
  try {
    await connectDB();
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const secret = process.env.JWT_SECRET!;
    const decoded = jwt.verify(token, secret) as { id: string };
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('GET profile error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await connectDB();
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const secret = process.env.JWT_SECRET!;
    const decoded = jwt.verify(token, secret) as { id: string };

    const body = await req.json();
    const { name, email, phone, address, dob } = body;

    const updatedUser = await User.findByIdAndUpdate(
      decoded.id,
      { name, email, phone, address, dob },
      { new: true, runValidators: true }
    ).select('-password');

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('PUT profile error:', error);
    return NextResponse.json({ message: 'Update failed' }, { status: 500 });
  }
}
