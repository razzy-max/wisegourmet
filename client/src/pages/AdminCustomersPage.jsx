import { useMemo, useState, useEffect, useCallback } from 'react';
import { userApi } from '../api/userApi';
import LoadingSpinner from '../components/LoadingSpinner';

const PRESETS = [
  { label: '24 hours', value: 24, unit: 'hours' },
  { label: '3 days', value: 3, unit: 'days' },
  { label: '1 week', value: 7, unit: 'days' },
];

const formatInactiveFor = (hours) => {
  if (hours === Infinity) {
    return 'Never ordered';
  }
  if (hours < 48) {
    return `${Math.floor(hours)} hour${Math.floor(hours) === 1 ? '' : 's'}`;
  }
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [thresholdValue, setThresholdValue] = useState(7);
  const [thresholdUnit, setThresholdUnit] = useState('days');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await userApi.listCustomers();
      setCustomers(response.customers || []);
      setNow(Date.now());
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const rows = useMemo(() => {
    return customers
      .map((customer) => {
        const hoursInactive = customer.lastOrderAt
          ? (now - new Date(customer.lastOrderAt).getTime()) / (1000 * 60 * 60)
          : Infinity;
        return { ...customer, hoursInactive };
      })
      .sort((a, b) => b.hoursInactive - a.hoursInactive);
  }, [customers, now]);

  const thresholdHours = thresholdUnit === 'days' ? Number(thresholdValue) * 24 : Number(thresholdValue);

  const toggleSelected = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectMatchingThreshold = () => {
    const matching = rows.filter((row) => row.hoursInactive >= thresholdHours).map((row) => row._id);
    setSelectedIds(new Set(matching));
  };

  const selectAll = () => {
    setSelectedIds(new Set(rows.map((row) => row._id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const sendMessage = async () => {
    if (selectedIds.size === 0 || !body.trim()) {
      return;
    }

    setSending(true);
    setSendResult('');
    try {
      const response = await userApi.sendReEngagementMessage({
        userIds: Array.from(selectedIds),
        title: title.trim(),
        body: body.trim(),
      });
      setSendResult(
        `Sent to ${response.sent} of ${response.total} selected customer${response.total === 1 ? '' : 's'}` +
          (response.noSubscription > 0
            ? ` (${response.noSubscription} have notifications disabled).`
            : '.')
      );
      setTitle('');
      setBody('');
      clearSelection();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="page-wrap">
      <h1>Customers</h1>
      <p className="muted">View customer accounts and send a re-engagement message to customers who've gone quiet.</p>

      {error ? <p className="error">{error}</p> : null}
      {loading ? <LoadingSpinner label="Loading customers..." /> : null}

      <article className="panel">
        <h3>Find inactive customers</h3>
        <div className="row">
          <input
            type="number"
            min="1"
            className="qty-input"
            value={thresholdValue}
            onChange={(event) => setThresholdValue(event.target.value)}
          />
          <select value={thresholdUnit} onChange={(event) => setThresholdUnit(event.target.value)}>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
          </select>
          <button className="btn" type="button" onClick={selectMatchingThreshold}>
            Select customers inactive ≥ threshold
          </button>
        </div>
        <div className="row" style={{ marginTop: '0.5rem' }}>
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              className="btn btn-ghost"
              type="button"
              onClick={() => {
                setThresholdValue(preset.value);
                setThresholdUnit(preset.unit);
              }}
            >
              {preset.label}
            </button>
          ))}
          <button className="btn btn-ghost" type="button" onClick={selectAll}>
            Select all
          </button>
          <button className="btn btn-ghost" type="button" onClick={clearSelection}>
            Clear selection
          </button>
        </div>
      </article>

      <article className="panel" style={{ marginTop: '1rem' }}>
        <h3>Customer Accounts ({rows.length})</h3>
        <div className="stats-table-wrap">
          <table className="stats-table">
            <thead>
              <tr>
                <th></th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Orders</th>
                <th>Last Order</th>
                <th>Inactive For</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row._id)}
                      onChange={() => toggleSelected(row._id)}
                    />
                  </td>
                  <td>{row.fullName}</td>
                  <td>{row.email}</td>
                  <td>{row.phone}</td>
                  <td>{row.orderCount}</td>
                  <td>{row.lastOrderAt ? new Date(row.lastOrderAt).toLocaleDateString() : 'Never ordered'}</td>
                  <td>{formatInactiveFor(row.hoursInactive)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="panel" style={{ marginTop: '1rem' }}>
        <h3>Send Message ({selectedIds.size} selected)</h3>
        <div className="form">
          <input
            placeholder="Title (optional, defaults to 'Wise Gourmet')"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <textarea
            placeholder="Message"
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          <button
            className="btn"
            type="button"
            onClick={sendMessage}
            disabled={sending || selectedIds.size === 0 || !body.trim()}
          >
            {sending ? 'Sending...' : `Send to ${selectedIds.size} selected`}
          </button>
        </div>
        {sendResult ? <p className="message">{sendResult}</p> : null}
      </article>
    </section>
  );
}
