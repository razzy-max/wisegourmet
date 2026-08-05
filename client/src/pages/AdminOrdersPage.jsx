import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderApi } from '../api/orderApi';
import { useAuth } from '../context/AuthContext';
import { useOrdersRealtime } from '../hooks/useOrdersRealtime';
import { getStatusLabel, getStatusBadgeClass } from '../utils/statusHelpers';
import EnableAlertsCard from '../components/EnableAlertsCard';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { SearchIcon, PackageIcon, ChevronRightIcon } from '../components/icons';
import './AdminPolish.css';

export default function AdminOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response =
        user?.role === 'rider' ? await orderApi.riderOrders() : await orderApi.allOrders();
      setOrders(response.orders || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    load();
  }, [load]);

  useOrdersRealtime(load);

  const filteredOrders = orders.filter((order) => {
    // Status filter
    if (statusFilter !== 'all' && order.status !== statusFilter) {
      return false;
    }
    // Search filter
    if (searchFilter.trim()) {
      const query = searchFilter.toLowerCase();
      return (
        order._id.includes(query) ||
        order.customer?.fullName?.toLowerCase().includes(query) ||
        order.customer?.phone?.includes(query)
      );
    }
    return true;
  });

  const statusOptions = [
    'all',
    'pending',
    'confirmed',
    'preparing',
    'ready_for_pickup',
    'picked_up',
    'on_the_way',
    'arrived',
    'delivered',
    'cancelled',
  ];

  return (
    <section className="page-wrap">
      <EnableAlertsCard />
      <h1>{user?.role === 'rider' ? 'My Dispatch Orders' : 'Admin Orders'}</h1>
      <p className="muted">Live order monitoring. Tap any order for full details.</p>

      {error ? <p className="error">{error}</p> : null}

      <article className="panel" style={{ marginTop: '1.2rem' }}>
        {/* Search & Filter */}
        <div className="data-toolbar">
          <div className="search-field">
            <SearchIcon size={15} />
            <input
              type="text"
              placeholder="Search by order ID, customer name, or phone..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            {statusOptions
              .filter((s) => s !== 'all')
              .map((status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, ' ').charAt(0).toUpperCase() + status.replace(/_/g, ' ').slice(1)}
                </option>
              ))}
          </select>
        </div>

        {loading ? <Skeleton variant="row" count={5} /> : null}
        {!loading && filteredOrders.length === 0 ? (
          <EmptyState
            icon={PackageIcon}
            heading="No orders found"
            subtext="Orders will show up here as customers check out."
          />
        ) : null}

        {!loading && filteredOrders.length > 0 ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th className="num">Total</th>
                  <th>Status</th>
                  <th>Kitchen</th>
                  <th>Rider</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const unclaimed = !order.kitchenHandledBy;
                  const noRider = !order.assignedRider && order.fulfillmentType !== 'self_pickup';
                  const rowClass = unclaimed || noRider ? 'row-severity-warn' : '';
                  return (
                    <tr className={rowClass} key={order._id}>
                      <td>
                        <div className="row-item">
                          <div>
                            <div className="row-name">Order #{order._id.slice(-6)}</div>
                            <div className="row-desc">
                              {new Date(order.createdAt).toLocaleDateString()} at{' '}
                              {new Date(order.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="row-name">{order.customer?.fullName || 'Unknown'}</div>
                        {order.customer?.phone && (
                          <div className="row-desc">
                            <a href={`tel:${order.customer.phone}`}>{order.customer.phone}</a>
                          </div>
                        )}
                      </td>
                      <td className="num tabular">₦{Number(order.total || 0).toLocaleString()}</td>
                      <td>
                        <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                      <td>
                        {order.kitchenHandledBy ? (
                          order.kitchenHandledBy.fullName
                        ) : (
                          <strong style={{ color: 'var(--wg-amber)' }}>Unclaimed</strong>
                        )}
                      </td>
                      <td>
                        {order.assignedRider ? (
                          <>
                            <div className="row-name">{order.assignedRider.fullName}</div>
                            {order.assignedRider.phone ? (
                              <div className="row-desc">{order.assignedRider.phone}</div>
                            ) : null}
                          </>
                        ) : order.fulfillmentType === 'self_pickup' ? (
                          <span className="muted">—</span>
                        ) : (
                          <strong style={{ color: 'var(--wg-amber)' }}>Unclaimed</strong>
                        )}
                      </td>
                      <td>
                        <div className="row-actions">
                          <Link to={`/orders/${order._id}`} aria-label="View full details">
                            <ChevronRightIcon size={16} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {!loading && filteredOrders.length > 0 ? (
          <div className="table-foot">
            <span>Showing {filteredOrders.length} of {orders.length} orders</span>
          </div>
        ) : null}
      </article>
    </section>
  );
}
