import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/layout/Layout.jsx';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { CartProvider } from './contexts/CartContext.jsx';
import { LanguageProvider } from './contexts/LanguageContext.jsx';
import { PlatformConfigProvider } from './contexts/PlatformConfigContext.jsx';

import LandingPage from './pages/LandingPage.jsx';
import HomePage from './pages/HomePage.jsx';
import DemandPage from './pages/DemandPage.jsx';
import ProductPage from './pages/ProductPage.jsx';
import CartPage from './pages/CartPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import FavoritesPage from './pages/FavoritesPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import MyPriceRequestsPage from './pages/MyPriceRequestsPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import OtpPage from './pages/OtpPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import AlertsPage from './pages/AlertsPage.jsx';
import ShipmentTrackingPage from './pages/ShipmentTrackingPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Auth pages — no layout wrapper */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/otp" element={<OtpPage />} />

      {/* Main app with layout */}
      <Route path="/" element={<Layout><LandingPage /></Layout>} />
      <Route path="/marketplace" element={<Layout><HomePage /></Layout>} />
      <Route path="/demand" element={
        <ProtectedRoute>
          <Layout><DemandPage /></Layout>
        </ProtectedRoute>
      } />
      {/* LEGACY aliases retained and redirected to the open marketplace. */}
      <Route path="/packages" element={<Navigate to="/marketplace" replace />} />
      <Route path="/package" element={<Navigate to="/marketplace" replace />} />
      <Route path="/pakage" element={<Navigate to="/marketplace" replace />} />
      <Route path="/packages/product/:id" element={<Navigate to="/marketplace" replace />} />
      {/* LEGACY: old deals URL now opens the marketplace. */}
      <Route path="/deals" element={<Navigate to="/marketplace" replace />} />
      <Route path="/product/:id" element={<Layout><ProductPage /></Layout>} />
      <Route path="/cart" element={<Layout><CartPage /></Layout>} />
      <Route path="/auctions" element={<Navigate to="/marketplace" replace />} />
      <Route path="/favorites" element={<Layout><FavoritesPage /></Layout>} />
      <Route path="/orders" element={<Layout><OrdersPage /></Layout>} />
      <Route path="/profile" element={<Layout><ProfilePage /></Layout>} />
      <Route path="/price-requests" element={
        <ProtectedRoute>
          <Layout><MyPriceRequestsPage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/alerts" element={
        <ProtectedRoute>
          <Layout><AlertsPage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/orders/:orderId/track" element={
        <ProtectedRoute>
          <Layout><ShipmentTrackingPage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/checkout" element={
        <ProtectedRoute>
          <Layout><CheckoutPage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="*" element={<Layout><NotFoundPage /></Layout>} />
    </Routes>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <PlatformConfigProvider>
        <AuthProvider>
          <CartProvider>
            <AppRoutes />
            <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '12px',
              fontFamily: "'Thmanyah Sans', 'Tajawal', system-ui, sans-serif",
              fontSize: '14px',
              fontWeight: '500',
            },
            success: {
              iconTheme: { primary: '#2F2446', secondary: '#fff' },
            },
          }}
        />
          </CartProvider>
        </AuthProvider>
      </PlatformConfigProvider>
    </LanguageProvider>
  );
}
