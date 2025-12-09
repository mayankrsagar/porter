// src/App.jsx
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
import AdminCreateDriver from './pages/admin/CreateDriver';
import AdminDriversPage from './pages/admin/Drivers';
import DriverDashboard from './pages/driver/DriverDashboard';
import Home from './pages/Home';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Register from './pages/Register';
import ProtectedRoute from './routes/ProtectedRoute';

// import DriverDashboard from "./pages/driver/Dashboard"; // if you make one

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navigation />
        {/* <Header /> */}
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
          <Routes>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected - general user/admin */}
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

            {/* Admin-only */}
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

            {/* Driver-only (if you build it later) */}
            <Route
              path="/driver"
              element={
                <ProtectedRoute roles={["driver"]}>
                  <DriverDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}
