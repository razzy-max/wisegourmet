import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useStoreName } from './context/StoreSettingsContext';
import AdminNavBar from './components/AdminNavBar';
import StaffNavBar from './components/StaffNavBar';
import RiderNavBar from './components/RiderNavBar';
import CustomerNavBar from './components/CustomerNavBar';
import SupportNavBar from './components/SupportNavBar';
import ProtectedRoute from './components/ProtectedRoute';
import HomeMenuPage from './pages/HomeMenuPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import InstallPage from './pages/InstallPage';
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
import AdminDeliveryZonesPage from './pages/AdminDeliveryZonesPage';
import AdminPromotionsPage from './pages/AdminPromotionsPage';
import AdminCustomersPage from './pages/AdminCustomersPage';
import ControlStoreNamePage from './pages/ControlStoreNamePage';
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
  const { user, isAuthenticated } = useAuth();
  const storeName = useStoreName();
  const isAdminLayout = isAuthenticated && user?.role === 'admin';
  const [renderedLocation, setRenderedLocation] = useState(location);

  useEffect(() => {
    if (location === renderedLocation) {
      return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (typeof document.startViewTransition === 'function' && !reducedMotion) {
      document.startViewTransition(() => {
        flushSync(() => setRenderedLocation(location));
      });
    } else {
      setRenderedLocation(location);
    }
  }, [location, renderedLocation]);

  useEffect(() => {
    const path = location.pathname;

    if (path === '/') {
      document.title = `Menu — ${storeName}`;
      return;
    }

    if (path === '/install') {
      document.title = `Install App — ${storeName}`;
      return;
    }

    if (path.startsWith('/cart')) {
      document.title = `Cart — ${storeName}`;
      return;
    }

    if (path.startsWith('/checkout')) {
      document.title = `Checkout — ${storeName}`;
      return;
    }

    if (path.startsWith('/orders')) {
      document.title = `My Orders — ${storeName}`;
      return;
    }

    if (path.startsWith('/profile')) {
      document.title = `Profile — ${storeName}`;
      return;
    }

    if (path.startsWith('/support')) {
      document.title = `Support — ${storeName}`;
      return;
    }

    document.title = storeName;
  }, [location.pathname, storeName]);

  const routesContent = (
    <div key={renderedLocation.pathname} className="route-fade">
      <Routes location={renderedLocation}>
        <Route path="/" element={<HomeMenuPage />} />
        <Route path="/install" element={<InstallPage />} />
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
          path="/admin/zones"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminDeliveryZonesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/promotions"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminPromotionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/customers"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminCustomersPage />
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
        <Route
          path="/control/storename"
          element={
            <ProtectedRoute roles={['admin']}>
              <ControlStoreNamePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );

  if (isAdminLayout) {
    return (
      <div className="admin-shell">
        <AdminNavBar />
        <main className="admin-shell-main">{routesContent}</main>
      </div>
    );
  }

  return (
    <div>
      <NavBarSelector />
      {routesContent}
    </div>
  );
}

export default App;
