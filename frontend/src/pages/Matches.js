import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { matchAPI, teamAPI, tournamentAPI } from '../services/api';

function Matches() {
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    tournament: '',
    matchType: 'group',
    groupName: 'Group A',
    knockoutMatchId: 'QF1',
    team1: '',
    team2: '',
    matchNumber: '',
    date: ''
  });

  useEffect(() => {
    fetchMatches();
    fetchTeams();
    fetchTournaments();
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

  const fetchTournaments = async () => {
    try {
      const response = await tournamentAPI.getAll();
      setTournaments(response.data);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    }
  };

  const getSelectedTournament = () => {
    return tournaments.find(t => t._id === formData.tournament);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.tournament) {
      alert('Please select a tournament');
      return;
    }
    if (!formData.team1 || !formData.team2) {
      alert('Please select both teams');
      return;
    }
    if (formData.team1 === formData.team2) {
      alert('Teams must be different');
      return;
    }
    try {
      await tournamentAPI.addMatch(formData.tournament, {
        matchType: formData.matchType,
        team1: formData.team1,
        team2: formData.team2,
        groupName: formData.groupName,
        knockoutMatchId: formData.knockoutMatchId,
        matchNumber: formData.matchNumber ? parseInt(formData.matchNumber) : null,
        date: formData.date || null
      });
      setFormData({
        tournament: '',
        matchType: 'group',
        groupName: 'Group A',
        knockoutMatchId: 'QF1',
        team1: '',
        team2: '',
        matchNumber: '',
        date: ''
      });
      setShowForm(false);
      fetchMatches();
      alert('Match added successfully!');
    } catch (error) {
      console.error('Error creating match:', error);
      alert(error.response?.data?.message || 'Error creating match');
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
              setFormData({ tournament: '', matchType: 'group', groupName: 'Group A', knockoutMatchId: 'QF1', team1: '', team2: '', matchNumber: '', date: '' });
            }}
          >
            {showForm ? 'Cancel' : 'Add Match'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginBottom: '2rem', padding: '1rem', background: '#f9fafb', borderRadius: '5px' }}>
            <div className="form-group">
              <label className="form-label">Tournament</label>
              <select
                className="form-select"
                value={formData.tournament}
                onChange={(e) => setFormData({ ...formData, tournament: e.target.value })}
                required
              >
                <option value="">Select Tournament</option>
                {tournaments.map(tournament => (
                  <option key={tournament._id} value={tournament._id}>
                    {tournament.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Match Type</label>
              <select
                className="form-select"
                value={formData.matchType}
                onChange={(e) => setFormData({ ...formData, matchType: e.target.value })}
                required
              >
                <option value="group">Group Match</option>
                <option value="quarterfinal">Quarter Final</option>
                <option value="semifinal">Semi Final</option>
                <option value="final">Final</option>
              </select>
            </div>
            {formData.matchType === 'group' && getSelectedTournament() && (
              <div className="form-group">
                <label className="form-label">Group</label>
                <select
                  className="form-select"
                  value={formData.groupName}
                  onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                  required
                >
                  {getSelectedTournament().groups?.map(group => (
                    <option key={group.name} value={group.name}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {(formData.matchType === 'quarterfinal' || formData.matchType === 'semifinal') && (
              <div className="form-group">
                <label className="form-label">Match Slot</label>
                <select
                  className="form-select"
                  value={formData.knockoutMatchId}
                  onChange={(e) => setFormData({ ...formData, knockoutMatchId: e.target.value })}
                  required
                >
                  {formData.matchType === 'quarterfinal' ? (
                    <>
                      <option value="QF1">QF1</option>
                      <option value="QF2">QF2</option>
                      <option value="QF3">QF3</option>
                      <option value="QF4">QF4</option>
                    </>
                  ) : (
                    <>
                      <option value="SF1">SF1</option>
                      <option value="SF2">SF2</option>
                    </>
                  )}
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Match Number (optional - auto-generated if empty)</label>
              <input
                type="number"
                className="form-control"
                value={formData.matchNumber}
                onChange={(e) => setFormData({ ...formData, matchNumber: e.target.value })}
                placeholder="Leave empty for auto-generated"
                min="1"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Scheduled Date (optional)</label>
              <input
                type="date"
                className="form-control"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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
            <button type="submit" className="btn btn-success">
              Create Match
            </button>
          </form>
        )}

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Match #</th>
                <th>Teams</th>
                <th>Date</th>
                <th>Status</th>
                <th>Result</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {matches.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
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
    </div>
  );
}

export default Matches;
