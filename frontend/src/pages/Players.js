import React, { useState, useEffect } from 'react';
import { playerAPI, teamAPI } from '../services/api';

function Players() {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    sid: '',
    team: ''
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchPlayers();
    fetchTeams();
  }, []);

  const fetchPlayers = async () => {
    try {
      const response = await playerAPI.getAll();
      setPlayers(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching players:', error);
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
      if (editingId) {
        await playerAPI.update(editingId, formData);
      } else {
        await playerAPI.create(formData);
      }
      setFormData({ name: '', sid: '', team: '' });
      setEditingId(null);
      setShowForm(false);
      fetchPlayers();
    } catch (error) {
      console.error('Error saving player:', error);
      alert('Error saving player');
    }
  };

  const handleEdit = (player) => {
    setFormData({
      name: player.name,
      sid: player.sid || '',
      team: player.team?._id || ''
    });
    setEditingId(player._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this player?')) {
      try {
        await playerAPI.delete(id);
        fetchPlayers();
      } catch (error) {
        console.error('Error deleting player:', error);
        alert('Error deleting player');
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading players...</div>;
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Players Management</span>
          <button
            className="btn btn-primary"
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              setFormData({ name: '', sid: '', team: '' });
            }}
          >
            {showForm ? 'Cancel' : 'Add Player'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginBottom: '2rem', padding: '1rem', background: '#f9fafb', borderRadius: '5px' }}>
            <div className="form-group">
              <label className="form-label">Player Name</label>
              <input
                type="text"
                className="form-control"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">SID (Student ID)</label>
              <input
                type="text"
                className="form-control"
                value={formData.sid}
                onChange={(e) => setFormData({ ...formData, sid: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Team</label>
              <select
                className="form-select"
                value={formData.team}
                onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                required
              >
                <option value="">Select Team</option>
                {teams.map(team => (
                  <option key={team._id} value={team._id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-success">
              {editingId ? 'Update Player' : 'Create Player'}
            </button>
          </form>
        )}

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>SID</th>
                <th>Team</th>
                <th>Batting Avg</th>
                <th>Bowling Avg</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    No players found. Click "Add Player" to create your first player.
                  </td>
                </tr>
              ) : (
                players.map(player => (
                  <tr key={player._id}>
                    <td><strong>{player.name}</strong></td>
                    <td>{player.sid || '-'}</td>
                    <td>{player.team?.name || 'N/A'}</td>
                    <td>{player.battingStats.average || '0.00'}</td>
                    <td>{player.bowlingStats.average || '0.00'}</td>
                    <td>
                      <button
                        className="btn btn-primary"
                        style={{ marginRight: '0.5rem' }}
                        onClick={() => handleEdit(player)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDelete(player._id)}
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

export default Players;
