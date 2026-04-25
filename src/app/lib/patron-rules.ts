import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import Borrow from '@/app/models/borrow';
import Hold from '@/app/models/hold';
import Book from '@/app/models/book';
import Notification from '@/app/models/notification';
import System from '@/app/models/system';
import { Types } from 'mongoose';

export type PatronTokenPayload = {
  id: string;
  role: string;
  email?: string;
  name?: string;
};

export type PatronRules = {
  borrowingLimit: number;
  fineRate: number;
  loanPeriod: number;
  reservationExpiryDays: number;
};

export function getTokenPayload(req: NextRequest): PatronTokenPayload | null {
  const token = req.cookies.get('token')?.value;

  if (!token || !process.env.JWT_SECRET) return null;

  try {
    return jwt.verify(token, process.env.JWT_SECRET) as PatronTokenPayload;
  } catch {
    return null;
  }
}

export function requirePatron(req: NextRequest): PatronTokenPayload | null {
  const payload = getTokenPayload(req);
  if (!payload || payload.role !== 'patron') return null;
  return payload;
}

type SystemConfig = {
  borrowingLimit?: number;
  fineRate?: number;
  loanPeriod?: number;
  reservationExpiryDays?: number;
};

export async function getPatronRules(): Promise<PatronRules> {
  const config = await System.findOne().lean<SystemConfig>();

  const borrowingLimitRaw = Number(config?.borrowingLimit ?? 5);

  const borrowingLimit = Math.max(3, Math.min(5, borrowingLimitRaw));

  return {
    borrowingLimit,
    fineRate: Math.max(0, Number(config?.fineRate ?? 2)),
    loanPeriod: Math.max(1, Number(config?.loanPeriod ?? 14)),
    reservationExpiryDays: Math.max(1, Number(config?.reservationExpiryDays ?? 2)),
  };
}

export function calculateFineForDueDate(
  dueDate: Date,
  fineRate: number,
  now: Date = new Date()
): number {
  if (now <= dueDate) return 0;

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysOverdue = Math.ceil((now.getTime() - dueDate.getTime()) / msPerDay);

  return Math.max(0, daysOverdue * fineRate);
}

export async function refreshUserActiveFines(
  userId: string,
  fineRate: number
): Promise<void> {
  const activeBorrows = await Borrow.find({ userId, returned: false });
  const now = new Date();

  for (const borrow of activeBorrows) {
    const fine = calculateFineForDueDate(new Date(borrow.dueDate), fineRate, now);

    borrow.fine = fine;
    borrow.status = fine > 0 ? 'overdue' : 'borrowed';

    await borrow.save();
  }
}

export async function getOutstandingFine(
  userId: string,
  fineRate: number
): Promise<number> {
  await refreshUserActiveFines(userId, fineRate);

  const borrows = await Borrow.find({
    userId,
    fine: { $gt: 0 },
    finePaid: { $ne: true },
  }).select('fine');

  return borrows.reduce((sum, b) => sum + Number(b.fine || 0), 0);
}

export async function resequencePendingQueue(bookId: string): Promise<void> {
  const pending = await Hold.find({
    bookId,
    status: 'pending',
  }).sort({ holdPlacedAt: 1, createdAt: 1 });

  for (let i = 0; i < pending.length; i++) {
    const queuePosition = i + 1;

    if (pending[i].queuePosition !== queuePosition) {
      pending[i].queuePosition = queuePosition;
      await pending[i].save();
    }
  }
}

async function setBookAsAvailableIfPossible(bookId: string): Promise<void> {
  const book = await Book.findById(bookId);
  if (!book) return;

  if ((book.availableCopies ?? 0) > 0) {
    book.status = 'available';
    book.isAvailable = true;
  } else {
    book.status = 'borrowed';
    book.isAvailable = false;
  }

  await book.save();
}

export async function promoteNextReservation(
  bookId: string,
  reservationExpiryDays: number
): Promise<void> {
  const nextHold = await Hold.findOne({
    bookId,
    status: 'pending',
  }).sort({ holdPlacedAt: 1, createdAt: 1 });

  if (!nextHold) {
    await setBookAsAvailableIfPossible(bookId);
    return;
  }

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + reservationExpiryDays);

  nextHold.status = 'available';
  nextHold.availableAt = now;
  nextHold.notifiedAt = now;
  nextHold.expiresAt = expiresAt;
  nextHold.queuePosition = 1;

  await nextHold.save();

  const book = await Book.findById(bookId);
  const bookTitle = book?.title || 'requested book';

  const librarianActionKey = `librarian-action:inform-patron:${nextHold._id}`;

  const existing = await Notification.findOne({
    dedupeKey: librarianActionKey,
  });

  if (!existing) {
    await Notification.create({
      userId: nextHold.userId,
      bookId: nextHold.bookId,
      message: `Hold available for "${bookTitle}".`,
      type: 'reservation_available',
      read: false,
      dedupeKey: librarianActionKey,
    });
  }

  if (book) {
    book.status = 'reserved';
    book.isAvailable = false;
    await book.save();
  }

  await resequencePendingQueue(bookId);
}

export async function processExpiredReservations(
  reservationExpiryDays: number
): Promise<void> {
  const now = new Date();

  const expiredHolds = await Hold.find({
    status: 'available',
    expiresAt: { $lte: now },
  });

  for (const hold of expiredHolds) {
    hold.status = 'expired';
    hold.cancelledAt = now;
    await hold.save();

    await Notification.create({
      userId: hold.userId,
      bookId: hold.bookId,
      message: 'Your reservation expired because it was not claimed in time.',
      type: 'warning',
      read: false,
      dedupeKey: `reservation-expired:${hold._id}`,
    });

    await promoteNextReservation(
      String(hold.bookId),
      reservationExpiryDays
    );

    await resequencePendingQueue(String(hold.bookId));
  }
}