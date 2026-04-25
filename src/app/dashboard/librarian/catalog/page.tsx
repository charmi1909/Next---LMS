'use client';

import { useEffect, useState } from "react";

// Define the interface for a Book/Catalog Item
interface Book {
  _id: string;
  title: string;
  author: string;
  description: string;
  isbn: string;
  subject: string;
  keywords: string[];
  type: string;
  isAvailable: boolean; // Keep this, but we'll infer from status now
  location: string;
  status: 'available' | 'borrowed' | 'reserved' | 'lost' | 'damaged'; // Add status
}

// Define the interface for the form state
interface FormState {
  id: string;
  type: string;
  title: string;
  author: string;
  description: string;
  isbn: string;
  subject: string;
  keywords: string;
  isAvailable: boolean; // Keep for convenience in form, but derive from status
  location: string;
  status: 'available' | 'borrowed' | 'reserved' | 'lost' | 'damaged'; // Add status
}

const itemStatuses = ['available', 'borrowed', 'reserved', 'lost', 'damaged']; // Define possible statuses

export default function CatalogItemsPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState<FormState>({
    id: "",
    type: "book",
    title: "",
    author: "",
    description: "",
    isbn: "",
    subject: "",
    keywords: "",
    isAvailable: true, // Default to available
    location: "",
    status: "available", // Default status
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchBooks();
  }, []);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/books");
      if (!res.ok) throw new Error('Failed to fetch books');
      const data = await res.json();
      setBooks(data.data || []);
    } catch (error) {
      console.error("Failed to fetch books:", error);
      showMessage('error', 'Failed to load books. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      id: "",
      type: "book",
      title: "",
      author: "",
      description: "",
      isbn: "",
      subject: "",
      keywords: "",
      isAvailable: true,
      location: "",
      status: "available",
    });
    setEditingId(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...form,
        keywords: form.keywords.split(",").map((k) => k.trim()).filter(k => k.length > 0),
        // Ensure isAvailable is correctly set based on status before sending
        isAvailable: form.status === 'available' || form.status === 'reserved', // Reserved items are still technically 'available' for lending to the reserving patron
      };

      const options = {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      };

      const url = editingId ? `/api/books/${editingId}` : "/api/books";
      const res = await fetch(url, options);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to save book');
      }

      showMessage('success', `Book ${editingId ? 'updated' : 'added'} successfully!`);
      resetForm();
      fetchBooks();
    } catch (error: any) {
      console.error("Submit failed:", error);
      showMessage('error', `Failed to ${editingId ? 'update' : 'add'} book: ${error.message || 'Something went wrong'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (book: Book) => {
    setForm({
      id: book._id,
      title: book.title || "",
      author: book.author || "",
      description: book.description || "",
      isbn: book.isbn || "",
      subject: book.subject || "",
      keywords: Array.isArray(book.keywords) ? book.keywords.join(", ") : "",
      type: book.type || "book",
      isAvailable: book.isAvailable ?? true,
      location: book.location || "",
      status: book.status || "available", // Set status when editing
    });
    setEditingId(book._id);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this book?")) {
      setLoading(true);
      try {
        const res = await fetch(`/api/books/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Failed to delete book');
        }

        showMessage('success', 'Book deleted successfully!');
        fetchBooks();
      } catch (error: any) {
        console.error("Delete failed:", error);
        showMessage('error', `Failed to delete book: ${error.message || 'Something went wrong'}`);
      } finally {
        setLoading(false);
      }
    }
  };

  // Function to update status directly from the table (new)
  const handleStatusChange = async (bookId: string, newStatus: string) => {
    setLoading(true);
    try {
      const payload = {
        status: newStatus,
        // Update isAvailable based on the new status
        isAvailable: newStatus === 'available' || newStatus === 'reserved',
      };

      const res = await fetch(`/api/books/${bookId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update status');
      }

      showMessage('success', `Status for book updated successfully!`);
      fetchBooks(); // Refresh list to show updated status
    } catch (error: any) {
      console.error("Status update failed:", error);
      showMessage('error', `Failed to update status: ${error.message || 'Something went wrong'}`);
    } finally {
      setLoading(false);
    }
  };


  const filteredBooks = books.filter((book) =>
    (
      (book.title || "") +
      " " +
      (book.author || "") +
      " " +
      (book.isbn || "") +
      " " +
      (book.subject || "")
    )
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-600';
      case 'borrowed': return 'bg-blue-600';
      case 'reserved': return 'bg-yellow-600';
      case 'lost': return 'bg-red-700';
      case 'damaged': return 'bg-orange-600';
      default: return 'bg-gray-600';
    }
  };


  return (
    <div className="catalog-page-container">
      <h1 className="catalog-header-title">
        Cataloging Management
      </h1>
      <p className="catalog-header-subtitle">
        Manage your library catalog with ease
      </p>

      {message && (
        <div className={`catalog-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="flex flex-col gap-5 mb-8">
        <input
          type="text"
          placeholder="Search by title, author, ISBN, subject..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="catalog-search-input"
        />

        <h2 className="catalog-form-heading">
          {editingId ? 'Edit Book' : 'Add New Book'}
        </h2>
      </div>

      <div className="catalog-form-grid">
        <input
          type="text"
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          disabled={loading}
          className="catalog-form-input"
        />

        <input
          type="text"
          placeholder="Author"
          value={form.author}
          onChange={(e) => setForm({ ...form, author: e.target.value })}
          required
          disabled={loading}
          className="catalog-form-input"
        />

        <input
          type="text"
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          disabled={loading}
          className="catalog-form-input"
        />

        <input
          type="text"
          placeholder="ISBN"
          value={form.isbn}
          onChange={(e) => setForm({ ...form, isbn: e.target.value })}
          disabled={loading}
          className="catalog-form-input"
        />

        <input
          type="text"
          placeholder="Subject"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          disabled={loading}
          className="catalog-form-input"
        />

        <input
          type="text"
          placeholder="Keywords (comma separated)"
          value={form.keywords}
          onChange={(e) => setForm({ ...form, keywords: e.target.value })}
          disabled={loading}
          className="catalog-form-input"
        />

        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          disabled={loading}
          className="catalog-form-select"
        >
          <option value="book">Book</option>
          <option value="magazine">Magazine</option>
          <option value="novel">Novel</option>
          <option value="journal">Journal</option>
          <option value="reference">Reference</option>
          <option value="textbook">Textbook</option>
        </select>

        <input
          type="text"
          placeholder="Location"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          disabled={loading}
          className="catalog-form-input"
        />

        {/* New: Status Select in Form */}
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value as 'available' | 'borrowed' | 'reserved' | 'lost' | 'damaged' })}
          disabled={loading}
          className="catalog-form-select"
        >
          {itemStatuses.map(status => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)} {/* Capitalize first letter */}
            </option>
          ))}
        </select>


        {/* Removed isAvailable checkbox, as it's now inferred from status */}
        {/* <label className="catalog-checkbox-label">
          <input
            type="checkbox"
            checked={form.isAvailable}
            onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
            disabled={loading}
            className="catalog-checkbox-input"
          />
          Available
        </label> */}

        <div className="flex gap-4 col-span-full">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`catalog-form-button submit`}
          >
            {loading ? 'Processing...' : editingId ? 'Update Item' : 'Add Item'}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              disabled={loading}
              className={`catalog-form-button cancel`}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {filteredBooks.length === 0 && !loading && (
        <div className="catalog-no-books-message">
          {searchTerm ? 'No books found matching your search.' : 'No books available. Add some books to get started!'}
        </div>
      )}

      {filteredBooks.length > 0 && (
        <div className="catalog-table-container">
          <table className="catalog-table">
            <thead>
              <tr className="catalog-table-header-row">
                <th className="catalog-table-th">Title</th>
                <th className="catalog-table-th">Author</th>
                <th className="catalog-table-th">ISBN</th>
                <th className="catalog-table-th">Type</th>
                {/* Changed "Available" to "Status" */}
                <th className="catalog-table-th">Status</th>
                <th className="catalog-table-th">Location</th>
                <th className="catalog-table-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBooks.map((book, index) => (
                <tr
                  key={book._id}
                  className={`catalog-table-tr`}
                >
                  <td className="catalog-table-td title">{book.title || "N/A"}</td>
                  <td className="catalog-table-td secondary-text">{book.author || "N/A"}</td>
                  <td className="catalog-table-td mono-text">{book.isbn || "N/A"}</td>
                  <td className="catalog-table-td">
                    <span className="catalog-table-type-tag">
                      {book.type || "N/A"}
                    </span>
                  </td>
                  {/* New: Status Display and Quick Update Dropdown */}
                  <td className="catalog-table-td">
                    <select
                      value={book.status}
                      onChange={(e) => handleStatusChange(book._id, e.target.value)}
                      disabled={loading}
                      className={`px-2 py-1 rounded-md text-xs font-medium text-white appearance-none cursor-pointer ${getStatusColorClass(book.status)}`}
                      style={{ minWidth: '80px' }} // Give it some minimum width
                    >
                      {itemStatuses.map(status => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="catalog-table-td secondary-text">{book.location || "N/A"}</td>
                  <td className="catalog-table-td">
                    <div className="catalog-table-actions">
                      <button
                        onClick={() => handleEdit(book)}
                        disabled={loading}
                        className="catalog-action-button edit"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(book._id)}
                        disabled={loading}
                        className="catalog-action-button delete"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}