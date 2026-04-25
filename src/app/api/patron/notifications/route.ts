import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/mongodb';
import Notification from '@/app/models/notification';

const JWT_SECRET = process.env.JWT_SECRET!;

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // 1. Extract token
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No token' }, { status: 401 });
    }

    // 2. Verify token
    let decoded: { id: string; email: string; role: string };
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 3. Only patrons allowed
    if (decoded.role !== 'patron') {
      return NextResponse.json({ error: 'Access denied: Only patrons allowed' }, { status: 403 });
    }

    // 4. Fetch patron notifications (lean for perf)
    const notifications = await Notification.find({
      userId: decoded.id,
      dedupeKey: { $not: /^librarian-action:/ },
    })
      .sort({ createdAt: -1 })
      .lean();

    // 5. Format response
    return NextResponse.json(
      notifications.map((n) => ({
        _id: n._id,
        message: n.message,
        type: n.type,
        read: n.read,
        createdAt: n.createdAt,
      }))
    );
  } catch (err) {
    console.error('Notification fetch error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
