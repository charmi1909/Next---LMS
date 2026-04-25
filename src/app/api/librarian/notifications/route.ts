import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/mongodb';
import Notification from '@/app/models/notification';
import Borrow from '@/app/models/borrow';
import Book from '@/app/models/book';
import Hold from '@/app/models/hold';

type EventCategory = 'borrow' | 'fine' | 'availability' | 'overdue' | 'general';
const INFORM_PATRON_KEY_PREFIX = 'librarian-action:inform-patron:';
type PopulatedUser = {
  _id: string;
  name?: string;
  email?: string;
  role?: string;
};
type PopulatedBook = {
  _id: string;
  title?: string;
  isbn?: string;
  status?: string;
  isAvailable?: boolean;
};
type LeanNotification = {
  _id: string;
  message?: string;
  type?: string;
  read?: boolean;
  createdAt?: Date | string;
  dedupeKey?: string;
  userId?: PopulatedUser | null;
  bookId?: PopulatedBook | null;
};
type LeanBorrowAlert = {
  _id: string;
  dueDate?: Date | string;
  updatedAt?: Date | string;
  createdAt?: Date | string;
  fine?: number;
  userId?: {
    _id: string;
    name?: string;
    email?: string;
  } | null;
  bookId?: {
    _id: string;
    title?: string;
    isbn?: string;
  } | null;
};
type LeanAvailableBook = {
  _id: string;
  title?: string;
  isbn?: string;
  status?: string;
  isAvailable?: boolean;
  updatedAt?: Date | string;
  createdAt?: Date | string;
};
type LeanAvailableHold = {
  _id: string;
  holdPlacedAt?: Date | string;
  availableAt?: Date | string | null;
  userId?: string | { _id: string } | null;
  bookId?: string | {
    _id: string;
    title?: string;
  } | null;
};

function normalizeRole(role?: string): string {
  const normalized = typeof role === 'string' ? role.trim().toLowerCase() : '';
  if (normalized === 'librian') return 'librarian';
  return normalized;
}

function detectCategory(type: string, message: string): EventCategory {
  const normalizedType = type.toLowerCase();
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedType.includes('borrow') ||
    normalizedType.includes('return') ||
    normalizedMessage.includes('borrow')
  ) {
    return 'borrow';
  }
  if (normalizedType.includes('fine') || normalizedMessage.includes('fine') || normalizedMessage.includes('penalty')) {
    return 'fine';
  }
  if (
    normalizedType.includes('available') ||
    normalizedType.includes('hold') ||
    normalizedMessage.includes('available')
  ) {
    return 'availability';
  }
  if (normalizedType.includes('overdue') || normalizedMessage.includes('overdue')) {
    return 'overdue';
  }
  return 'general';
}

function detectAction(type: string, dedupeKey?: string, isRead?: boolean) {
  if (
    !isRead &&
    type === 'reservation_available' &&
    typeof dedupeKey === 'string' &&
    dedupeKey.startsWith(INFORM_PATRON_KEY_PREFIX)
  ) {
    return 'inform_patron';
  }
  return null;
}

function normalizeLibrarianMessage(message: string): string {
  return message.replace(/\s*We will notify you once it becomes available\.?/i, '').trim();
}

function extractObjectId(value: string | { _id: string } | null | undefined): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return String(value._id || '');
}

async function ensureLibrarianActionNotification(hold: LeanAvailableHold): Promise<void> {
  const holdId = String(hold._id);
  const userId = extractObjectId(hold.userId);
  const bookId = extractObjectId(hold.bookId);
  if (!userId || !bookId) return;

  const dedupeKey = `${INFORM_PATRON_KEY_PREFIX}${holdId}`;
  const book = await Book.findById(bookId).select('title').lean<{ title?: string } | null>();
  await Notification.updateOne(
    { dedupeKey },
    {
      $setOnInsert: {
        userId,
        bookId,
        message: `Hold ready for patron confirmation: "${book?.title || 'requested book'}".`,
        type: 'reservation_available',
        read: false,
        dedupeKey,
      },
    },
    { upsert: true }
  );
}

export async function GET(req: NextRequest) {
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

    const unreadOnly = req.nextUrl.searchParams.get('unreadOnly') === 'true';
    const filter = unreadOnly ? { read: false } : {};

    // Safety sync: ensure available holds always have an actionable librarian notification.
    const availableHolds = await Hold.find({ status: 'available' })
      .sort({ availableAt: -1, createdAt: -1 })
      .limit(100)
      .lean<LeanAvailableHold[]>();
    for (const hold of availableHolds) {
      await ensureLibrarianActionNotification(hold);
    }

    // Strong fallback: if a book is manually set as available while holds are still pending,
    // auto-promote the oldest pending hold and create the librarian action notification.
    const pendingHolds = await Hold.find({ status: 'pending' })
      .sort({ holdPlacedAt: 1, createdAt: 1 })
      .limit(200)
      .lean<LeanAvailableHold[]>();
    const firstPendingByBook = new Map<string, LeanAvailableHold>();
    for (const hold of pendingHolds) {
      const bookId = extractObjectId(hold.bookId);
      if (!bookId || firstPendingByBook.has(bookId)) continue;
      firstPendingByBook.set(bookId, hold);
    }
    for (const hold of firstPendingByBook.values()) {
      const bookId = extractObjectId(hold.bookId);
      if (!bookId) continue;
      const book = await Book.findById(bookId).select('isAvailable status').lean<{ isAvailable?: boolean; status?: string } | null>();
      const isNowAvailable = Boolean(book?.isAvailable) || book?.status === 'available';
      if (!isNowAvailable) continue;

      const now = new Date();
      await Hold.updateOne(
        { _id: hold._id, status: 'pending' },
        { $set: { status: 'available', availableAt: now, notifiedAt: now } }
      );
      const refreshedHold = await Hold.findById(hold._id).lean<LeanAvailableHold | null>();
      if (refreshedHold) {
        await ensureLibrarianActionNotification(refreshedHold);
      }
    }

    const rawNotifications = await Notification.find(filter)
      .populate('userId', 'name email role')
      .populate('bookId', 'title isbn status isAvailable')
      .sort({ createdAt: -1 })
      .limit(80)
      .lean<LeanNotification[]>();

    const overdueBorrows = await Borrow.find({
      returned: false,
      dueDate: { $lt: new Date() },
    })
      .populate('userId', 'name email')
      .populate('bookId', 'title isbn')
      .sort({ dueDate: 1 })
      .limit(20)
      .lean<LeanBorrowAlert[]>();

    const fineAlerts = await Borrow.find({
      fine: { $gt: 0 },
      fineCollected: { $ne: true },
      returned: false,
    })
      .populate('userId', 'name email')
      .populate('bookId', 'title isbn')
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean<LeanBorrowAlert[]>();

    const availableBooks = await Book.find({
      $or: [{ status: 'available' }, { isAvailable: true }],
    })
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean<LeanAvailableBook[]>();

    const normalizedNotifications = rawNotifications
      .filter((n) => {
        const key = typeof n.dedupeKey === 'string' ? n.dedupeKey : '';
        return !(
          n.type === 'hold_available' ||
          n.type === 'system_configuration' ||
          key.startsWith('hold-available:')
        );
      })
      .map((n) => ({
      id: String(n._id),
      message: normalizeLibrarianMessage(n.message || ''),
      type: n.type || 'info',
      category: detectCategory(n.type || 'info', n.message || ''),
      read: Boolean(n.read),
      createdAt: n.createdAt || new Date(0),
      action: detectAction(n.type || 'info', n.dedupeKey, n.read),
      user: n.userId
        ? {
            id: String(n.userId._id),
            name: n.userId.name || 'Unknown User',
            email: n.userId.email || '',
            role: n.userId.role || '',
          }
        : null,
      book: n.bookId
        ? {
            id: String(n.bookId._id),
            title: n.bookId.title || 'Unknown Book',
            isbn: n.bookId.isbn || '',
            status: n.bookId.status || '',
            isAvailable: Boolean(n.bookId.isAvailable),
          }
        : null,
      source: 'notification',
    }));

    const overdueEntries = overdueBorrows.map((borrow) => ({
      id: `overdue-${borrow._id}`,
      message: `${borrow.userId?.name || 'A patron'} has overdue book "${borrow.bookId?.title || 'Unknown Book'}".`,
      type: 'overdue',
      category: 'overdue' as EventCategory,
      read: false,
      createdAt: borrow.dueDate || new Date(0),
      action: null,
      user: borrow.userId
        ? {
            id: String(borrow.userId._id),
            name: borrow.userId.name || 'Unknown User',
            email: borrow.userId.email || '',
            role: 'patron',
          }
        : null,
      book: borrow.bookId
        ? {
            id: String(borrow.bookId._id),
            title: borrow.bookId.title || 'Unknown Book',
            isbn: borrow.bookId.isbn || '',
            status: 'overdue',
            isAvailable: false,
          }
        : null,
      source: 'derived',
    }));

    const fineEntries = fineAlerts.map((borrow) => ({
      id: `fine-${borrow._id}`,
      message: `Penalty pending for ${borrow.userId?.name || 'a patron'} on "${borrow.bookId?.title || 'Unknown Book'}" (Rs. ${borrow.fine || 0}).`,
      type: 'overdue_fine',
      category: 'fine' as EventCategory,
      read: false,
      createdAt: borrow.updatedAt || borrow.createdAt || new Date(0),
      action: null,
      user: borrow.userId
        ? {
            id: String(borrow.userId._id),
            name: borrow.userId.name || 'Unknown User',
            email: borrow.userId.email || '',
            role: 'patron',
          }
        : null,
      book: borrow.bookId
        ? {
            id: String(borrow.bookId._id),
            title: borrow.bookId.title || 'Unknown Book',
            isbn: borrow.bookId.isbn || '',
            status: 'borrowed',
            isAvailable: false,
          }
        : null,
      source: 'derived',
    }));

    const availabilityEntries = availableBooks.map((book) => ({
      id: `available-${book._id}-${book.updatedAt}`,
      message: `Book available: "${book.title || 'Untitled'}"${book.isbn ? ` (ISBN: ${book.isbn})` : ''}.`,
      type: 'book_available',
      category: 'availability' as EventCategory,
      read: false,
      createdAt: book.updatedAt || book.createdAt || new Date(0),
      action: null,
      user: null,
      book: {
        id: String(book._id),
        title: book.title || 'Unknown Book',
        isbn: book.isbn || '',
        status: book.status || 'available',
        isAvailable: Boolean(book.isAvailable),
      },
      source: 'derived',
    }));

    const items = [...normalizedNotifications, ...overdueEntries, ...fineEntries, ...availabilityEntries]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 120);

    const unreadCount = normalizedNotifications.filter((item) => !item.read).length + overdueEntries.length + fineEntries.length;

    return NextResponse.json({ items, unreadCount });
  } catch (error) {
    console.error('Librarian notifications error:', error);
    return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 });
  }
}
