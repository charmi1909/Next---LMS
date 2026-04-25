import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import connectDB from '@/app/lib/mongodb';
import Notification from '@/app/models/notification';

function getUserFromToken(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token || !process.env.JWT_SECRET) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET) as { id: string; role: string };
  } catch {
    return null;
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await connectDB();
  const user = getUserFromToken(req);
  if (!user || user.role !== 'patron') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = params.id;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  const updated = await Notification.findOneAndUpdate(
    { _id: id, userId: user.id },
    { read: true },
    { new: true }
  );

  if (!updated) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  await connectDB();
  const user = getUserFromToken(req);
  if (!user || user.role !== 'patron') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = params.id;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  const deleted = await Notification.findOneAndDelete({ _id: id, userId: user.id });
  if (!deleted) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
