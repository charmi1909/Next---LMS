'use client';

import { useState } from 'react';

type Props = {
  onClose: () => void;
};

export function RegisterPatronModal({ onClose }: Props) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/patrons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register patron');

      setMessage('Patron registered successfully!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setMessage(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2 className="modal-title">Register New Patron</h2>

        <form onSubmit={handleSubmit} className="modal-form">
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={formData.name}
            onChange={handleChange}
            required
          />

          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <input
            type="text"
            name="phone"
            placeholder="Phone Number"
            value={formData.phone}
            onChange={handleChange}
          />

          <input
            type="text"
            name="address"
            placeholder="Address"
            value={formData.address}
            onChange={handleChange}
          />

          <input
            type="password"
            name="password"
            placeholder="Temporary Password"
            value={formData.password}
            onChange={handleChange}
            required
          />

          {message && <p className="modal-message">{message}</p>}

          <div className="modal-actions">
            <button type="submit" disabled={loading}>
              {loading ? 'Registering...' : 'Register Patron'}
            </button>
            <button type="button" onClick={onClose} disabled={loading}>
              Cancel
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          width: 100%;
          max-width: 500px;
        }

        .modal-title {
          font-size: 1.5rem;
          margin-bottom: 1rem;
        }

        .modal-form input {
          display: block;
          width: 100%;
          margin-bottom: 0.75rem;
          padding: 0.5rem;
          border-radius: 8px;
          border: 1px solid #ccc;
        }

        .modal-actions {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
        }

        .modal-message {
          margin-top: 0.5rem;
          color: green;
        }
      `}</style>
    </div>
  );
}
