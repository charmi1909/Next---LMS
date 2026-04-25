'use client'; // This directive is necessary for client-side interactivity in Next.js App Router

import React, { useState } from 'react';

// Define types for better organization and type safety
type MessageType = 'success' | 'error' | '';

interface BookItem {
    id: string;
    title: string;
    isbn: string;
    issueDate: string;
    dueDate?: string; // Optional for history
    returnDate?: string; // Optional for history
}

interface Patron {
    _id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    role: 'patron';
    currentBorrowed: any[]; // Changed to any[] to match API response structure for embedded book data
    borrowingHistory: any[]; // Changed to any[]
}

export default function PatronManagementPage() {
    // --- State for Register Patron ---
    const [registerName, setRegisterName] = useState('');
    const [registerEmail, setRegisterEmail] = useState('');
    const [registerPassword, setRegisterPassword] = useState('');
    const [registerPhone, setRegisterPhone] = useState('');
    const [registerAddress, setRegisterAddress] = useState('');
    const [registerMessage, setRegisterMessage] = useState<{ text: string; type: MessageType }>({ text: '', type: '' });

    // --- State for Update Patron ---
    const [updateSearchId, setUpdateSearchId] = useState('');
    const [updatePatron, setUpdatePatron] = useState<Patron | null>(null);
    const [updateMessage, setUpdateMessage] = useState<{ text: string; type: MessageType }>({ text: '', type: '' });

    // --- State for View Patron ---
    const [viewSearchId, setViewSearchId] = useState('');
    const [viewPatron, setViewPatron] = useState<Patron | null>(null);
    const [viewMessage, setViewMessage] = useState<{ text: string; type: MessageType }>({ text: '', type: '' });

    // --- Helper function to display messages ---
    const showAndHideMessage = (setMessage: React.Dispatch<React.SetStateAction<{ text: string; type: MessageType }>>, text: string, type: MessageType) => {
        setMessage({ text, type });
        setTimeout(() => {
            setMessage({ text: '', type: '' });
        }, 3000); // Hide after 3 seconds
    };

    // --- Event Handlers ---
    const handleRegisterSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // basic front‑end validation
  if (!registerName || !registerEmail || !registerPhone || !registerAddress || !registerPassword) {
    showAndHideMessage(setRegisterMessage, 'Please fill in all fields.', 'error');
    return;
  }

  try {
    const response = await fetch('/api/patrons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: registerName,
        email: registerEmail,
        phone: registerPhone,
        address: registerAddress,
        password: registerPassword,          
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || 'Failed to register patron.');
    }

    showAndHideMessage(
      setRegisterMessage,
      `Patron ${data.name} registered successfully! Patron ID: ${data._id}`,
      'success'
    );

    // clear form
    setRegisterName('');
    setRegisterEmail('');
    setRegisterPhone('');
    setRegisterAddress('');
    setRegisterPassword('');                 // ← clear password field
  } catch (error: any) {
    showAndHideMessage(setRegisterMessage, error.message, 'error');
  }
};


    const handleUpdateSearch = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!updateSearchId.trim()) {
            showAndHideMessage(setUpdateMessage, 'Please enter a Patron ID.', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/patrons/${updateSearchId}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error fetching patron');
            }

            setUpdatePatron({
                _id: data._id,
                name: data.name,
                email: data.email,
                phone: data.phone,
                address: data.address,
                role: data.role,
                currentBorrowed: data.currentBorrowed ?? [],
                borrowingHistory: data.borrowingHistory ?? [],
            });

            showAndHideMessage(setUpdateMessage, `Patron ${data.name} found.`, 'success');
            setUpdateSearchId('');
        } catch (error: any) {
            setUpdatePatron(null);
            showAndHideMessage(setUpdateMessage, error.message, 'error');
        }
    };

    const handleUpdateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!updatePatron || !updatePatron._id) {
            showAndHideMessage(setUpdateMessage, 'No patron selected for update.', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/patrons/${updatePatron._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePatron),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update patron.');
            }

            showAndHideMessage(
                setUpdateMessage,
                `Patron ${data.name} (ID: ${data._id}) updated successfully!`,
                'success'
            );

            setUpdatePatron(null);
            setUpdateSearchId('');
        } catch (error: any) {
            showAndHideMessage(setUpdateMessage, error.message, 'error');
        }
    };

    const handleViewSearch = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!viewSearchId.trim()) {
            showAndHideMessage(setViewMessage, 'Please enter a Patron ID.', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/patrons/${viewSearchId}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error fetching patron');
            }

            setViewPatron({
                _id: data._id,
                name: data.name,
                email: data.email,
                phone: data.phone,
                address: data.address,
                role: data.role,
                currentBorrowed: data.currentBorrowed ?? [],
                borrowingHistory: data.borrowingHistory ?? [],
            });

            showAndHideMessage(setViewMessage, `Details for Patron ${data.name} loaded.`, 'success');
        } catch (error: any) {
            setViewPatron(null);
            showAndHideMessage(setViewMessage, error.message, 'error');
        }
    };

    return (
        // Replaced outer div with a general class to integrate with main layout
        <div className="patron-page-container">
            {/* Main Content Grid */}
            <div className="patron-grid-container">

                {/* 1. Register New Patrons Section */}
                <div className="patron-card">
  <h2 className="patron-section-title">Register New Patron</h2>
  <form onSubmit={handleRegisterSubmit}>
    <div className="patron-input-group">
      <label htmlFor="registerName" className="patron-label">Name:</label>
      <input
        type="text"
        id="registerName"
        value={registerName}
        onChange={(e) => setRegisterName(e.target.value)}
        placeholder="John Doe"
        className="patron-input"
        required
      />
    </div>

    <div className="patron-input-group">
      <label htmlFor="registerEmail" className="patron-label">Email:</label>
      <input
        type="email"
        id="registerEmail"
        value={registerEmail}
        onChange={(e) => setRegisterEmail(e.target.value)}
        placeholder="john.doe@example.com"
        className="patron-input"
        required
      />
    </div>

    <div className="patron-input-group">
      <label htmlFor="registerPhone" className="patron-label">Phone:</label>
      <input
        type="tel"
        id="registerPhone"
        value={registerPhone}
        onChange={(e) => setRegisterPhone(e.target.value)}
        placeholder="123-456-7890"
        className="patron-input"
        required
      />
    </div>

    <div className="patron-input-group">
      <label htmlFor="registerAddress" className="patron-label">Address:</label>
      <input
        type="text"
        id="registerAddress"
        value={registerAddress}
        onChange={(e) => setRegisterAddress(e.target.value)}
        placeholder="123 Library Lane, Booktown"
        className="patron-input"
        required
      />
    </div>

    <div className="patron-input-group">
      <label htmlFor="registerPassword" className="patron-label">Password:</label>
      <input
        type="password"
        id="registerPassword"
        value={registerPassword}
        onChange={(e) => setRegisterPassword(e.target.value)}
        placeholder="Enter a secure password"
        className="patron-input"
        required
      />
    </div>

    <button type="submit" className="patron-submit-button">
      Register Patron
    </button>

    {registerMessage.text && (
      <div className={`patron-message ${registerMessage.type}`}>
        {registerMessage.text}
      </div>
    )}
  </form>
</div>


                {/* 2. Update Patron Information Section */}
                <div className="patron-card">
                    <h2 className="patron-section-title">Update Patron Information</h2>
                    <form onSubmit={handleUpdateSearch} className="mb-4">
                        <div className="patron-input-group">
                            <label htmlFor="updateSearchId" className="patron-label">Patron ID:</label>
                            <input
                                type="text"
                                id="updateSearchId"
                                value={updateSearchId}
                                onChange={(e) => setUpdateSearchId(e.target.value)}
                                placeholder="e.g., P001"
                                className="patron-input"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="patron-submit-button update"
                        >
                            Find Patron
                        </button>
                        {updateMessage.text && (
                            <div className={`patron-message ${updateMessage.type}`}>
                                {updateMessage.text}
                            </div>
                        )}
                    </form>

                    {updatePatron && (
                        <form onSubmit={handleUpdateSubmit} className="patron-details-section">
                            <p className="patron-detail-item"><strong>Editing Patron:</strong> {updatePatron.name} (ID: {updatePatron._id})</p>
                            <div className="patron-input-group">
                                <label htmlFor="updateName" className="patron-label">Name:</label>
                                <input
                                    type="text"
                                    id="updateName"
                                    value={updatePatron.name}
                                    onChange={(e) => setUpdatePatron({ ...updatePatron, name: e.target.value })}
                                    className="patron-input"
                                    required
                                />
                            </div>
                            <div className="patron-input-group">
                                <label htmlFor="updateEmail" className="patron-label">Email:</label>
                                <input
                                    type="email"
                                    id="updateEmail"
                                    value={updatePatron.email}
                                    onChange={(e) => setUpdatePatron({ ...updatePatron, email: e.target.value })}
                                    className="patron-input"
                                    required
                                />
                            </div>
                            <div className="patron-input-group">
                                <label htmlFor="updatePhone" className="patron-label">Phone:</label>
                                <input
                                    type="tel"
                                    id="updatePhone"
                                    value={updatePatron.phone}
                                    onChange={(e) => setUpdatePatron({ ...updatePatron, phone: e.target.value })}
                                    className="patron-input"
                                    required
                                />
                            </div>
                            <div className="patron-input-group">
                                <label htmlFor="updateAddress" className="patron-label">Address:</label>
                                <input
                                    type="text"
                                    id="updateAddress"
                                    value={updatePatron.address}
                                    onChange={(e) => setUpdatePatron({ ...updatePatron, address: e.target.value })}
                                    className="patron-input"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="patron-submit-button update"
                            >
                                Update Patron
                            </button>
                        </form>
                    )}
                </div> 

                {/* 3. View Patron Borrowing History and Current Items */}
                <div className="patron-card view-details"> {/* Added view-details class for specific sizing */}
                    <h2 className="patron-section-title">View Patron Details</h2>
                    <form onSubmit={handleViewSearch} className="mb-4">
                        <div className="patron-input-group">
                            <label htmlFor="viewSearchId" className="patron-label">Patron ID:</label>
                            <input
                                type="text"
                                id="viewSearchId"
                                value={viewSearchId}
                                onChange={(e) => setViewSearchId(e.target.value)}
                                placeholder="e.g., P001"
                                className="patron-input"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="patron-submit-button view"
                        >
                            View Details
                        </button>
                        {viewMessage.text && (
                            <div className={`patron-message ${viewMessage.type}`}>
                                {viewMessage.text}
                            </div>
                        )}
                    </form>

                    {viewPatron && (
                        <div className="patron-details-section">
                            <h3 className="patron-section-title">Patron Information</h3>
                            <p className="patron-detail-item"><strong>ID:</strong> {viewPatron._id}</p>
                            <p className="patron-detail-item"><strong>Name:</strong> {viewPatron.name}</p>
                            <p className="patron-detail-item"><strong>Email:</strong> {viewPatron.email}</p>
                            <p className="patron-detail-item"><strong>Phone:</strong> {viewPatron.phone}</p>
                            <p className="patron-detail-item"><strong>Address:</strong> {viewPatron.address}</p>

                            <h3 className="patron-section-title mt-8">Current Borrowed Items</h3>
                            {viewPatron.currentBorrowed.length > 0 ? (
                                <div className="patron-table-container">
                                    <table className="patron-table">
                                        <thead>
                                            <tr className="patron-table-header-row">
                                                <th className="patron-table-th">Title</th>
                                                <th className="patron-table-th">ISBN</th>
                                                <th className="patron-table-th">Issue Date</th>
                                                <th className="patron-table-th">Due Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {viewPatron.currentBorrowed.map((item: any) => (
                                                <tr key={item._id} className="patron-table-tr">
                                                    <td className="patron-table-td title">{item.bookId?.title || 'N/A'}</td>
                                                    <td className="patron-table-td isbn">{item.bookId?.isbn || 'N/A'}</td>
                                                    <td className="patron-table-td date">
                                                        {new Date(item.borrowedAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="patron-table-td date due-date">
                                                        {new Date(item.dueDate).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="patron-no-items-message">No items currently borrowed.</p>
                            )}

                            {/* <h3 className="patron-section-title mt-8">Borrowing History</h3>
                            {viewPatron.borrowingHistory.length > 0 ? (
                                <div className="patron-table-container">
                                    <table className="patron-table">
                                        <thead>
                                            <tr className="patron-table-header-row">
                                                <th className="patron-table-th">Title</th>
                                                <th className="patron-table-th">ISBN</th>
                                                <th className="patron-table-th">Issue Date</th>
                                                <th className="patron-table-th">Return Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {viewPatron.borrowingHistory.map((item: any) => (
                                                <tr key={item._id} className="patron-table-tr">
                                                    <td className="patron-table-td title">{item.bookId?.title || 'N/A'}</td>
                                                    <td className="patron-table-td isbn">{item.bookId?.isbn || 'N/A'}</td>
                                                    <td className="patron-table-td date">
                                                        {new Date(item.borrowedAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="patron-table-td date">
                                                        {item.returnedAt ? new Date(item.returnedAt).toLocaleDateString() : 'Not Returned'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="patron-no-items-message"></p>
                            )} */}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}