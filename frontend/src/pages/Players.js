import React, { useState, useEffect } from 'react';
import { playerAPI, teamAPI } from '../services/api';

function Players() {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    team: '',
    role: 'Batsman',
    jerseyNumber: ''
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
      setFormData({ name: '', team: '', role: 'Batsman', jerseyNumber: '' });
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
      team: player.team?._id || '',
      role: player.role,
      jerseyNumber: player.jerseyNumber
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
              setFormData({ name: '', team: '', role: 'Batsman', jerseyNumber: '' });
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
            <div className="form-group">
              <label className="form-label">Role</label>
              <select
                className="form-select"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                required
              >
                <option value="Batsman">Batsman</option>
                <option value="Bowler">Bowler</option>
                <option value="All-rounder">All-rounder</option>
                <option value="Wicket-keeper">Wicket-keeper</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Jersey Number</label>
              <input
                type="number"
                className="form-control"
                value={formData.jerseyNumber}
                onChange={(e) => setFormData({ ...formData, jerseyNumber: e.target.value })}
                min="1"
                max="99"
              />
            </div>
            <button type="submit" className="btn btn-success">
              {editingId ? 'Update Player' : 'Create Player'}
            </button>
          </form>
        )}

        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Team</th>
              <th>Role</th>
              <th>Jersey #</th>
              <th>Batting Avg</th>
              <th>Bowling Avg</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {players.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  No players found. Click "Add Player" to create your first player.
                </td>
              </tr>
            ) : (
              players.map(player => (
                <tr key={player._id}>
                  <td><strong>{player.name}</strong></td>
                  <td>{player.team?.name || 'N/A'}</td>
                  <td>{player.role}</td>
                  <td>{player.jerseyNumber}</td>
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
  );
}

export default Players;
