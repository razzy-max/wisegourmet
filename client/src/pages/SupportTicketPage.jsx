import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supportApi } from '../api/supportApi';
import { filesToAttachments } from '../utils/attachments';
import { useSupportTicketRealtime } from '../hooks/useSupportTicketRealtime';
import LoadingSpinner from '../components/LoadingSpinner';

const initialComposer = {
  text: '',
  attachments: [],
};

export default function SupportTicketPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [composer, setComposer] = useState(initialComposer);
  const [viewerImage, setViewerImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [ratingBusy, setRatingBusy] = useState(false);
  const [error, setError] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [ratingForm, setRatingForm] = useState({ rating: 5, comment: '' });

  const load = useCallback(async () => {
    try {
      const response = await supportApi.getTicket(id);
      setTicket(response.ticket);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useSupportTicketRealtime(load, { ticketId: id });

  const messages = useMemo(() => ticket?.messages || [], [ticket]);

  const handleFiles = async (event) => {
    const attachments = await filesToAttachments(event.target.files || []);
    setComposer((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...attachments],
    }));
    event.target.value = '';
  };

  const removeAttachment = (index) => {
    setComposer((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, attachmentIndex) => attachmentIndex !== index),
    }));
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    setSending(true);
    setFeedbackMessage('');
    setError('');

    try {
      await supportApi.addMessage(id, composer);
      setComposer(initialComposer);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <section className="page-wrap">
        <LoadingSpinner label="Loading ticket..." />
      </section>
    );
  }

  if (error && !ticket) {
    return (
      <section className="page-wrap">
        <Link to="/support" className="btn btn-ghost">
          Back to tickets
        </Link>
        <p className="error">{error}</p>
      </section>
    );
  }

  if (!ticket) {
    return null;
  }

  const canModerate = user?.role === 'support' || user?.role === 'admin';
  const canRate = user?.role === 'customer' && ticket.status === 'resolved' && !ticket.csatRating;
  const canReply = !(user?.role === 'customer' && ticket.status === 'resolved');

  const getSenderLabel = (message) => {
    const senderName = message.sender?.fullName || '';

    if (user?.role === 'admin' && message.senderRole === 'support') {
      return senderName || 'Support';
    }

    if (user?.role === 'admin' && message.senderRole === 'admin') {
      return senderName ? `Admin (${senderName})` : 'Admin';
    }

    if (message.senderRole === 'admin') {
      return 'Admin';
    }

    if (message.senderRole === 'support') {
      return 'Support';
    }

    return user?.role === 'customer' ? 'You' : senderName || 'Customer';
  };

  const setStatus = async (status) => {
    setStatusBusy(true);
    setError('');
    setFeedbackMessage('');
    try {
      await supportApi.updateTicket(id, { status });
      setFeedbackMessage(`Ticket status set to ${status}`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setStatusBusy(false);
    }
  };

  const submitRating = async (event) => {
    event.preventDefault();
    setRatingBusy(true);
    setError('');
    setFeedbackMessage('');
    try {
      await supportApi.rateTicket(id, {
        rating: Number(ratingForm.rating),
        comment: ratingForm.comment,
      });
      setFeedbackMessage('Thanks for rating your support experience.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setRatingBusy(false);
    }
  };

  return (
    <section className="page-wrap">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>{ticket.subject}</h1>
          <p className="muted">Ticket conversation room</p>
        </div>
        <Link to={user?.role === 'customer' ? '/support' : '/admin/support'} className="btn btn-ghost">
          Back to list
        </Link>
      </div>

      <div className="grid ticket-layout">
        <article className="panel ticket-thread">
          <div className="ticket-meta">
            <p><strong>Status:</strong> {ticket.status}</p>
            <p>
              <strong>Order:</strong>{' '}
              {ticket.order?._id ? (
                user?.role === 'customer' ? (
                  <Link to={`/orders/${ticket.order._id}`}>View linked order</Link>
                ) : (
                  `Linked order #${ticket.order._id}`
                )
              ) : (
                'No linked order'
              )}
            </p>
            <p><strong>Created by:</strong> {ticket.customer?.fullName || 'Unknown'}</p>
            <p>
              <strong>CSAT:</strong>{' '}
              {ticket.csatRating ? `${ticket.csatRating}/5${ticket.csatComment ? ` - ${ticket.csatComment}` : ''}` : 'Not rated yet'}
            </p>
            {canModerate ? (
              <div className="row">
                <button
                  className="btn"
                  type="button"
                  disabled={statusBusy || ticket.status === 'in_progress'}
                  onClick={() => setStatus('in_progress')}
                >
                  Mark In Progress
                </button>
                <button
                  className="btn"
                  type="button"
                  disabled={statusBusy || ticket.status === 'resolved'}
                  onClick={() => setStatus('resolved')}
                >
                  Set As Resolved
                </button>
              </div>
            ) : null}
          </div>

          <div className="ticket-messages">
            {messages.map((message, index) => {
              const isOwnMessage = String(message.sender?._id || message.sender || '') === String(user?.id || '') || (user?.role === 'customer' && message.senderRole === 'customer');
              return (
                <div key={`${message.createdAt || index}-${index}`} className={`ticket-message ${isOwnMessage ? 'ticket-message-own' : 'ticket-message-other'}`}>
                  <div className="ticket-message-header">
                    <strong>{getSenderLabel(message)}</strong>
                    <span>{message.createdAt ? new Date(message.createdAt).toLocaleString() : ''}</span>
                  </div>
                  {message.text ? <p>{message.text}</p> : null}
                  {message.attachments?.length ? (
                    <div className="ticket-attachments">
                      {message.attachments.map((attachment, attachmentIndex) => (
                        attachment.fileType?.startsWith('image/') ? (
                          <button
                            key={`${attachment.fileName}-${attachmentIndex}`}
                            type="button"
                            className="ticket-attachment ticket-attachment-btn"
                            onClick={() => setViewerImage(attachment)}
                          >
                            <img src={attachment.dataUrl} alt={attachment.fileName} />
                          </button>
                        ) : (
                          <a
                            key={`${attachment.fileName}-${attachmentIndex}`}
                            href={attachment.dataUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="ticket-attachment"
                          >
                            <span>{attachment.fileName}</span>
                          </a>
                        )
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </article>

        <aside className="panel ticket-composer">
          <h3>Reply</h3>
          {canReply ? (
            <form className="form" onSubmit={sendMessage}>
              <textarea
                placeholder="Type your message"
                value={composer.text}
                onChange={(event) => setComposer((prev) => ({ ...prev, text: event.target.value }))}
              />
              <label className="upload-zone" htmlFor="ticket-reply-attachments">
                <p className="upload-icon" aria-hidden="true">☁</p>
                <p>Drag files here or click to upload.</p>
              </label>
              <input
                id="ticket-reply-attachments"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFiles}
                className="hidden-file-input"
              />
              {composer.attachments.length ? (
                <div className="ticket-upload-list">
                  {composer.attachments.map((attachment, index) => (
                    <div className="ticket-upload-item" key={`${attachment.fileName}-${index}`}>
                      <span>{attachment.fileName}</span>
                      <button type="button" className="btn btn-ghost" onClick={() => removeAttachment(index)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <button className="btn" type="submit" disabled={sending}>
                {sending ? 'Sending...' : 'Send reply'}
              </button>
            </form>
          ) : (
            <p className="muted">This ticket is resolved. Customer replies are disabled.</p>
          )}
          {canRate ? (
            <form className="form" onSubmit={submitRating} style={{ marginTop: '1rem' }}>
              <h4>Rate your support (CSAT)</h4>
              <select
                value={ratingForm.rating}
                onChange={(event) =>
                  setRatingForm((prev) => ({ ...prev, rating: Number(event.target.value) }))
                }
              >
                <option value={5}>5 - Excellent</option>
                <option value={4}>4 - Good</option>
                <option value={3}>3 - Okay</option>
                <option value={2}>2 - Poor</option>
                <option value={1}>1 - Very poor</option>
              </select>
              <textarea
                placeholder="Optional feedback"
                value={ratingForm.comment}
                onChange={(event) =>
                  setRatingForm((prev) => ({ ...prev, comment: event.target.value }))
                }
              />
              <button className="btn" type="submit" disabled={ratingBusy}>
                {ratingBusy ? 'Submitting rating...' : 'Submit rating'}
              </button>
            </form>
          ) : null}
          {feedbackMessage ? <p className="message">{feedbackMessage}</p> : null}
          {error ? <p className="error">{error}</p> : null}
        </aside>
      </div>

      {viewerImage ? (
        <div className="lightbox" role="dialog" aria-modal="true" onClick={() => setViewerImage(null)}>
          <div className="lightbox-content" onClick={(event) => event.stopPropagation()}>
            <img src={viewerImage.dataUrl} alt={viewerImage.fileName} />
            <p>{viewerImage.fileName}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}