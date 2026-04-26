import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Fine from '@/app/models/fine';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const fines = await Fine.find({})
      .populate('userId', 'name email role')
      .populate('collectedBy', 'name email role')
      .populate('bookId', 'title isbn')
      .sort({ collectedAt: -1 });

    const formattedFines = fines.map(f => ({
      _id: f._id,
      amount: f.amount,
      collectedAt: f.collectedAt,
      status: f.status,
      patron: f.userId ? { name: f.userId.name, email: f.userId.email } : { name: 'Unknown' },
      book: f.bookId ? { title: f.bookId.title, isbn: f.bookId.isbn } : { title: 'Unknown' },
      collectedBy: f.collectedBy ? { name: f.collectedBy.name, role: f.collectedBy.role } : { name: 'Self Paid' } 
    }));

    const totalCollected = formattedFines.reduce((sum, fine) => sum + (fine.amount || 0), 0);
    const byPatron = Object.values(
      formattedFines.reduce((acc: Record<string, { patronName: string; total: number; count: number }>, fine) => {
        const key = fine.patron?.email || fine.patron?.name || 'unknown';
        if (!acc[key]) {
          acc[key] = {
            patronName: fine.patron?.name || 'Unknown',
            total: 0,
            count: 0,
          };
        }
        acc[key].total += fine.amount || 0;
        acc[key].count += 1;
        return acc;
      }, {})
    );

    return NextResponse.json({
      success: true,
      fines: formattedFines,
      summary: {
        totalCollected,
        recordsCount: formattedFines.length,
        byPatron,
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin fines:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
