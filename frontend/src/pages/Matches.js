import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { matchAPI, teamAPI } from '../services/api';

function Matches() {
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    matchNumber: '',
    team1: '',
    team2: '',
    date: '',
    time: '',
    maxOvers: 8
  });

  useEffect(() => {
    fetchMatches();
    fetchTeams();
  }, []);

  const fetchMatches = async () => {
    try {
      const response = await matchAPI.getAll();
      setMatches(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching matches:', error);
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await teamAPI.getAll();
      setTeams(response.data);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await matchAPI.create(formData);
      setFormData({
        matchNumber: '',
        team1: '',
        team2: '',
        date: '',
        time: '',
        maxOvers: 8
      });
      setShowForm(false);
      fetchMatches();
    } catch (error) {
      console.error('Error creating match:', error);
      alert('Error creating match');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this match?')) {
      try {
        await matchAPI.delete(id);
        fetchMatches();
      } catch (error) {
        console.error('Error deleting match:', error);
        alert('Error deleting match');
      }
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      scheduled: '#6b7280',
      live: '#10b981',
      completed: '#3b82f6'
    };
    return {
      background: colors[status],
      color: 'white',
      padding: '0.25rem 0.75rem',
      borderRadius: '20px',
      fontSize: '0.875rem',
      fontWeight: 'bold'
    };
  };

  if (loading) {
    return <div className="loading">Loading matches...</div>;
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Matches</span>
          <button
            className="btn btn-primary"
            onClick={() => {
              setShowForm(!showForm);
              setFormData({ matchNumber: '', team1: '', team2: '', date: '', time: '', maxOvers: 8 });
            }}
          >
            {showForm ? 'Cancel' : 'Add Match'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginBottom: '2rem', padding: '1rem', background: '#f9fafb', borderRadius: '5px' }}>
            <div className="form-group">
              <label className="form-label">Match Number</label>
              <input
                type="number"
                className="form-control"
                value={formData.matchNumber}
                onChange={(e) => setFormData({ ...formData, matchNumber: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Team 1</label>
              <select
                className="form-select"
                value={formData.team1}
                onChange={(e) => setFormData({ ...formData, team1: e.target.value })}
                required
              >
                <option value="">Select Team 1</option>
                {teams.map(team => (
                  <option key={team._id} value={team._id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Team 2</label>
              <select
                className="form-select"
                value={formData.team2}
                onChange={(e) => setFormData({ ...formData, team2: e.target.value })}
                required
              >
                <option value="">Select Team 2</option>
                {teams.map(team => (
                  <option key={team._id} value={team._id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-control"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Time</label>
              <input
                type="time"
                className="form-control"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Max Overs</label>
              <input
                type="number"
                className="form-control"
                value={formData.maxOvers}
                onChange={(e) => setFormData({ ...formData, maxOvers: e.target.value })}
                min="1"
                max="20"
                required
              />
            </div>
            <button type="submit" className="btn btn-success">
              Create Match
            </button>
          </form>
        )}

        <table className="table">
          <thead>
            <tr>
              <th>Match #</th>
              <th>Teams</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
              <th>Result</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {matches.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  No matches found. Click "Add Match" to create your first match.
                </td>
              </tr>
            ) : (
              matches.map(match => (
                <tr key={match._id}>
                  <td><strong>{match.matchNumber}</strong></td>
                  <td>
                    {match.team1?.name || 'Unknown'} vs {match.team2?.name || 'Unknown'}
                  </td>
                  <td>{new Date(match.date).toLocaleDateString()}</td>
                  <td>{match.time || '-'}</td>
                  <td>
                    <span style={getStatusBadge(match.status)}>
                      {match.status.toUpperCase()}
                    </span>
                  </td>
                  <td>{match.resultText || '-'}</td>
                  <td>
                    <Link to={`/match/${match._id}`}>
                      <button className="btn btn-primary" style={{ marginRight: '0.5rem' }}>
                        {match.status === 'scheduled' ? 'Start' : 'View'}
                      </button>
                    </Link>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDelete(match._id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Matches;
