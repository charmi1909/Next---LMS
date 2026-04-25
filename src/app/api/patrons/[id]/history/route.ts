import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/app/lib/mongodb';
import Borrow from '@/app/models/borrow';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await connectDB();
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const history = await Borrow.find({ patron: id })
        .populate('book')
        .sort({ borrowedAt: -1 });

      res.status(200).json(history);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
}
