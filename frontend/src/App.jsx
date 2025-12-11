import {
  Route,
  Routes,
} from 'react-router-dom';

import Booking from './components/Booking';
import Dashboard from './components/Dashboard';
import Fleet from './components/Fleet';
import Footer from './components/Footer';
import Navigation from './components/Navigation';
import Tracking from './components/Tracking';
import { AuthProvider } from './context/AuthContext';
import AdminPage from './pages/Admin';
import AdminCreateDriver from './pages/admin/CreateDriver';
import AdminDriversPage from './pages/admin/Drivers';
import AnalyticsPage from './pages/Analytics';
import DriverDashboard from './pages/driver/DriverDashboard';
import Home from './pages/Home';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import OrdersPage from './pages/Orders';
import Profile from './pages/Profile';
import Register from './pages/Register';
import VehiclesPage from './pages/Vehicles';
import ProtectedRoute from './routes/ProtectedRoute';

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navigation />
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
          <Routes>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute roles={["user", "admin"]}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fleet"
              element={
                <ProtectedRoute roles={["user", "admin"]}>
                  <Fleet />
                </ProtectedRoute>
              }
            />
            <Route
              path="/booking"
              element={
                <ProtectedRoute roles={["user", "admin"]}>
                  <Booking />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tracking"
              element={
                <ProtectedRoute roles={["user", "admin", "driver"]}>
                  <Tracking />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* Admin */}
            <Route
              path="/admin/drivers"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminDriversPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/drivers/create"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminCreateDriver />
                </ProtectedRoute>
              }
            />

            {/* Driver */}
            <Route
              path="/driver"
              element={
                <ProtectedRoute roles={["driver"]}>
                  <DriverDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute roles={["user", "admin"]}>
                  <OrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vehicles"
              element={
                <ProtectedRoute roles={["user", "admin"]}>
                  <VehiclesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute roles={["admin", "user"]}>
                  <AnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminPage />
                </ProtectedRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}
