import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';

// Import pages
import Dashboard from './pages/Dashboard';
import Teams from './pages/Teams';
import Matches from './pages/Matches';
import LiveScore from './pages/LiveScore';
import Standings from './pages/Standings';
import TopPerformers from './pages/TopPerformers';
import Tournament from './pages/Tournament';

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <Link to="/" className="navbar-brand">
            Cricket Tournament
          </Link>
          <ul className="navbar-nav">
            <li><Link to="/" className="nav-link">Dashboard</Link></li>
            <li><Link to="/tournament" className="nav-link">Tournament</Link></li>
            <li><Link to="/teams" className="nav-link">Teams</Link></li>
            <li><Link to="/matches" className="nav-link">Matches</Link></li>
            <li><Link to="/standings" className="nav-link">Standings</Link></li>
            <li><Link to="/top-performers" className="nav-link">Top Performers</Link></li>
          </ul>
        </nav>

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tournament" element={<Tournament />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/match/:id" element={<LiveScore />} />
          <Route path="/standings" element={<Standings />} />
          <Route path="/top-performers" element={<TopPerformers />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
