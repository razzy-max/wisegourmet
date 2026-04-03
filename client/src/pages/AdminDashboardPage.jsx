import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderApi } from '../api/orderApi';
import { useOrdersRealtime } from '../hooks/useOrdersRealtime';

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState([]);

  const load = useCallback(async () => {
    try {
      const response = await orderApi.allOrders();
      setOrders(response.orders || []);
    } catch {
      setOrders([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useOrdersRealtime(load);

  const counts = orders.reduce(
    (accumulator, order) => {
      accumulator.total += 1;
      accumulator[order.status] = (accumulator[order.status] || 0) + 1;
      return accumulator;
    },
    {
      total: 0,
      pending: 0,
      confirmed: 0,
      preparing: 0,
      ready_for_pickup: 0,
      picked_up: 0,
      on_the_way: 0,
      arrived: 0,
      delivered: 0,
    }
  );

  return (
    <section className="page-wrap">
      <h1>Admin Dashboard</h1>
      <div className="grid">
        <article className="panel">
          <h3>Live Overview</h3>
          <p>Total orders: {counts.total}</p>
          <p>Pending: {counts.pending}</p>
          <p>Confirmed: {counts.confirmed}</p>
          <p>Preparing: {counts.preparing}</p>
          <p>Ready for pickup: {counts.ready_for_pickup}</p>
          <p>Delivered: {counts.delivered}</p>
        </article>
        <article className="panel">
          <h3>Operations</h3>
          <p>Watch orders move from payment to kitchen to dispatch in real time.</p>
          <p>Claimed kitchen orders show the staff member handling them.</p>
          <p>Assigned riders show who has accepted each delivery.</p>
          <Link to="/admin/stats" className="btn" style={{ marginTop: '0.6rem' }}>
            Open Detailed Stats
          </Link>
        </article>
      </div>
      <div className="grid">
        <article className="panel">
          <h3>Menu Management</h3>
          <p>Manage categories, products, prices, and availability.</p>
          <Link to="/admin/menu" className="btn">
            Open Menu Manager
          </Link>
        </article>
        <article className="panel">
          <h3>Order Operations</h3>
          <p>Track all orders and move statuses through dispatch workflow.</p>
          <Link to="/admin/orders" className="btn">
            Open Orders
          </Link>
        </article>
        <article className="panel">
          <h3>Team Management</h3>
          <p>Create and manage staff and rider accounts.</p>
          <Link to="/admin/team" className="btn">
            Open Team Manager
          </Link>
        </article>
        <article className="panel">
          <h3>Security</h3>
          <p>Change your admin password.</p>
          <Link to="/admin/password" className="btn">
            Change Password
          </Link>
        </article>
      </div>
    </section>
  );
}
