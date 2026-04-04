import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AdminNavBar from './components/AdminNavBar';
import StaffNavBar from './components/StaffNavBar';
import RiderNavBar from './components/RiderNavBar';
import CustomerNavBar from './components/CustomerNavBar';
import SupportNavBar from './components/SupportNavBar';
import ProtectedRoute from './components/ProtectedRoute';
import HomeMenuPage from './pages/HomeMenuPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OrderDetailsPage from './pages/OrderDetailsPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import ProfilePage from './pages/ProfilePage';
import SupportPage from './pages/SupportPage';
import SupportTicketPage from './pages/SupportTicketPage';
import MyOrdersPage from './pages/MyOrdersPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminStatsPage from './pages/AdminStatsPage';
import AdminMenuManagerPage from './pages/AdminMenuManagerPage';
import AdminOrdersPage from './pages/AdminOrdersPage';
import AdminTeamPage from './pages/AdminTeamPage';
import SupportInboxPage from './pages/SupportInboxPage';
import KitchenOrdersPage from './pages/KitchenOrdersPage';
import StaffOrderHistoryPage from './pages/StaffOrderHistoryPage';
import RiderQueuePage from './pages/RiderQueuePage';
import RiderDeliveryHistoryPage from './pages/RiderDeliveryHistoryPage';
import AdminPasswordPage from './pages/AdminPasswordPage';
import './App.css';

function NavBarSelector() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <CustomerNavBar />;
  }

  switch (user?.role) {
    case 'admin':
      return <AdminNavBar />;
    case 'staff':
      return <StaffNavBar />;
    case 'rider':
      return <RiderNavBar />;
    case 'support':
      return <SupportNavBar />;
    default:
      return <CustomerNavBar />;
  }
}

function App() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;

    if (path === '/') {
      document.title = 'Menu — Wise Gourmet';
      return;
    }

    if (path.startsWith('/cart')) {
      document.title = 'Cart — Wise Gourmet';
      return;
    }

    if (path.startsWith('/checkout')) {
      document.title = 'Checkout — Wise Gourmet';
      return;
    }

    if (path.startsWith('/orders')) {
      document.title = 'My Orders — Wise Gourmet';
      return;
    }

    if (path.startsWith('/profile')) {
      document.title = 'Profile — Wise Gourmet';
      return;
    }

    if (path.startsWith('/support')) {
      document.title = 'Support — Wise Gourmet';
      return;
    }

    document.title = 'Wise Gourmet';
  }, [location.pathname]);

  return (
    <div>
      <NavBarSelector />
      <div key={location.pathname} className="route-fade">
        <Routes>
        <Route path="/" element={<HomeMenuPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/login" element={<Navigate to="/login" replace />} />
        <Route path="/staff/login" element={<Navigate to="/login" replace />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/cart"
          element={
            <ProtectedRoute roles={['customer']}>
              <CartPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute roles={['customer']}>
              <CheckoutPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute roles={['customer']}>
              <MyOrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <ProtectedRoute roles={['customer', 'admin', 'staff', 'rider', 'support']}>
              <OrderDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute roles={['customer']}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/support"
          element={
            <ProtectedRoute roles={['customer']}>
              <SupportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/support/tickets/:id"
          element={
            <ProtectedRoute roles={['customer', 'support', 'admin']}>
              <SupportTicketPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/stats"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminStatsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/menu"
          element={
            <ProtectedRoute roles={['admin', 'staff']}>
              <AdminMenuManagerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <ProtectedRoute roles={['admin', 'staff', 'rider']}>
              <AdminOrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/password"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminPasswordPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/team"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminTeamPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/support"
          element={
            <ProtectedRoute roles={['admin', 'support']}>
              <SupportInboxPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/kitchen"
          element={
            <ProtectedRoute roles={['staff']}>
              <KitchenOrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/history"
          element={
            <ProtectedRoute roles={['staff']}>
              <StaffOrderHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rider/queue"
          element={
            <ProtectedRoute roles={['rider']}>
              <RiderQueuePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rider/history"
          element={
            <ProtectedRoute roles={['rider']}>
              <RiderDeliveryHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
