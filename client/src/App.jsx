import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useAutoEnableNotifications } from './hooks/useAutoEnableNotifications';
import AdminNavBar from './components/AdminNavBar';
import StaffNavBar from './components/StaffNavBar';
import RiderNavBar from './components/RiderNavBar';
import CustomerNavBar from './components/CustomerNavBar';
import SupportNavBar from './components/SupportNavBar';
import ProtectedRoute from './components/ProtectedRoute';
import HomeMenuPage from './pages/HomeMenuPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
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
import AdminBranchesPage from './pages/AdminBranchesPage';
import AdminPromotionsPage from './pages/AdminPromotionsPage';
import AdminPromoCodesPage from './pages/AdminPromoCodesPage';
import AdminCustomersPage from './pages/AdminCustomersPage';
import './App.css';

const STORE_NAME = 'Wise Gourmet';

function NavBarSelector() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <CustomerNavBar />;
  }

  switch (user?.role) {
    case 'admin':
    case 'branch_admin':
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
  const isAdminLayout = isAuthenticated && ['admin', 'branch_admin'].includes(user?.role);
  const [renderedLocation, setRenderedLocation] = useState(location);

  useAutoEnableNotifications(isAuthenticated, user?.role);

  useEffect(() => {
    if (location === renderedLocation) {
      return;
    }

    // React Router doesn't reset scroll on navigation — without this, moving
    // from a long scrolled-down page to a shorter one leaves the window at
    // the old offset, showing blank space above the new page's content.
    // Compares pathname only (not the full location) so in-page hash anchors
    // like /rider/queue#active-deliveries still scroll normally. Done inside
    // the same synchronous update the view transition captures, rather than
    // a separate effect — racing scrollTo against startViewTransition's
    // snapshot left a mismatched blank gap until a manual scroll repainted it.
    const pathnameChanged = location.pathname !== renderedLocation.pathname;
    const applyUpdate = () => {
      setRenderedLocation(location);
      if (pathnameChanged) {
        window.scrollTo(0, 0);
      }
    };

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (typeof document.startViewTransition === 'function' && !reducedMotion) {
      document.startViewTransition(() => {
        flushSync(applyUpdate);
      });
    } else {
      applyUpdate();
    }
  }, [location, renderedLocation]);

  useEffect(() => {
    const path = location.pathname;

    if (path === '/') {
      document.title = `Menu — ${STORE_NAME}`;
      return;
    }

    if (path === '/install') {
      document.title = `Install App — ${STORE_NAME}`;
      return;
    }

    if (path.startsWith('/cart')) {
      document.title = `Cart — ${STORE_NAME}`;
      return;
    }

    if (path.startsWith('/checkout')) {
      document.title = `Checkout — ${STORE_NAME}`;
      return;
    }

    if (path.startsWith('/orders')) {
      document.title = `My Orders — ${STORE_NAME}`;
      return;
    }

    if (path.startsWith('/profile')) {
      document.title = `Profile — ${STORE_NAME}`;
      return;
    }

    if (path.startsWith('/support')) {
      document.title = `Support — ${STORE_NAME}`;
      return;
    }

    document.title = STORE_NAME;
  }, [location.pathname]);

  const routesContent = (
    <div key={renderedLocation.pathname} className="route-fade">
      <Routes location={renderedLocation}>
        <Route path="/" element={<HomeMenuPage />} />
        <Route path="/install" element={<InstallPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/login" element={<Navigate to="/login" replace />} />
        <Route path="/staff/login" element={<Navigate to="/login" replace />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
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
            <ProtectedRoute roles={['admin', 'branch_admin']}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/stats"
          element={
            <ProtectedRoute roles={['admin', 'branch_admin']}>
              <AdminStatsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/menu"
          element={
            <ProtectedRoute roles={['admin', 'branch_admin', 'staff']}>
              <AdminMenuManagerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <ProtectedRoute roles={['admin', 'branch_admin', 'staff', 'rider']}>
              <AdminOrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/zones"
          element={
            <ProtectedRoute roles={['admin', 'branch_admin']}>
              <AdminDeliveryZonesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/branches"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminBranchesPage />
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
          path="/admin/promo-codes"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminPromoCodesPage />
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
            <ProtectedRoute roles={['admin', 'branch_admin']}>
              <AdminPasswordPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/team"
          element={
            <ProtectedRoute roles={['admin', 'branch_admin']}>
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
