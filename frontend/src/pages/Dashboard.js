import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { matchAPI, teamAPI } from '../services/api';
import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || window.location.origin;
const socket = io(SOCKET_URL);

function Dashboard() {
  const [liveMatches, setLiveMatches] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [stats, setStats] = useState({
    totalTeams: 0,
    totalMatches: 0,
    liveMatches: 0
  });

  useEffect(() => {
    fetchData();

    socket.on('matchUpdate', (updatedMatch) => {
      fetchData();
    });

    return () => {
      socket.off('matchUpdate');
    };
  }, []);

  const fetchData = async () => {
    try {
      const [liveRes, matchesRes, teamsRes] = await Promise.all([
        matchAPI.getLiveMatches(),
        matchAPI.getAll(),
        teamAPI.getAll()
      ]);

      setLiveMatches(liveRes.data);

      const upcoming = matchesRes.data.filter(m => m.status === 'scheduled');
      setUpcomingMatches(upcoming.slice(0, 5));

      setStats({
        totalTeams: teamsRes.data.length,
        totalMatches: matchesRes.data.length,
        liveMatches: liveRes.data.length
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  return (
    <div className="container">
      <h1 style={{ color: 'white', marginBottom: '2rem' }}>Tournament Dashboard</h1>

      <div className="dashboard-grid">
        <div className="stat-card">
          <h3>{stats.totalTeams}</h3>
          <p>Total Teams</p>
        </div>
        <div className="stat-card">
          <h3>{stats.totalMatches}</h3>
          <p>Total Matches</p>
        </div>
        <div className="stat-card">
          <h3>{stats.liveMatches}</h3>
          <p>Live Matches</p>
        </div>
      </div>

      {liveMatches.length > 0 && (
        <div className="card">
          <div className="card-header">Live Matches</div>
          {liveMatches.map(match => (
            <div key={match._id} className="live-score">
              <span className="live-badge">LIVE</span>
              <h3>Match {match.matchNumber}</h3>
              <div className="score-display">
                <div className="team-score">
                  <h3>{match.team1?.shortName || 'Team 1'}</h3>
                  <div className="score">
                    {match.innings[0] ? `${match.innings[0].runs}/${match.innings[0].wickets}` : '0/0'}
                  </div>
                  <p>{match.innings[0] ? `${match.innings[0].overs.toFixed(1)} overs` : ''}</p>
                </div>
                <div>vs</div>
                <div className="team-score">
                  <h3>{match.team2?.shortName || 'Team 2'}</h3>
                  <div className="score">
                    {match.innings[1] ? `${match.innings[1].runs}/${match.innings[1].wickets}` : 'Yet to bat'}
                  </div>
                  <p>{match.innings[1] ? `${match.innings[1].overs.toFixed(1)} overs` : ''}</p>
                </div>
              </div>
              <Link to={`/match/${match._id}`}>
                <button className="btn btn-primary" style={{ marginTop: '1rem' }}>
                  View Match
                </button>
              </Link>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-header">Upcoming Matches</div>
        {upcomingMatches.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Match #</th>
                <th>Teams</th>
                <th>Venue</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {upcomingMatches.map(match => (
                <tr key={match._id}>
                  <td>{match.matchNumber}</td>
                  <td>{match.team1?.name || 'Unknown'} vs {match.team2?.name || 'Unknown'}</td>
                  <td>{match.venue}</td>
                  <td>{new Date(match.date).toLocaleDateString()}</td>
                  <td>
                    <Link to={`/match/${match._id}`}>
                      <button className="btn btn-primary">View</button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No upcoming matches</p>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
