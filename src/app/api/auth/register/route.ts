import user from '@/app/models/user';
import { connectDB } from '@/app/lib/mongodb';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    await connectDB();
    const {
      name,
      email,
      password,
      phone,
      address,
      dob,
      role,
    } = await req.json();

    if (!name  || !email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const existingUser = await user.findOne({ email, role });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email and role already exists.' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new user({
      name,
      email,
      password: hashedPassword,
      phone,
      address,
      dob: dob ? new Date(dob) : undefined,
      role,
    });

    await newUser.save();

    return NextResponse.json({ message: 'Registration successful!' }, { status: 201 });
  } catch (err) {
    console.error('Registration Error:', err);
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}

