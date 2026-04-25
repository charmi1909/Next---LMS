import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Borrow from '@/app/models/borrow';
import User from '@/app/models/user';
import { getUserFromToken } from '@/app/lib/auth'; 
export async function GET() {
  try {
    await connectDB();

    const user = await getUserFromToken();
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await User.findOne({ email: user.email });
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = dbUser._id;

    const totalBorrowed = await Borrow.countDocuments({ userId });
    const currentBorrowed = await Borrow.countDocuments({ userId, returned: false });

    return NextResponse.json({
      total: totalBorrowed,
      current: currentBorrowed,
    });
  } catch (error) {
    console.error('Failed to fetch borrow stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
