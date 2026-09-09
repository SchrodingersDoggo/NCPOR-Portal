import React from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <nav className="h-16 flex items-center justify-between px-6 bg-[#2d5c80] text-white">
      <div className="font-bold text-xl">NCPOR Logo</div>

      <div className="flex gap-6 text-sm font-medium">
        <Link to="/" className="text-white">Home</Link>
        <Link to="/" className="text-slate-300 hover:text-white">Explore</Link>
        <Link to="/" className="text-slate-300 hover:text-white">Archive</Link>
        <Link to="/" className="text-slate-300 hover:text-white">Activities</Link>
      </div>

      <div className="flex items-center gap-4">
        <button><Search className="w-5 h-5 text-slate-300 hover:text-white" /></button>

        {isAuthenticated ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-200">
              {user.name} <span className="text-slate-400">({user.role})</span>
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-1.5 border border-white/30 rounded text-sm hover:bg-white/10 transition"
            >
              Logout
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="px-4 py-1.5 border border-white/30 rounded text-sm hover:bg-white/10 transition"
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}

// Placeholder to prove ProtectedRoute works end to end. Swap this out for
// a real page (or delete it) once you're building actual gated features.
function DashboardPlaceholder() {
  const { user } = useAuth();
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0b1c25]">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-white mb-2">Protected page</h1>
        <p className="text-slate-400">Only visible because you're signed in as {user.name}.</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1 relative">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPlaceholder />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
