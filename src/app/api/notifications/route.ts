import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/mongodb';
import Notification from '@/app/models/notification';

const ADMIN_IMPORTANT_TYPES = ['book_added'];

type TokenPayload = {
  id?: string;
  role?: string;
};

export async function GET(req: NextRequest) {
  await connectDB();

  const rawToken = req.cookies.get('token')?.value;
  const token = rawToken ? decodeURIComponent(rawToken) : '';
  if (!token || !process.env.JWT_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let decoded: TokenPayload;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET) as TokenPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const role = (decoded.role || '').toLowerCase();
  if (role === 'admin') {
    const notifications = await Notification.find({
      $or: [
        { type: { $in: ADMIN_IMPORTANT_TYPES } },
        { dedupeKey: { $regex: /^system-config:/ } },
      ],
    }).sort({ createdAt: -1 });
    return NextResponse.json(notifications);
  }

  const notifications = await Notification.find({
    userId: decoded.id,
  }).sort({ createdAt: -1 });
  return NextResponse.json(notifications);
}

export async function POST(req: Request) {
  await connectDB();
  const { message, type, userId } = await req.json();
  if (!message || !type || !userId) {
    return NextResponse.json({ error: 'message, type, and userId are required' }, { status: 400 });
  }
  const notification = await Notification.create({ message, type, userId });
  return NextResponse.json(notification, { status: 201 });
}
