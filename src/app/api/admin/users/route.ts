import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import User from '@/app/models/user';

export async function GET() {
  try {
    await connectDB();
    const users = await User.find({}, '-password');
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const { name, email, password, role, phone, address, dob } = await req.json();

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    const newUser = await User.create({ name, email, password, role, phone, address, dob });
    const userWithoutPassword = newUser.toObject();
    delete userWithoutPassword.password;

    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error('POST /api/admin/users error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
