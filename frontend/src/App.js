import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import './App.css';

// Import context
import { AuthProvider, useAuth } from './context/AuthContext';

// Import pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Teams from './pages/Teams';
import Matches from './pages/Matches';
import LiveScore from './pages/LiveScore';
import Standings from './pages/Standings';
import TopPerformers from './pages/TopPerformers';
import Tournament from './pages/Tournament';

// Protected Route component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Main layout with navbar
function AppLayout() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isScorer = user?.role === 'scorer';

  return (
    <div className="app">
      <nav className="navbar">
        <Link to="/" className="navbar-brand">
          Cricket Tournament
        </Link>
        <ul className="navbar-nav">
          <li><Link to="/" className="nav-link">Dashboard</Link></li>
          {/* Tournament tab - Admin only */}
          {isAdmin && (
            <li><Link to="/tournament" className="nav-link">Tournament</Link></li>
          )}
          {/* Teams tab - Admin only */}
          {isAdmin && (
            <li><Link to="/teams" className="nav-link">Teams</Link></li>
          )}
          {/* Matches tab - Admin and Scorer only */}
          {(isAdmin || isScorer) && (
            <li><Link to="/matches" className="nav-link">Matches</Link></li>
          )}
          <li><Link to="/standings" className="nav-link">Standings</Link></li>
          <li><Link to="/top-performers" className="nav-link">Top Performers</Link></li>
        </ul>
        <div className="navbar-user">
          <span className="user-info">
            {user?.name} ({user?.role})
          </span>
          <button className="btn-logout" onClick={logout}>
            Logout
          </button>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        {/* Protected routes based on role */}
        {isAdmin && <Route path="/tournament" element={<Tournament />} />}
        {isAdmin && <Route path="/teams" element={<Teams />} />}
        {(isAdmin || isScorer) && <Route path="/matches" element={<Matches />} />}
        <Route path="/match/:id" element={<LiveScore />} />
        <Route path="/standings" element={<Standings />} />
        <Route path="/top-performers" element={<TopPerformers />} />
        {/* Redirect unauthorized access to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
