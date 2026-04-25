import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import User from '@/app/models/user';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  await connectDB();
  try {
    const body = await req.json();
    let { name, email, phone, address, password } = body;

    // Normalize email
    email = email.toLowerCase();

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if email already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new patron
    const newPatron = await User.create({
      name,
      email,
      phone,
      address,
      password: hashedPassword,
      role: 'patron',
    });

    // Exclude password from response
    const { password: _, ...safeUser } = newPatron.toObject();

    return NextResponse.json(safeUser, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function GET() {
  await connectDB();
  try {
    const patrons = await User.find({ role: 'patron' }).select('-password');
    return NextResponse.json(patrons, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
