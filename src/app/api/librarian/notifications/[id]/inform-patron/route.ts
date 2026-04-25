import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import connectDB from '@/app/lib/mongodb';
import Notification from '@/app/models/notification';

const ACTION_KEY_PREFIX = 'librarian-action:inform-patron:';

function normalizeRole(role?: string): string {
  const normalized = typeof role === 'string' ? role.trim().toLowerCase() : '';
  if (normalized === 'librian') return 'librarian';
  return normalized;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();

    const token = req.cookies.get('token')?.value;
    if (!token || !process.env.JWT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { role?: string };
    const normalizedRole = normalizeRole(decoded.role);
    if (!['librarian', 'admin'].includes(normalizedRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const notificationId = params.id;
    if (!Types.ObjectId.isValid(notificationId)) {
      return NextResponse.json({ error: 'Invalid notification id' }, { status: 400 });
    }

    const sourceNotification = await Notification.findById(notificationId).populate('bookId', 'title');
    if (!sourceNotification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const sourceDedupeKey = sourceNotification.dedupeKey || '';
    if (
      sourceNotification.type !== 'reservation_available' ||
      !sourceDedupeKey.startsWith(ACTION_KEY_PREFIX)
    ) {
      return NextResponse.json({ error: 'Notification does not support patron informing' }, { status: 400 });
    }

    const holdId = sourceDedupeKey.slice(ACTION_KEY_PREFIX.length);
    if (!holdId) {
      return NextResponse.json({ error: 'Invalid hold reference' }, { status: 400 });
    }

    const patronNotificationKey = `hold-available:${holdId}`;
    const existingPatronNotification = await Notification.findOne({
      userId: sourceNotification.userId,
      dedupeKey: patronNotificationKey,
    });

    const populatedBook = sourceNotification.bookId as { title?: string } | null;
    const bookTitle = populatedBook?.title || 'your held book';

    if (!existingPatronNotification) {
      await Notification.create({
        userId: sourceNotification.userId,
        bookId: sourceNotification.bookId,
        message: `Great news! "${bookTitle}" is now ready for you. Please visit the library issue desk to complete your borrowing.`,
        type: 'hold_available',
        read: false,
        dedupeKey: patronNotificationKey,
      });
    }

    sourceNotification.read = true;
    sourceNotification.message = `Patron notified for hold "${bookTitle}".`;
    await sourceNotification.save();

    return NextResponse.json({
      success: true,
      alreadyInformed: Boolean(existingPatronNotification),
    });
  } catch (error) {
    console.error('Inform patron error:', error);
    return NextResponse.json({ error: 'Failed to inform patron' }, { status: 500 });
  }
}
