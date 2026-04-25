'use client';
import { useState } from "react";

export function AddBookModal({ open, onClose, onBookAdded }: any) {
  const [form, setForm] = useState({
    title: "",
    author: "",
    description: "",
    isbn: "",
    subject: "",
    keywords: "",
    type: "",
    isAvailable: false,
    location: "",
  });

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async () => {
    if (!form.title || !form.author || !form.type) {
      alert("Title, Author, and Type are required.");
      return;
    }

    const payload = {
      ...form,
      keywords: form.keywords.split(",").map((k) => k.trim()),
    };

    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Book added successfully");
        onBookAdded?.(data.data);
        onClose();
      } else {
        alert(data.message || "Failed to add book");
      }
    } catch (err) {
      console.error("Error adding book:", err);
      alert("Something went wrong.");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-md shadow-md w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Add New Book</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-black">&times;</button>
        </div>

        <div className="space-y-3">
          <input name="title" placeholder="Title" onChange={handleChange} className="w-full border p-2 rounded" />
          <input name="author" placeholder="Author" onChange={handleChange} className="w-full border p-2 rounded" />
          <textarea name="description" placeholder="Description" onChange={handleChange} className="w-full border p-2 rounded" />
          <input name="isbn" placeholder="ISBN" onChange={handleChange} className="w-full border p-2 rounded" />
          <input name="subject" placeholder="Subject" onChange={handleChange} className="w-full border p-2 rounded" />
          <input name="keywords" placeholder="Comma-separated Keywords" onChange={handleChange} className="w-full border p-2 rounded" />

          <select name="type" onChange={handleChange} className="w-full border p-2 rounded">
            <option value="">Select Type</option>
            <option value="book">Book</option>
            <option value="magazine">Magazine</option>
            <option value="novel">Novel</option>
            <option value="journal">Journal</option>
            <option value="reference">Reference</option>
            <option value="textbook">Textbook</option>
          </select>

          <input name="location" placeholder="Location" onChange={handleChange} className="w-full border p-2 rounded" />

          <label className="flex items-center space-x-2">
            <input type="checkbox" name="isAvailable" onChange={handleChange} />
            <span>Available</span>
          </label>
        </div>

        <button onClick={handleSubmit} className="w-full mt-4 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition">
          Add Book
        </button>
      </div>
    </div>
  );
}
