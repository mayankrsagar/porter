import React from "react";

import { Link, Route, Routes } from "react-router-dom";

import Booking from "./components/Booking";
import Dashboard from "./components/Dashboard";
import Fleet from "./components/Fleet";
import Tracking from "./components/Tracking";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white shadow p-4">
        <div className="max-w-6xl mx-auto flex gap-4">
          <Link to="/" className="font-semibold">
            Dashboard
          </Link>
          <Link to="/fleet" className="font-semibold">
            Fleet
          </Link>
          <Link to="/booking" className="font-semibold">
            Booking
          </Link>
          <Link to="/tracking" className="font-semibold">
            Tracking
          </Link>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto p-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/fleet" element={<Fleet />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/tracking" element={<Tracking />} />
        </Routes>
      </main>
    </div>
  );
}
