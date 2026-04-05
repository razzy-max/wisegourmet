import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi } from '../api/adminApi';
import LoadingSpinner from '../components/LoadingSpinner';

const rangeOptions = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'custom', label: 'Custom range' },
];

const money = (value) => `₦${Number(value || 0).toLocaleString()}`;

function TrendChart({ data = [] }) {
  const width = 560;
  const height = 220;
  const padding = 20;

  if (!data.length) {
    return <p className="muted">No trend data yet.</p>;
  }

  const maxValue = Math.max(...data.map((point) => Number(point.revenue || 0)), 1);
  const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;

  const points = data
    .map((point, index) => {
      const x = padding + stepX * index;
      const y = height - padding - (Number(point.revenue || 0) / maxValue) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="chart-shell">
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" role="img" aria-label="Revenue trend">
        <polyline fill="none" stroke="#2d7d43" strokeWidth="3" points={points} />
      </svg>
      <div className="chart-labels">
        {data.map((point) => (
          <span key={point.date}>{point.date.slice(5)}</span>
        ))}
      </div>
    </div>
  );
}

function StatusBars({ breakdown = {} }) {
  const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, count]) => Number(count || 0)), 1);

  const getStatusBarColor = (status) => {
    if (['delivered', 'arrived', 'picked_up'].includes(status)) return '#3a6835';
    if (['confirmed', 'preparing', 'ready_for_pickup', 'on_the_way'].includes(status)) return '#e8a020';
    return '#d0d0d0';
  };

  if (!entries.length) {
    return <p className="muted">No status data in this range.</p>;
  }

  return (
    <div className="status-bars">
      {entries.map(([status, count]) => (
        <div key={status} className="status-bar-row">
          <span className="status-label">{status}</span>
          <div className="status-track">
            <div className="status-fill" style={{ width: `${(Number(count || 0) / max) * 100}%`, background: getStatusBarColor(status) }} />
          </div>
          <span className="status-count">{count}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminStatsPage() {
  const [range, setRange] = useState('7d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await adminApi.getOverviewStats({
        range,
        startDate: range === 'custom' ? startDate : undefined,
        endDate: range === 'custom' ? endDate : undefined,
      });
      setStats(response);
    } catch (err) {
      setError(err.message);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [range, startDate, endDate]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const summary = stats?.summary || {};
  const charts = stats?.charts || {};
  const support = stats?.support || {};
  const operations = stats?.operations || {};

  const growthBadges = useMemo(() => {
    const formatGrowth = (value) => {
      if (value === null || value === undefined) return 'n/a';
      const rounded = Number(value).toFixed(1);
      return `${value >= 0 ? '+' : ''}${rounded}%`;
    };

    return {
      revenue: formatGrowth(summary.revenueGrowthPct),
      orders: formatGrowth(summary.paidOrderGrowthPct),
    };
  }, [summary.revenueGrowthPct, summary.paidOrderGrowthPct]);

  return (
    <section className="page-wrap">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Admin Stats</h1>
          <p className="muted">Revenue, order flow, product performance, and support quality.</p>
        </div>
      </div>

      <article className="panel stats-filter-panel">
        <div className="stats-filters">
          <select value={range} onChange={(event) => setRange(event.target.value)}>
            {rangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {range === 'custom' ? (
            <>
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </>
          ) : null}
          <button className="btn btn-ghost stats-refresh-btn" type="button" onClick={fetchStats}>
            Refresh
          </button>
        </div>
      </article>

      {loading ? <LoadingSpinner label="Loading analytics..." /> : null}
      {error ? <p className="error">{error}</p> : null}

      {!loading && stats ? (
        <>
          <div className="stats-grid">
            <article className="panel stat-card">
              <h3>Total Revenue</h3>
              <p className="stat-number">{money(summary.revenue)}</p>
              <p className="muted">Growth: {growthBadges.revenue}</p>
            </article>
            <article className="panel stat-card">
              <h3>Paid Orders</h3>
              <p className="stat-number">{Number(summary.paidOrdersCount || 0).toLocaleString()}</p>
              <p className="muted">Growth: {growthBadges.orders}</p>
            </article>
            <article className="panel stat-card">
              <h3>Items Sold</h3>
              <p className="stat-number">{Number(summary.itemsSold || 0).toLocaleString()}</p>
              <p className="muted">AOV: {money(summary.avgOrderValue)}</p>
            </article>
            <article className="panel stat-card">
              <h3>Fulfilled</h3>
              <p className="stat-number">{Number(summary.fulfilledCount || 0).toLocaleString()}</p>
              <p className="muted">
                Delivery: {Number(summary.deliveredCount || 0).toLocaleString()} • Pickup: {Number(summary.pickedUpCount || 0).toLocaleString()}
              </p>
            </article>
          </div>

          <div className="stats-layout">
            <article className="panel">
              <h3>Revenue Trend</h3>
              <TrendChart data={charts.revenueTrend || []} />
            </article>
            <article className="panel">
              <h3>Order Status Mix</h3>
              <StatusBars breakdown={charts.statusBreakdown || {}} />
            </article>
          </div>

          <div className="stats-layout">
            <article className="panel">
              <h3>Top Products (by revenue)</h3>
              <div className="stats-table-wrap">
                <table className="stats-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(charts.topProducts || []).map((product) => (
                      <tr key={product.key}>
                        <td>{product.name}</td>
                        <td>{Number(product.quantity || 0).toLocaleString()}</td>
                        <td>{money(product.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="panel">
              <h3>Operations & Support</h3>
              <div className="stats-mini-grid">
                <div>
                  <p className="muted">Avg prep time</p>
                  <p className="stat-number small">{Number(operations.avgPrepMinutes || 0).toFixed(1)}m</p>
                </div>
                <div>
                  <p className="muted">Avg delivery time</p>
                  <p className="stat-number small">{Number(operations.avgDeliveryMinutes || 0).toFixed(1)}m</p>
                </div>
                <div>
                  <p className="muted">Avg pickup completion</p>
                  <p className="stat-number small">{Number(operations.avgPickupCompletionMinutes || 0).toFixed(1)}m</p>
                </div>
                <div>
                  <p className="muted">Delivery orders</p>
                  <p className="stat-number small">{Number(summary.deliveryOrdersCount || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="muted">Self pickup orders</p>
                  <p className="stat-number small">{Number(summary.selfPickupOrdersCount || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="muted">Open tickets</p>
                  <p className="stat-number small">{Number(support.openTickets || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="muted">Resolved tickets</p>
                  <p className="stat-number small">{Number(support.resolvedTickets || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="muted">Avg resolution</p>
                  <p className="stat-number small">{Number((support.avgResolutionMinutes || 0) / 60).toFixed(1)}h</p>
                </div>
                <div>
                  <p className="muted">CSAT</p>
                  <p className="stat-number small">
                    {support.csatResponses ? `${Number(support.avgCsat || 0).toFixed(2)} / 5` : 'n/a'}
                  </p>
                </div>
              </div>
            </article>
          </div>
        </>
      ) : null}
    </section>
  );
}
