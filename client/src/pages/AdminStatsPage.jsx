import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../api/adminApi';
import LoadingSpinner from '../components/LoadingSpinner';
import { CardIcon, ReceiptIcon, ClockIcon, StarIcon } from '../components/icons';
import './AdminPolish.css';

const rangeOptions = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'custom', label: 'Custom range' },
];

const money = (value) => `₦${Number(value || 0).toLocaleString()}`;

const STATUS_COLORS = {
  delivered: '#3a6835',
  picked_up: '#3a6835',
  arrived: '#3a6835',
  confirmed: '#e8a020',
  preparing: '#e8a020',
  ready_for_pickup: '#e8a020',
  on_the_way: '#2f6f8f',
  pending: '#9ca3af',
  cancelled: '#b64632',
};

const statusLabel = (status) =>
  String(status || '').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

function KpiCard({ icon: Icon, label, value, delta, badgeClass }) {
  return (
    <div className="kpi-card">
      <div className="kpi-card-head">
        <div className={`admin-card-icon-badge ${badgeClass}`} style={{ marginBottom: 0 }}>
          <Icon size={16} />
        </div>
        {delta ? <span className={`kpi-delta ${delta.up ? 'up' : 'down'}`}>{delta.up ? '▲' : '▼'} {delta.text}</span> : null}
      </div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
    </div>
  );
}

const MAX_VISIBLE_LABELS = 10;

function AreaChart({ data = [] }) {
  const width = 560;
  const height = 170;
  const padding = 12;

  if (!data.length) {
    return <p className="muted">No trend data yet.</p>;
  }

  const maxValue = Math.max(...data.map((point) => Number(point.revenue || 0)), 1);
  const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;
  const plotHeight = height - padding * 2;

  const coords = data.map((point, index) => ({
    x: padding + stepX * index,
    y: padding + plotHeight - (Number(point.revenue || 0) / maxValue) * plotHeight,
    date: point.date,
    revenue: Number(point.revenue || 0),
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ');
  const areaPath = `${linePath} L${coords[coords.length - 1].x},${height - padding} L${coords[0].x},${height - padding} Z`;
  const trendKey = data.map((point) => `${point.date}:${point.revenue}`).join('|');

  // Highlight the actual peak point on the line — this always corresponds to a
  // real point you can trace with your eye, unlike a floating total that has
  // no position on a per-day line.
  const peak = coords.reduce((best, point) => (point.revenue > best.revenue ? point : best), coords[0]);
  const peakLeftPct = (peak.x / width) * 100;
  const peakTopPct = (peak.y / height) * 100;

  // Long ranges can produce hundreds of days — only ever show a handful of
  // evenly-spaced date labels so they can't overflow the layout.
  const labelStep = Math.max(1, Math.ceil(data.length / MAX_VISIBLE_LABELS));
  const visibleLabels = data.filter((_, index) => index % labelStep === 0 || index === data.length - 1);

  return (
    <div className="area-chart-wrap">
      {peak.revenue > 0 ? (
        <span
          className="area-chart-callout"
          style={{ left: `${peakLeftPct}%`, top: `${peakTopPct}%` }}
        >
          {money(peak.revenue)}
        </span>
      ) : null}
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Revenue trend">
        <defs>
          <linearGradient id="revenueAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2f5d32" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#2f5d32" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" y1={padding} x2={width} y2={padding} stroke="#e6e1d2" strokeWidth="1" />
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#e6e1d2" strokeWidth="1" />
        <line x1="0" y1={height - padding} x2={width} y2={height - padding} stroke="#e6e1d2" strokeWidth="1" />
        <path key={`fill-${trendKey}`} d={areaPath} fill="url(#revenueAreaFill)" />
        <path
          key={`line-${trendKey}`}
          className="trend-polyline"
          d={linePath}
          fill="none"
          stroke="#2d7d43"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={peak.x} cy={peak.y} r="4.5" fill="#2d7d43" />
      </svg>
      <div className="chart-labels">
        {visibleLabels.map((point) => (
          <span key={point.date}>{point.date.slice(5)}</span>
        ))}
      </div>
    </div>
  );
}

function StatusDonut({ breakdown = {} }) {
  const entries = Object.entries(breakdown).filter(([, count]) => Number(count) > 0);
  const total = entries.reduce((sum, [, count]) => sum + Number(count || 0), 0);

  if (!entries.length) {
    return <p className="muted">No status data in this range.</p>;
  }

  let cumulative = 0;
  const segments = entries
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => {
      const pct = (Number(count || 0) / total) * 100;
      const segment = { status, count, pct, start: cumulative, color: STATUS_COLORS[status] || '#9ca3af' };
      cumulative += pct;
      return segment;
    });

  return (
    <div className="donut-row">
      <div className="donut-wrap">
        <svg viewBox="0 0 42 42" role="img" aria-label="Order status mix">
          <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="#eee" strokeWidth="6" />
          {segments.map((segment) => (
            <circle
              key={segment.status}
              cx="21"
              cy="21"
              r="15.9"
              fill="transparent"
              stroke={segment.color}
              strokeWidth="6"
              pathLength="100"
              strokeDasharray={`${segment.pct} ${100 - segment.pct}`}
              strokeDashoffset={-segment.start}
              transform="rotate(-90 21 21)"
            />
          ))}
        </svg>
        <div className="donut-center">
          <span className="donut-n">{total.toLocaleString()}</span>
          <span className="donut-l">orders</span>
        </div>
      </div>
      <div className="chart-legend">
        {segments.map((segment) => (
          <div className="legend-row" key={segment.status}>
            <span className="legend-dot" style={{ background: segment.color }} />
            {statusLabel(segment.status)}
            <span className="legend-amt">{segment.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopProductsRank({ products = [] }) {
  if (!products.length) {
    return <p className="muted">No product sales in this range.</p>;
  }

  const max = Math.max(...products.map((product) => Number(product.revenue || 0)), 1);

  return (
    <div className="rank-list">
      {products.map((product, index) => (
        <div className="rank-row" key={product.key}>
          <span className="rank-num">{String(index + 1).padStart(2, '0')}</span>
          <div>
            <div className="rank-name-line">
              <b>{product.name}</b>
              <span>{money(product.revenue)}</span>
            </div>
            <div className="rank-bar-wrap">
              <div className="rank-bar" style={{ width: `${(Number(product.revenue || 0) / max) * 100}%` }} />
            </div>
          </div>
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
          <div className="kpi-row">
            <KpiCard
              icon={CardIcon}
              badgeClass="badge-green"
              label="Total revenue"
              value={money(summary.revenue)}
              delta={
                summary.revenueGrowthPct === null || summary.revenueGrowthPct === undefined
                  ? null
                  : { up: summary.revenueGrowthPct >= 0, text: `${Math.abs(Number(summary.revenueGrowthPct)).toFixed(1)}%` }
              }
            />
            <KpiCard
              icon={ReceiptIcon}
              badgeClass="badge-blue"
              label="Paid orders"
              value={Number(summary.paidOrdersCount || 0).toLocaleString()}
              delta={
                summary.paidOrderGrowthPct === null || summary.paidOrderGrowthPct === undefined
                  ? null
                  : { up: summary.paidOrderGrowthPct >= 0, text: `${Math.abs(Number(summary.paidOrderGrowthPct)).toFixed(1)}%` }
              }
            />
            <KpiCard
              icon={ClockIcon}
              badgeClass="badge-amber"
              label="Avg prep time"
              value={`${Number(operations.avgPrepMinutes || 0).toFixed(1)}m`}
            />
            <KpiCard
              icon={StarIcon}
              badgeClass="badge-purple"
              label="CSAT"
              value={support.csatResponses ? `${Number(support.avgCsat || 0).toFixed(2)} / 5` : 'n/a'}
            />
          </div>

          <div className="stats-layout">
            <article className="panel">
              <h3>Revenue Trend</h3>
              <p className="muted" style={{ marginBottom: '0.6rem' }}>AOV {money(summary.avgOrderValue)} · {Number(summary.itemsSold || 0).toLocaleString()} items sold</p>
              <AreaChart data={charts.revenueTrend || []} />
            </article>
            <article className="panel">
              <h3>Order Status Mix</h3>
              <p className="muted" style={{ marginBottom: '0.6rem' }}>
                Fulfilled {Number(summary.fulfilledCount || 0).toLocaleString()} · Delivery {Number(summary.deliveryOrdersCount || 0).toLocaleString()} · Pickup {Number(summary.selfPickupOrdersCount || 0).toLocaleString()}
              </p>
              <StatusDonut breakdown={charts.statusBreakdown || {}} />
            </article>
          </div>

          <div className="stats-layout">
            <article className="panel">
              <h3>Top Products (by revenue)</h3>
              <TopProductsRank products={charts.topProducts || []} />
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
