import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderApi } from '../api/orderApi';
import { useAuth } from '../context/AuthContext';
import { useOrdersRealtime } from '../hooks/useOrdersRealtime';
import { getStatusLabel, getStatusBadgeClass } from '../utils/statusHelpers';
import LoadingSpinner from '../components/LoadingSpinner';

const getStatusTone = (status) => {
  if (['arrived', 'picked_up', 'delivered'].includes(status)) {
    return 'success';
  }
  if (['confirmed', 'preparing', 'ready_for_pickup', 'on_the_way'].includes(status)) {
    return 'active';
  }
  return 'muted';
};

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
      <h1>{user?.role === 'rider' ? 'My Dispatch Orders' : 'Admin Orders'}</h1>
      <p className="muted">Live order monitoring. Tap any order for full details.</p>

      {error ? <p className="error">{error}</p> : null}

      {/* Search & Filter */}
      <article className="panel admin-filters">
        <input
          type="text"
          placeholder="Search by order ID, customer name, or phone..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="search-input"
        />
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
      </article>

      {loading ? <LoadingSpinner label="Loading orders..." /> : null}
      {!loading && filteredOrders.length === 0 ? (
        <p className="muted">No orders found.</p>
      ) : null}

      <div className="grid">
        {filteredOrders.map((order) => (
          <article
            className={`panel order-card tone-${getStatusTone(order.status)}`}
            key={order._id}
          >
            <div className="order-card-header">
              <div>
                <h3 className="order-card-title">Order #{order._id.slice(-6)}</h3>
                <p className="muted">
                  {new Date(order.createdAt).toLocaleDateString()} at{' '}
                  {new Date(order.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                {getStatusLabel(order.status)}
              </span>
            </div>

            <div className="order-card-details">
              <p>
                <strong>Customer:</strong> {order.customer?.fullName || 'Unknown'}
              </p>
              {order.customer?.phone && (
                <p>
                  <strong>Phone:</strong>{' '}
                  <a href={`tel:${order.customer.phone}`}>{order.customer.phone}</a>
                </p>
              )}
              <p>
                <strong>Total:</strong> <span className="price">₦{Number(order.total || 0).toLocaleString()}</span>
              </p>
              <p>
                <strong>Fulfillment:</strong>{' '}
                {order.fulfillmentType === 'self_pickup' ? 'Self pickup' : 'Delivery'}
              </p>
            </div>

            {/* Operation Alerts */}
            {!order.kitchenHandledBy && (
              <div className="alert alert-warning">
                ⚠ <strong>Not claimed yet</strong> — No kitchen staff assigned
              </div>
            )}
            {!order.assignedRider && order.fulfillmentType !== 'self_pickup' && (
              <div className="alert alert-warning">
                ⚠ <strong>No rider assigned</strong> — Waiting for dispatch
              </div>
            )}

            {/* Staff Info */}
            {order.kitchenHandledBy && (
              <p>
                <strong>Kitchen:</strong> {order.kitchenHandledBy.fullName}
              </p>
            )}
            {order.assignedRider && (
              <p>
                <strong>Rider:</strong> {order.assignedRider.fullName}
                {order.assignedRider.phone && ` • ${order.assignedRider.phone}`}
              </p>
            )}

            <Link to={`/orders/${order._id}`} className="order-link">
              View full details →
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
