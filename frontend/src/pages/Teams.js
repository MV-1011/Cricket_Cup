import React, { useState, useEffect } from 'react';
import { teamAPI, playerAPI, groupAPI } from '../services/api';

function Teams() {
  const [teams, setTeams] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    logo: '',
    group: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [playerFormData, setPlayerFormData] = useState({
    sid: '',
    name: '',
    role: 'Batsman'
  });
  const [editingPlayerId, setEditingPlayerId] = useState(null);

  useEffect(() => {
    fetchTeams();
    fetchGroups();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await teamAPI.getAll();
      setTeams(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching teams:', error);
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await groupAPI.getAll();
      setGroups(response.data);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await teamAPI.update(editingId, formData);
      } else {
        await teamAPI.create(formData);
      }
      setFormData({ name: '', logo: '', group: groups.length > 0 ? groups[0].name : '' });
      setEditingId(null);
      setShowForm(false);
      fetchTeams();
    } catch (error) {
      console.error('Error saving team:', error);
      alert('Error saving team');
    }
  };

  const handleEdit = (team) => {
    setFormData({
      name: team.name,
      logo: team.logo,
      group: team.group || ''
    });
    setEditingId(team._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this team?')) {
      try {
        await teamAPI.delete(id);
        fetchTeams();
      } catch (error) {
        console.error('Error deleting team:', error);
        alert('Error deleting team');
      }
    }
  };

  const handleExpandTeam = async (teamId) => {
    if (expandedTeamId === teamId) {
      setExpandedTeamId(null);
      setPlayers([]);
      setShowPlayerForm(false);
    } else {
      setExpandedTeamId(teamId);
      await fetchTeamPlayers(teamId);
      setShowPlayerForm(false);
    }
  };

  const fetchTeamPlayers = async (teamId) => {
    try {
      const response = await playerAPI.getAll();
      const teamPlayers = response.data.filter(p => p.team?._id === teamId);
      setPlayers(teamPlayers);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const handlePlayerSubmit = async (e) => {
    e.preventDefault();
    try {
      const playerData = {
        ...playerFormData,
        team: expandedTeamId
      };

      if (editingPlayerId) {
        await playerAPI.update(editingPlayerId, playerData);
      } else {
        await playerAPI.create(playerData);
      }

      setPlayerFormData({ sid: '', name: '', role: 'Batsman' });
      setEditingPlayerId(null);
      // Only close form when editing, keep open for adding new players
      if (editingPlayerId) {
        setShowPlayerForm(false);
      }
      await fetchTeamPlayers(expandedTeamId);
      fetchTeams();
    } catch (error) {
      console.error('Error saving player:', error);
      alert('Error saving player');
    }
  };

  const handleEditPlayer = (player) => {
    setPlayerFormData({
      sid: player.sid || '',
      name: player.name,
      role: player.role
    });
    setEditingPlayerId(player._id);
    setShowPlayerForm(true);
  };

  const handleDeletePlayer = async (playerId) => {
    try {
      await playerAPI.delete(playerId);
      await fetchTeamPlayers(expandedTeamId);
      fetchTeams();
    } catch (error) {
      console.error('Error deleting player:', error);
      alert('Error deleting player');
    }
  };

  if (loading) {
    return <div className="loading">Loading teams...</div>;
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Teams Management</span>
          <button
            className="btn btn-primary"
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              setFormData({ name: '', logo: '', group: '' });
            }}
          >
            {showForm ? 'Cancel' : 'Add Team'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginBottom: '2rem', padding: '1rem', background: '#f9fafb', borderRadius: '5px' }}>
            <div className="form-group">
              <label className="form-label">Team Name</label>
              <input
                type="text"
                className="form-control"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Logo URL (optional)</label>
              <input
                type="text"
                className="form-control"
                value={formData.logo}
                onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Group (optional)</label>
              <select
                className="form-control"
                value={formData.group}
                onChange={(e) => setFormData({ ...formData, group: e.target.value })}
              >
                <option value="">No Group</option>
                {groups.map(group => (
                  <option key={group._id} value={group.name}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-success">
              {editingId ? 'Update Team' : 'Create Team'}
            </button>
          </form>
        )}

        <div style={{ marginTop: '2rem' }}>
          {teams.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
              No teams yet. Click "Add Team" to create your first team!
            </p>
          ) : null}
          {teams.map((team, index) => (
            <div key={team._id} style={{
              marginBottom: '1.5rem',
              border: expandedTeamId === team._id ? '3px solid #1a2a6c' : '2px solid #e5e7eb',
              borderRadius: '15px',
              overflow: 'hidden',
              boxShadow: expandedTeamId === team._id ? '0 8px 32px rgba(26, 42, 108, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.25rem 1.5rem',
                background: expandedTeamId === team._id
                  ? 'linear-gradient(135deg, #1a2a6c 0%, #b21f1f 100%)'
                  : 'linear-gradient(135deg, #f8fafc 0%, #e6f2ff 100%)',
                color: expandedTeamId === team._id ? 'white' : '#1a1f3a',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                borderBottom: expandedTeamId === team._id ? '3px solid #fdbb2d' : 'none'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flex: 1 }} onClick={() => handleExpandTeam(team._id)}>
                  <div style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color: expandedTeamId === team._id ? 'white' : '#6b7280',
                    minWidth: '40px',
                    textAlign: 'center'
                  }}>
                    {index + 1}
                  </div>
                  <div>
                    <strong style={{ fontSize: '1.3rem' }}>{team.name}</strong>
                    {expandedTeamId !== team._id && (
                      <span style={{
                        marginLeft: '1rem',
                        fontSize: '0.85rem',
                        opacity: 0.7,
                        fontStyle: 'italic'
                      }}>
                        👆 Click to manage players
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem' }}>
                    <span>Players: <strong>{team.players?.length || 0}/8</strong></span>
                    <span>Matches: <strong>{team.matchesPlayed}</strong></span>
                    <span>Won: <strong>{team.matchesWon}</strong></span>
                    <span>Points: <strong>{team.points}</strong></span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(team);
                    }}
                  >
                    Edit Team
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(team._id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {expandedTeamId === team._id && (
                <div style={{
                  padding: '2rem',
                  background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
                  borderTop: '3px solid #fdbb2d'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h4 style={{
                      color: '#1a2a6c',
                      fontSize: '1.3rem',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Team Players ({players.length}/8)
                    </h4>
                    <button
                      className="btn btn-success"
                      onClick={() => {
                        if (!showPlayerForm) {
                          setShowPlayerForm(true);
                          setEditingPlayerId(null);
                          setPlayerFormData({ sid: '', name: '', role: 'Batsman' });
                        } else {
                          setShowPlayerForm(false);
                        }
                      }}
                    >
                      {showPlayerForm ? 'Done' : '+ Add Player'}
                    </button>
                  </div>

                  {showPlayerForm && (
                    <form onSubmit={handlePlayerSubmit} style={{
                      marginBottom: '1.5rem',
                      padding: '1.5rem',
                      background: 'linear-gradient(135deg, #e6f2ff, #fff5e6)',
                      borderRadius: '10px',
                      border: '2px solid rgba(26, 42, 108, 0.2)'
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                          <label className="form-label">SID</label>
                          <input
                            type="number"
                            className="form-control"
                            value={playerFormData.sid}
                            onChange={(e) => setPlayerFormData({ ...playerFormData, sid: e.target.value })}
                            required
                            placeholder="Player ID"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Player Name</label>
                          <input
                            type="text"
                            className="form-control"
                            value={playerFormData.name}
                            onChange={(e) => setPlayerFormData({ ...playerFormData, name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Role</label>
                          <select
                            className="form-select"
                            value={playerFormData.role}
                            onChange={(e) => setPlayerFormData({ ...playerFormData, role: e.target.value })}
                            required
                          >
                            <option value="Batsman">Batsman</option>
                            <option value="Bowler">Bowler</option>
                            <option value="All-rounder">All-rounder</option>
                          </select>
                        </div>
                      </div>
                      <button type="submit" className="btn btn-success" style={{ marginTop: '1rem' }}>
                        {editingPlayerId ? 'Update Player' : 'Add Player'}
                      </button>
                    </form>
                  )}

                  {players.length > 0 ? (
                    <table className="table">
                      <thead>
                        <tr>
                          <th>SID</th>
                          <th>Name</th>
                          <th>Role</th>
                          <th>Batting Avg</th>
                          <th>Bowling Avg</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {players.map((player) => (
                          <tr key={player._id}>
                            <td><strong>{player.sid}</strong></td>
                            <td><strong>{player.name}</strong></td>
                            <td>{player.role}</td>
                            <td>{player.battingStats?.average || '0.00'}</td>
                            <td>{player.bowlingStats?.average || '0.00'}</td>
                            <td>
                              <button
                                className="btn btn-primary"
                                style={{ marginRight: '0.5rem', padding: '0.5rem 1rem' }}
                                onClick={() => handleEditPlayer(player)}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-danger"
                                style={{ padding: '0.5rem 1rem' }}
                                onClick={() => handleDeletePlayer(player._id)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      padding: '3rem',
                      background: 'linear-gradient(135deg, #fff5e6, #ffe6e6)',
                      borderRadius: '10px',
                      border: '2px dashed rgba(178, 31, 31, 0.3)'
                    }}>
                      <p style={{
                        color: '#b21f1f',
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        marginBottom: '0.5rem'
                      }}>
                        No players added yet
                      </p>
                      <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
                        Click the "Add Player" button above to add players to this team
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Teams;
