import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/mongodb";
import Book from "@/app/models/book";
import { Types } from "mongoose";


export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await connectDB();

  const { id } = params;

  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid ID format" },
      { status: 400 }
    );
  }

  const book = await Book.findById(id).lean();

  if (!book) {
    return NextResponse.json(
      { success: false, message: "Book not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: book }, { status: 200 });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await connectDB();

  const { id } = params;

  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid ID format" },
      { status: 400 }
    );
  }

  const body = await req.json();

  const updatedBook = await Book.findByIdAndUpdate(id, body, {
    new: true,
    runValidators: true,
  }).lean();

  if (!updatedBook) {
    return NextResponse.json(
      { success: false, message: "Book not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: updatedBook }, { status: 200 });
}


export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await connectDB();

  const { id } = params;

  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid ID format" },
      { status: 400 }
    );
  }

  const deletedBook = await Book.findByIdAndDelete(id).lean();

  if (!deletedBook) {
    return NextResponse.json(
      { success: false, message: "Book not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(
    { success: true, message: "Book deleted" },
    { status: 200 }
  );
}
