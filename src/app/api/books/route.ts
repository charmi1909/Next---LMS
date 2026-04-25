import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Book from '@/app/models/book';
import Notification from '@/app/models/notification';
import jwt from 'jsonwebtoken';

function normalizeKeywords(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export async function GET(req: NextRequest) {
  await connectDB();

  const q = req.nextUrl.searchParams.get('q')?.trim() || '';
  const category = req.nextUrl.searchParams.get('category')?.trim() || '';
  const availability = req.nextUrl.searchParams.get('availability')?.trim().toLowerCase() || '';
  const year = req.nextUrl.searchParams.get('year')?.trim() || '';
  const sort = req.nextUrl.searchParams.get('sort')?.trim().toLowerCase() || 'newest';

  const andConditions: Record<string, unknown>[] = [];

  if (q) {
    const regex = new RegExp(q, 'i');
    andConditions.push({
      $or: [
        { title: regex },
        { author: regex },
        { keywords: regex },
        { category: regex },
        { subject: regex },
      ],
    });
  }

  if (category) {
    andConditions.push({
      $or: [
        { category: new RegExp(`^${category}$`, 'i') },
        { subject: new RegExp(`^${category}$`, 'i') },
      ],
    });
  }

  if (availability && ['available', 'borrowed', 'reserved'].includes(availability)) {
    andConditions.push({ status: availability });
  }

  if (year && !Number.isNaN(Number(year))) {
    andConditions.push({ publishedYear: Number(year) });
  }

  const query = andConditions.length > 0 ? { $and: andConditions } : {};

  let sortBy: Record<string, 1 | -1> = { createdAt: -1 };
  if (sort === 'highest-rated') {
    sortBy = { ratingAverage: -1, ratingCount: -1, createdAt: -1 };
  } else if (sort === 'newest') {
    sortBy = { createdAt: -1 };
  }

  const books = await Book.find(query).sort(sortBy).lean();
  return NextResponse.json({ success: true, data: books });
}

export async function POST(req: NextRequest) {
  await connectDB();

  try {
    const body = await req.json();
    const totalCopies = Math.max(1, Number(body.totalCopies ?? 1));
    const availableCopies = Math.max(0, Math.min(totalCopies, Number(body.availableCopies ?? totalCopies)));
    const category = (body.category || body.subject || '').toString().trim();
    const status = typeof body.status === 'string' ? body.status.toLowerCase() : undefined;

    const payload = {
      title: String(body.title || '').trim(),
      author: String(body.author || '').trim(),
      description: String(body.description || ''),
      isbn: body.isbn ? String(body.isbn).trim() : undefined,
      category,
      subject: String(body.subject || category || ''),
      keywords: normalizeKeywords(body.keywords),
      type: String(body.type || 'book'),
      publishedYear: body.publishedYear ? Number(body.publishedYear) : undefined,
      totalCopies,
      availableCopies,
      status: status || (availableCopies > 0 ? 'available' : 'borrowed'),
      location: String(body.location || ''),
      ratingAverage: 0,
      ratingCount: 0,
    };

    if (!payload.title || !payload.author) {
      return NextResponse.json(
        { success: false, message: 'Title and author are required.' },
        { status: 400 }
      );
    }

    const book = await Book.create(payload);

    const token = req.cookies.get('token')?.value;
    if (token && process.env.JWT_SECRET) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id?: string; role?: string };
        if (decoded?.id && ['admin', 'librarian'].includes(decoded.role || '')) {
          await Notification.create({
            userId: decoded.id,
            bookId: book._id,
            message: `Book added: "${book.title}"${book.isbn ? ` [${book.isbn}]` : ''}.`,
            type: 'book_added',
            read: false,
            dedupeKey: `book-added:${book._id}`,
          });
        }
      } catch (authError) {
        console.warn('Could not create book-added notification:', authError);
      }
    }

    return NextResponse.json({ success: true, data: book }, { status: 201 });
  } catch (error: unknown) {
    const mongoError = error as { code?: number };
    if (mongoError.code === 11000) {
      return NextResponse.json(
        { success: false, message: 'A book with this ISBN already exists.' },
        { status: 400 }
      );
    }

    console.error('Book creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Book creation failed' },
      { status: 500 }
    );
  }
}
