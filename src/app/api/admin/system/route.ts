import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import System from '@/app/models/system';
import jwt from 'jsonwebtoken';
import Notification from '@/app/models/notification';

export async function GET() {
  try {
    await connectDB();

    let systemConfig = await System.findOne();
    if (!systemConfig) {
      systemConfig = new System();
      await systemConfig.save();
    }

    return NextResponse.json(systemConfig);
  } catch (error) {
    console.error('GET /api/system error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system configuration' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectDB();

    const data = await req.json();
    console.log('Received config to update:', data);

    const updatedConfig = await System.findOneAndUpdate(
      {},
      {
        borrowingLimit: data.borrowingLimit,
        fineRate: data.fineRate,
        loanPeriod: data.loanPeriod,
      },
      { new: true, upsert: true }
    );

    console.log('Updated system config:', updatedConfig);

    const rawToken = req.cookies.get('token')?.value;
    const token = rawToken ? decodeURIComponent(rawToken) : '';
    if (token && process.env.JWT_SECRET) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id?: string; role?: string };
        const role = (decoded?.role || '').toLowerCase();
        if (decoded?.id && role === 'admin') {
          await Notification.create({
            userId: decoded.id,
            message: `System configuration updated (Borrowing limit: ${data.borrowingLimit}, Fine rate: ${data.fineRate}, Loan period: ${data.loanPeriod}).`,
            type: 'info',
            read: false,
            dedupeKey: `system-config:${new Date().toISOString()}`,
          });
        }
      } catch (authError) {
        console.warn('Could not create system configuration notification:', authError);
      }
    }

    return NextResponse.json(updatedConfig);
  } catch (error) {
    console.error('PUT /api/system error:', error);
    return NextResponse.json(
      { error: 'Failed to update system configuration' },
      { status: 500 }
    );
  }
}
