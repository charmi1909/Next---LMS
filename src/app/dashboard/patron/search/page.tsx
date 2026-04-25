'use client';

import { useEffect, useState } from 'react';

type Book = {
  _id: string;
  title: string;
  author: string;
  isbn: string;
  subject: string;
  location: string;
  keywords: string[];
  isAvailable: boolean;
};

const InlineMessage: React.FC<{ text: string; type: 'success' | 'error' | 'info'; onClose: () => void }> = ({ text, type, onClose }) => {
  let typeClass = '';
  if (type === 'success') typeClass = 'inline-message-success';
  else if (type === 'error') typeClass = 'inline-message-error';
  else if (type === 'info') typeClass = 'inline-message-info';

  return (
    <div className={`inline-message ${typeClass}`} role="alert">
      <span>{text}</span>
      <button onClick={onClose} aria-label="Close alert" className="inline-message-close-btn">
        &times;
      </button>
    </div>
  );
};

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [borrowing, setBorrowing] = useState<string | null>(null);
  const [holding, setHolding] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [bookMessages, setBookMessages] = useState<
    { [bookId: string]: { text: string; type: 'success' | 'error' | 'info' } | null }
  >({});

  const clearMessage = () => setMessage(null);
  const setBookMessage = (bookId: string, next: { text: string; type: 'success' | 'error' | 'info' } | null) => {
    setBookMessages((prev) => ({ ...prev, [bookId]: next }));
    if (next) {
      setTimeout(() => {
        setBookMessages((prev) => ({ ...prev, [bookId]: null }));
      }, 3500);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResults([]);
    setMessage(null);
    try {
      const res = await fetch(`/api/books/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success) {
        setResults(data.data);
      } else {
        setResults([]);
        setMessage({ text: data.message || 'Failed to perform search.', type: 'error' });
      }
    } catch (err) {
      setResults([]);
      setMessage({ text: 'Error performing search. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleBorrow = async (bookId: string) => {
    setBorrowing(bookId);
    setMessage(null);
    setBookMessage(bookId, null);
    try {
      const res = await fetch('/api/borrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ bookId }),
      });

      const responseText = await res.text();
      if (!res.headers.get('content-type')?.includes('application/json')) {
        setMessage({ text: 'Invalid server response. Please try again.', type: 'error' });
        return;
      }

      const data = JSON.parse(responseText);
      if (res.ok && data.success) {
        setBookMessage(bookId, { text: data.message || 'Book borrowed successfully!', type: 'success' });
        setResults(prev =>
          prev.map(book =>
            book._id === bookId ? { ...book, isAvailable: false } : book
          )
        );
      } else {
        setBookMessage(bookId, { text: data.message || 'Borrowing failed.', type: 'error' });
        if (res.status === 401) {
          setBookMessage(bookId, { text: 'Unauthorized. Please log in again.', type: 'error' });
          setTimeout(() => window.location.href = '/login', 1500);
        }
      }
    } catch (err) {
      setBookMessage(bookId, { text: 'Error borrowing book. Please try again.', type: 'error' });
    } finally {
      setBorrowing(null);
    }
  };

  const handleHold = async (bookId: string) => {
    setHolding(bookId);
    setMessage(null);
    setBookMessage(bookId, null);
    try {
      const res = await fetch('/api/patron/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ bookId, action: 'place' }),
      });

      const responseText = await res.text();
      if (!res.headers.get('content-type')?.includes('application/json')) {
        setMessage({ text: 'Invalid server response for hold. Please try again.', type: 'error' });
        return;
      }

      const data = JSON.parse(responseText);
      if (res.ok && data.success) {
        setBookMessage(bookId, { text: data.message || 'Hold placed successfully!', type: 'success' });
      } else {
        setBookMessage(bookId, { text: data.message || 'Failed to place hold.', type: 'error' });
        if (res.status === 401) {
          setBookMessage(bookId, { text: 'Unauthorized. Please log in again.', type: 'error' });
          setTimeout(() => window.location.href = '/login', 1500);
        }
      }
    } catch (err) {
      setBookMessage(bookId, { text: 'Error placing hold. Please try again.', type: 'error' });
    } finally {
      setHolding(null);
    }
  };

  return (
    <div className="search-page-container">
      <div className="search-module-section">
        <h1 className="module-section-heading">Search Library Items</h1>

        {message && <InlineMessage text={message.text} type={message.type} onClose={clearMessage} />}

        <div className="search-input-group">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, author, ISBN, subject..."
            className="form-input"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} className="btn-primary" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {loading && <p className="search-message">Searching...</p>}
        {!loading && results.length === 0 && query.trim() !== '' && (
          <p className="search-message">No results found for "{query}".</p>
        )}
        {!loading && results.length === 0 && query.trim() === '' && (
          <p className="search-message">Start typing to search for library items.</p>
        )}

        {!loading && results.length > 0 && (
          <ul className="search-results-list">
            {results.map((book) => (
              <li key={book._id} className="search-result-item">
                <h3 className="search-result-title">{book.title}</h3>
                <p className="search-result-meta">
                  Author: {book.author || 'N/A'} | ISBN: {book.isbn || 'N/A'} | Subject: {book.subject || 'N/A'}
                </p>
                <p className="search-result-keywords">
                  Keywords: {book.keywords?.join(', ') || 'N/A'}
                </p>
                <p className="search-result-location">Location: {book.location || 'N/A'}</p>
                <p className={`search-result-availability ${book.isAvailable ? 'available' : 'checked-out'}`}>
                  {book.isAvailable ? 'Available' : 'Checked Out'}
                </p>

                {book.isAvailable ? (
                  <button
                    onClick={() => handleBorrow(book._id)}
                    disabled={borrowing === book._id}
                    className="borrow-button"
                  >
                    {borrowing === book._id ? 'Borrowing...' : 'Borrow'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleHold(book._id)}
                    disabled={holding === book._id}
                    className="hold-button"
                  >
                    {holding === book._id ? 'Placing Hold...' : 'Place Hold'}
                  </button>
                )}

                {bookMessages[book._id] && (
                  <div
                    className={`book-card-message ${
                      bookMessages[book._id]?.type === 'success'
                        ? 'book-card-message-success'
                        : bookMessages[book._id]?.type === 'error'
                        ? 'book-card-message-error'
                        : 'book-card-message-info'
                    }`}
                  >
                    {bookMessages[book._id]?.text}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
