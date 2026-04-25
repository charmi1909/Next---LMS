'use client';

import React, { useState } from 'react';

type MessageType = 'success' | 'error' | '';

export default function CirculationPage() {
    const [issuePatronId, setIssuePatronId] = useState('');
const [issueBookId, setIssueBookId] = useState('');

    const [issueMessage, setIssueMessage] = useState<{ text: string; type: MessageType }>({ text: '', type: '' });
    const [renewBookId, setRenewBookId] = useState('');
    const [returnBookIsbn, setReturnBookIsbn] = useState('');
    const [returnPatronId, setReturnPatronId] = useState('');
    const [returnMessage, setReturnMessage] = useState<{ text: string; type: MessageType }>({ text: '', type: '' });
    const [renewPatronId, setRenewPatronId] = useState('');
    const [renewMessage, setRenewMessage] = useState<{ text: string; type: MessageType }>({ text: '', type: '' });
    const [finePatronId, setFinePatronId] = useState('');
    const [overdueCount, setOverdueCount] = useState(0);
    const [totalFine, setTotalFine] = useState(0.00);
    const [showFineDetails, setShowFineDetails] = useState(false);
    const [fineMessage, setFineMessage] = useState<{ text: string; type: MessageType }>({ text: '', type: '' });

    const showAndHideMessage = (
        setMessage: React.Dispatch<React.SetStateAction<{ text: string; type: MessageType }>>,
        text: string,
        type: MessageType
    ) => {
        setMessage({ text, type });
        setTimeout(() => {
            setMessage({ text: '', type: '' });
        }, 3000);
    };

    const handleIssueSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (issuePatronId && issueBookId) {
    try {
      const res = await fetch('/api/circulation/issue', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patronId: issuePatronId,
          bookId: issueBookId, // ✅ using bookId now
        }),
      });

      let data;
      try {
        data = await res.json();
      } catch (err) {
        console.error('JSON parse error:', err);
        showAndHideMessage(setIssueMessage, 'Invalid server response.', 'error');
        return;
      }

      console.log('Issue response:', data);

      if (res.ok) {
        showAndHideMessage(setIssueMessage, data.message || 'Book issued successfully!', 'success');
        setIssuePatronId('');
        setIssueBookId('');
      } else {
        showAndHideMessage(setIssueMessage, data.error || 'Failed to issue book.', 'error');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      showAndHideMessage(setIssueMessage, 'Server error while issuing book.', 'error');
    }
  } else {
    showAndHideMessage(setIssueMessage, 'Please fill in all fields.', 'error');
  }
};


    const handleReturnSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!returnBookIsbn) {
            showAndHideMessage(setReturnMessage, 'Please provide a book ISBN/ID.', 'error');
            return;
        }

        try {
            const res = await fetch('/api/circulation/return', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patronId: returnPatronId || undefined,
                    bookId: returnBookIsbn // Assuming this is book ID or ISBN
                }),
            });

            const data = await res.json();

            if (res.ok) {
                showAndHideMessage(setReturnMessage, data.message || 'Book returned!', 'success');
                setReturnPatronId('');
                setReturnBookIsbn('');
            } else {
                showAndHideMessage(setReturnMessage, data.error || 'Return failed.', 'error');
            }
        } catch (err) {
            console.error('Return error:', err);
            showAndHideMessage(setReturnMessage, 'Server error while returning book.', 'error');
        }
    };

    const handleRenewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (renewPatronId && renewBookId) {
            try {
                const res = await fetch('/api/circulation/renew', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        patronId: renewPatronId,
                        bookId: renewBookId, // Assuming this is book ID or ISBN
                    }),
                });

                const data = await res.json();
                if (res.ok) {
                    showAndHideMessage(setRenewMessage, data.message || 'Book renewed successfully!', 'success');
                    setRenewPatronId('');
                    setRenewBookId('');
                } else {
                    showAndHideMessage(setRenewMessage, data.error || 'Failed to renew book.', 'error');
                }
            } catch (error) {
                console.error('Renew error:', error);
                showAndHideMessage(setRenewMessage, 'Server error while renewing book.', 'error');
            }
        } else {
            showAndHideMessage(setRenewMessage, 'Please fill in all fields.', 'error');
        }
    };

    const handleCalculateFines = async (e: React.FormEvent) => {
  e.preventDefault();
  if (finePatronId) {
    try {
      const res = await fetch(`/api/circulation/fines?patronId=${finePatronId}`);
      const data = await res.json();
      if (res.ok) {
        setOverdueCount(data.overdueCount || 0);
        setTotalFine(data.totalFine || 0);
        setShowFineDetails(true);
        showAndHideMessage(setFineMessage, data.message || 'Fines calculated.', 'success');
      } else {
        showAndHideMessage(setFineMessage, data.message || 'Error calculating fines.', 'error');
        setShowFineDetails(false);
      }
    } catch (error) {
      showAndHideMessage(setFineMessage, 'Server error while calculating fines.', 'error');
      setShowFineDetails(false);
    }
  } else {
    showAndHideMessage(setFineMessage, 'Please enter Patron ID.', 'error');
    setShowFineDetails(false);
  }
};

const handleCollectFine = async () => {
  if (totalFine > 0) {
    try {
      const res = await fetch('/api/circulation/fines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patronId: finePatronId, amount: totalFine }), // ✅ send both
      });
      const data = await res.json();
      if (res.ok) {
        showAndHideMessage(setFineMessage, data.message || `₹${totalFine.toFixed(2)} collected.`, 'success');
        setFinePatronId('');
        setOverdueCount(0);
        setTotalFine(0.00);
        setShowFineDetails(false);
      } else {
        showAndHideMessage(setFineMessage, data.message || 'Error collecting fine.', 'error');
      }
    } catch (error) {
      showAndHideMessage(setFineMessage, 'Server error while collecting fine.', 'error');
    }
  } else {
    showAndHideMessage(setFineMessage, 'No fine to collect.', 'error');
  }
};

    return (
        // Replaced outer div with a general class to integrate with main layout
        <div className="circulation-page-container">
            {/* Main Content Grid */}
            <div className="circulation-grid-container">
               {/* 1. Issue/Borrow Books Section */}
<div className="circulation-card">
  <h2 className="circulation-section-title">Issue/Borrow Books</h2>
  <form onSubmit={handleIssueSubmit}>
    <div className="circulation-input-group">
      <label htmlFor="issuePatronId" className="circulation-label">Patron ID:</label>
      <input
        type="text"
        id="issuePatronId"
        value={issuePatronId}
        onChange={(e) => setIssuePatronId(e.target.value)}
        placeholder="e.g., 64f12abc..."
        className="circulation-input"
        required
      />
    </div>

    <div className="circulation-input-group">
      <label htmlFor="issueBookId" className="circulation-label">Book ID:</label> {/* Fixed ID here */}
      <input
        type="text"
        id="issueBookId" // <-- was issueBookIsbn, now corrected
        value={issueBookId}
        onChange={(e) => setIssueBookId(e.target.value)}
        placeholder="e.g., 64fa123..."
        className="circulation-input"
        required
      />
    </div>

    <button type="submit" className="circulation-submit-button">
      Issue Book
    </button>

    {issueMessage.text && (
      <div className={`circulation-message ${issueMessage.type}`}>
        {issueMessage.text}
      </div>
    )}
  </form>
</div>


                {/* 2. Accept Returned Books Section */}
                <div className="circulation-card">
                    <h2 className="circulation-section-title">Accept Returned Books</h2>
                    <form onSubmit={handleReturnSubmit}>
                        <div className="circulation-input-group">
                            <label htmlFor="returnBookIsbn" className="circulation-label">Book ID:</label>
                            <input
                                type="text"
                                id="returnBookIsbn"
                                value={returnBookIsbn}
                                onChange={(e) => setReturnBookIsbn(e.target.value)}
                                placeholder="e.g., 978-0321765723"
                                className="circulation-input"
                                required
                            />
                        </div>
                        <div className="circulation-input-group">
                            <label htmlFor="returnPatronId" className="circulation-label">Patron ID :</label>
                            <input
                                type="text"
                                id="returnPatronId"
                                value={returnPatronId}
                                onChange={(e) => setReturnPatronId(e.target.value)}
                                placeholder="e.g., P001"
                                className="circulation-input"
                            />
                        </div>
                        <button
                            type="submit"
                            className="circulation-submit-button return"
                        >
                            Accept Return
                        </button>
                        {returnMessage.text && (
                            <div className={`circulation-message ${returnMessage.type}`}>
                                {returnMessage.text}
                            </div>
                        )}
                    </form>
                </div>

                {/* 3. Renew Borrowed Books Section */}
                <div className="circulation-card">
                    <h2 className="circulation-section-title">Renew Borrowed Books</h2>
                    <form onSubmit={handleRenewSubmit}>
                        <div className="circulation-input-group">
                            <label htmlFor="renewPatronId" className="circulation-label">Patron ID:</label>
                            <input
                                type="text"
                                id="renewPatronId"
                                value={renewPatronId}
                                onChange={(e) => setRenewPatronId(e.target.value)}
                                placeholder="e.g., P001"
                                className="circulation-input"
                                required
                            />
                        </div>
                        <div className="circulation-input-group">
                            <label htmlFor="renewBookIsbn" className="circulation-label">Book ID:</label>
                            <input
                                type="text"
                                id="renewBookIsbn"
                                value={renewBookId}
                                onChange={(e) => setRenewBookId(e.target.value)}
                                placeholder="e.g., 978-0321765723"
                                className="circulation-input"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="circulation-submit-button renew"
                        >
                            Renew Book
                        </button>
                        {renewMessage.text && (
                            <div className={`circulation-message ${renewMessage.type}`}>
                                {renewMessage.text}
                            </div>
                        )}
                    </form>
                </div>

                {/* 4. Calculate & Collect Fines Section */}
<div className="circulation-card">
  <h2 className="circulation-section-title">Calculate & Collect Fines</h2>
  <form onSubmit={handleCalculateFines}>
    <div className="circulation-input-group">
      <label htmlFor="finePatronId" className="circulation-label">Patron ID:</label>
      <input
        type="text"
        id="finePatronId"
        value={finePatronId}
        onChange={(e) => setFinePatronId(e.target.value)}
        placeholder="e.g., P001"
        className="circulation-input"
        required
      />
    </div>
    <button type="submit" className="circulation-submit-button calculate-fines">
      Calculate Fines
    </button>
    {fineMessage.text && (
      <div className={`circulation-message ${fineMessage.type}`}>
        {fineMessage.text}
      </div>
    )}
  </form>

  {showFineDetails && (
    <div className="fine-details-box">
      <p><strong>Overdue Items:</strong> <span className="overdue-count">{overdueCount}</span></p>
      <p><strong>Total Fine:</strong> ₹ <span className="total-fine">{totalFine.toFixed(2)}</span></p>
      <button
        type="button"
        onClick={handleCollectFine}
        className="circulation-submit-button collect-fine"
      >
        Collect Fine
      </button>
    </div>
  )}
</div>
            </div>
        </div>
    );
}