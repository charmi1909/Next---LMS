'use client';

import { useEffect, useState } from 'react';

// Re-using the InlineMessage component, ensure it's either in a shared utility file
// or copied here if this is the only page using it in this manner.
// For consistency, I'll put it here, assuming it's not globally imported like in SearchPage.tsx
const InlineMessage: React.FC<{ text: string; type: 'success' | 'error' | 'info'; onClose: () => void }> = ({ text, type, onClose }) => {
  let typeClass = '';
  if (type === 'success') {
    typeClass = 'inline-message-success';
  } else if (type === 'error') {
    typeClass = 'inline-message-error';
  } else if (type === 'info') {
    typeClass = 'inline-message-info';
  }

  return (
    <div
      className={`inline-message ${typeClass}`}
      role="alert"
    >
      <span>{text}</span>
      <button
        onClick={onClose}
        aria-label="Close alert"
        className="inline-message-close-btn"
      >
        &times;
      </button>
    </div>
  );
};


interface BorrowedBook {
  _id: string;
  bookId: {
    _id: string;
    title: string;
    author: string;
  } | null;
  borrowedAt: string;
  dueDate: string;
}

export default function ReturnPage() {
  const [borrowedBooks, setBorrowedBooks] = useState<BorrowedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [returning, setReturning] = useState<string | null>(null); // To disable button during return
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const clearMessage = () => {
    setMessage(null);
  };

  useEffect(() => {
    const fetchBorrowedBooks = async () => {
      setLoading(true);
      setMessage(null);
      try {
        const res = await fetch('/api/borrow/current');
        const data = await res.json();
        if (res.ok) {
          const validBooks = data.filter((item: BorrowedBook) => item.bookId !== null);
          setBorrowedBooks(validBooks);
        } else {
          setMessage({ text: data.message || 'Failed to load borrowed books.', type: 'error' });
        }
      } catch (error) {
        console.error('Failed to fetch borrowed books:', error);
        setMessage({ text: 'Error connecting to the server. Please try again.', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchBorrowedBooks();
  }, []);

  const returnBook = async (id: string) => {
    setReturning(id);
    setMessage(null); // Clear previous messages

    try {
      const res = await fetch(`/api/borrow/return/${id}`, {
        method: 'POST',
      });

      const contentType = res.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        // Handle non-JSON responses gracefully (e.g., plain text or empty)
        const text = await res.text();
        console.warn('Non-JSON response received:', text);
        data = { success: res.ok, message: text || 'Server responded without JSON.' };
      }

      if (res.ok) {
        setBorrowedBooks((prev) => prev.filter((item) => item._id !== id));
        setMessage({ text: data.message || 'Book returned successfully!', type: 'success' });
        window.dispatchEvent(new Event('borrow-updated')); // To update profile
      } else {
        setMessage({ text: data.message || 'Failed to return book.', type: 'error' });
      }
    } catch (error) {
      console.error('Error returning book:', error);
      setMessage({ text: 'Error returning book. Please try again.', type: 'error' });
    } finally {
      setReturning(null);
      // Auto-clear success messages after a few seconds
      if (message?.type === 'success') {
        setTimeout(clearMessage, 3000);
      }
    }
  };

  return (
    <div className="patron-page-container"> {/* Use a custom class for overall page styling */}
      <div className="module-section"> {/* Use a general module section for consistency */}
        <h1 className="module-section-heading">Return Borrowed Books</h1>

        {message && (
          <InlineMessage text={message.text} type={message.type} onClose={clearMessage} />
        )}

        {loading && <p className="text-center text-gray-600 text-lg">Loading your borrowed books...</p>}
        {!loading && borrowedBooks.length === 0 && (
          <p className="text-center text-gray-600 text-lg">You have no borrowed books.</p>
        )}

        {!loading && borrowedBooks.length > 0 && (
          <div className="grid-container"> {/* Use a general grid container class */}
            {borrowedBooks.map((borrow) =>
              borrow.bookId ? (
                <div
                  key={borrow._id}
                  className="book-card" // Re-use the existing book-card style if suitable, or create a new "return-book-card"
                >
                  <h2 className="text-2xl font-semibold text-gray-800 mb-2">{borrow.bookId.title}</h2>
                  <p className="text-gray-600 mb-1">Author: {borrow.bookId.author}</p>
                  <p className="text-gray-500 text-sm">
                    Borrowed At: {new Date(borrow.borrowedAt).toLocaleDateString()}
                  </p>
                  <p className="text-gray-500 text-sm mb-4">
                    Due Date: {new Date(borrow.dueDate).toLocaleDateString()}
                  </p>

                  <button
                    onClick={() => returnBook(borrow._id)}
                    disabled={returning === borrow._id}
                    className="return-button" 
                  >
                    {returning === borrow._id ? 'Returning...' : 'Return Book'}
                  </button>
                </div>
              ) : null
            )}
          </div>
        )}
      </div>
    </div>
  );
}