import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import User from '@/app/models/user'; 
import connectDB from '@/app/lib/mongodb'; 

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

export async function getUserFromToken() {
  try {
    await connectDB(); 
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

    const user = await User.findById(decoded.id).select('name email role');
    if (!user) return null;

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    };
  } catch (error) {
    console.error('JWT decode or user fetch failed:', error);
    return null;
  }
}
