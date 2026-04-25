'use client';

import { useEffect, useState } from 'react';

type Book = {
  _id: string;
  title: string;
  author: string;
  isAvailable: boolean;
  location: string;
};

type BookMessageType = 'success' | 'error' | 'info';
type BookMessage = { text: string; type: BookMessageType };

export default function AllBooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [borrowing, setBorrowing] = useState<string | null>(null);
  const [holding, setHolding] = useState<string | null>(null);
  const [bookMessages, setBookMessages] = useState<Record<string, BookMessage | null>>({});
  const [error, setError] = useState<string | null>(null);

  const setBookMessage = (bookId: string, message: BookMessage | null) => {
    setBookMessages(prev => ({
      ...prev,
      [bookId]: message,
    }));
    if (message) {
      setTimeout(() => {
        setBookMessages(prev => ({
          ...prev,
          [bookId]: null,
        }));
      }, 3000);
    }
  };


  // Fetch all books
  useEffect(() => {
    const fetchAllBooks = async () => {
      setLoading(true);
      setError(null);
      setBookMessages({}); // Clear all specific book messages on new fetch
      try {
        const res = await fetch('/api/books');
        const data = await res.json();

        if (res.ok && data.success) {
          setBooks(data.data);
        } else {
          setError(data.message || 'Failed to fetch books.');
        }
      } catch (err) {
        setError('Error fetching books. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllBooks();
  }, []);

  const handleBorrow = async (bookId: string) => {
    setBorrowing(bookId);
    setBookMessage(bookId, null); // Clear previous message for this book

    try {
      const res = await fetch('/api/borrow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ bookId }),
      });

      const contentType = res.headers.get('content-type');
      const responseText = await res.text();

      if (!contentType?.includes('application/json')) {
        console.error('Non-JSON response:', responseText);
        setBookMessage(bookId, { text: 'Invalid server response. Try again.', type: 'error' });
        return;
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Response text:', responseText);
        setBookMessage(bookId, { text: 'Invalid JSON response. Try again.', type: 'error' });
        return;
      }

      if (res.ok && data.success) {
        setBookMessage(bookId, { text: data.message || 'Book borrowed!', type: 'success' });
        setBooks(prev =>
          prev.map(book =>
            book._id === bookId ? { ...book, isAvailable: false } : book
          )
        );
      } else {
        setBookMessage(bookId, { text: data.message || 'Borrowing failed.', type: 'error' });
        if (res.status === 401) {
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
        }
      }
    } catch (err) {
      console.error('Borrow error:', err);
      setBookMessage(bookId, { text: 'Error borrowing. Please try again.', type: 'error' });
    } finally {
      setBorrowing(null);
    }
  };

  const handleHold = async (bookId: string) => {
    setHolding(bookId);
    setBookMessage(bookId, null); // Clear previous message for this book

    try {
      const res = await fetch('/api/patron/hold', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ bookId, action: 'place' }),
      });

      const contentType = res.headers.get('content-type');
      const responseText = await res.text();

      if (!contentType?.includes('application/json')) {
        console.error('Non-JSON response from hold API:', responseText);
        setBookMessage(bookId, { text: 'Invalid server response for hold. Try again.', type: 'error' });
        return;
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error for hold:', parseError);
        console.error('Hold response text:', responseText);
        setBookMessage(bookId, { text: 'Invalid JSON response for hold. Try again.', type: 'error' });
        return;
      }

      if (res.ok && data.success) {
        setBookMessage(bookId, { text: data.message || 'Hold placed successfully!', type: 'success' });
      } else {
        setBookMessage(bookId, { text: data.message || 'Failed to place hold.', type: 'error' });
        if (res.status === 401) {
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
        }
      }
    } catch (err) {
      console.error('Hold error:', err);
      setBookMessage(bookId, { text: 'Error placing hold. Please try again.', type: 'error' });
    } finally {
      setHolding(null);
    }
  };


  return (
    <div className="min-h-screen bg-gray-100 font-inter p-4 sm:p-6 lg:p-8 flex flex-col items-center">
      {/* Remove the inline <style> tag here if you've moved styles to patron.css */}
      {/*
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          body { font-family: 'Inter', sans-serif; }
          // ... your existing inline styles for book-card, buttons, etc.
          // These should be moved to patron.css
        `}
      </style>
      */}

      <div className="w-full max-w-6xl">
        <h1 className="module-section-heading">All Items</h1>

        {/* Hold Item Information Card - Keep this as it's static info */}
        <div className="info-card">
          <p className="text-lg mb-2">
            You can place a hold on any book, whether it&apos;s currently unavailable or borrowed.
          </p>
          <p className="text-md">
            Simply click the &quot;Place Hold&quot; button on the book card below.
          </p>
        </div>

        {/* Global Error Display (for initial fetch errors) */}
        {loading && <p className="text-center text-gray-600 text-lg">Loading books...</p>}
        {error && <p className="text-red-500 text-center text-lg">{error}</p>}
        {!loading && !error && books.length === 0 && <p className="text-center text-gray-600 text-lg">No books found.</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => (
            <div key={book._id} className="book-card">
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">{book.title}</h2>
              <p className="text-gray-600 mb-1"><strong>Author:</strong> {book.author}</p>
              <p className="text-gray-600 mb-3"><strong>Location:</strong> {book.location || 'N/A'}</p>
              <p className="text-gray-600 mb-4">
                <strong>Status:</strong>{' '}
                {book.isAvailable ? (
                  <span className="status-available">Available</span>
                ) : (
                  <span className="status-borrowed">Borrowed</span>
                )}
              </p>


              <div className="flex flex-col sm:flex-row gap-3 mt-auto">
                {book.isAvailable ? (
                  <button
                    onClick={() => handleBorrow(book._id)}
                    disabled={borrowing === book._id}
                    className="borrow-button flex-grow"
                  >
                    {borrowing === book._id ? 'Borrowing...' : 'Borrow'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleHold(book._id)}
                    disabled={holding === book._id}
                    className="hold-button flex-grow"
                  >
                    {holding === book._id ? 'Placing Hold...' : 'Place Hold'}
                  </button>
                )}
              </div>

              {bookMessages[book._id] && (
                <div
                  className={`book-card-message ${bookMessages[book._id]?.type === 'success' ? 'book-card-message-success' : bookMessages[book._id]?.type === 'error' ? 'book-card-message-error' : 'book-card-message-info'}`}
                >
                  {bookMessages[book._id]?.text}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}