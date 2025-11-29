import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tournamentAPI, teamAPI } from '../services/api';

function Tournament() {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showGroupSetup, setShowGroupSetup] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [editingMatch, setEditingMatch] = useState(null);
  const [matchEditData, setMatchEditData] = useState({ team1: '', team2: '' });
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [newMatchData, setNewMatchData] = useState({
    matchType: 'group',
    team1: '',
    team2: '',
    groupName: 'Group A',
    knockoutMatchId: 'QF1'
  });

  // Create form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    teamsPerGroup: 4,
    totalGroups: 4,
    maxOversPerMatch: 8
  });

  // Group setup state
  const [groupSetup, setGroupSetup] = useState([
    { name: 'Group A', teams: [] },
    { name: 'Group B', teams: [] },
    { name: 'Group C', teams: [] },
    { name: 'Group D', teams: [] }
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tournamentsRes, teamsRes] = await Promise.all([
          tournamentAPI.getAll(),
          teamAPI.getAll()
        ]);
        setTournaments(tournamentsRes.data);
        setTeams(teamsRes.data);

        // Auto-select if only one tournament exists
        if (tournamentsRes.data.length === 1) {
          const detailsRes = await tournamentAPI.getById(tournamentsRes.data[0]._id);
          setSelectedTournament(detailsRes.data);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fetchTournamentDetails = async (id) => {
    try {
      const response = await tournamentAPI.getById(id);
      setSelectedTournament(response.data);
    } catch (error) {
      console.error('Error fetching tournament:', error);
    }
  };

  const handleCreateTournament = async (e) => {
    e.preventDefault();
    try {
      const response = await tournamentAPI.create({
        name: formData.name,
        description: formData.description,
        format: {
          teamsPerGroup: formData.teamsPerGroup,
          totalGroups: formData.totalGroups,
          maxOversPerMatch: formData.maxOversPerMatch
        }
      });
      setTournaments([...tournaments, response.data]);
      setShowCreateForm(false);
      setFormData({ name: '', description: '', teamsPerGroup: 4, totalGroups: 4, maxOversPerMatch: 8 });
      await fetchTournamentDetails(response.data._id);
    } catch (error) {
      console.error('Error creating tournament:', error);
      alert('Failed to create tournament');
    }
  };

  const handleSetupGroups = async () => {
    if (!selectedTournament) return;

    // Validate that all groups have teams
    const emptyGroups = groupSetup.filter(g => g.teams.length === 0);
    if (emptyGroups.length > 0) {
      alert('Please assign teams to all groups');
      return;
    }

    try {
      await tournamentAPI.setupGroups(selectedTournament._id, { groups: groupSetup });
      await fetchTournamentDetails(selectedTournament._id);
      setShowGroupSetup(false);
      alert('Groups setup successfully!');
    } catch (error) {
      console.error('Error setting up groups:', error);
      alert('Failed to setup groups');
    }
  };

  const handleGenerateGroupMatches = async () => {
    if (!selectedTournament) return;

    if (!window.confirm('This will generate all group stage matches. Continue?')) return;

    try {
      const response = await tournamentAPI.generateGroupMatches(selectedTournament._id);
      await fetchTournamentDetails(selectedTournament._id);
      alert(`Generated ${response.data.matches.length} group stage matches!`);
    } catch (error) {
      console.error('Error generating matches:', error);
      alert(error.response?.data?.message || 'Failed to generate matches');
    }
  };

  const handleGenerateKnockout = async () => {
    if (!selectedTournament) return;

    if (!window.confirm('This will generate the knockout bracket based on group standings. Continue?')) return;

    try {
      await tournamentAPI.generateKnockoutBracket(selectedTournament._id);
      await fetchTournamentDetails(selectedTournament._id);
      alert('Knockout bracket generated successfully!');
    } catch (error) {
      console.error('Error generating knockout:', error);
      alert(error.response?.data?.message || 'Failed to generate knockout bracket');
    }
  };

  const handleRegenerateGroupMatches = async () => {
    if (!selectedTournament) return;

    if (!window.confirm('This will DELETE all existing group matches and regenerate them. All match data will be lost. Continue?')) return;

    try {
      const response = await tournamentAPI.regenerateGroupMatches(selectedTournament._id);
      await fetchTournamentDetails(selectedTournament._id);
      alert(`Regenerated ${response.data.matches.length} group stage matches!`);
    } catch (error) {
      console.error('Error regenerating matches:', error);
      alert(error.response?.data?.message || 'Failed to regenerate matches');
    }
  };

  const handleRegenerateKnockout = async () => {
    if (!selectedTournament) return;

    if (!window.confirm('This will DELETE all existing knockout matches and regenerate them based on current group standings. Continue?')) return;

    try {
      await tournamentAPI.regenerateKnockoutBracket(selectedTournament._id);
      await fetchTournamentDetails(selectedTournament._id);
      alert('Knockout bracket regenerated successfully!');
    } catch (error) {
      console.error('Error regenerating knockout:', error);
      alert(error.response?.data?.message || 'Failed to regenerate knockout bracket');
    }
  };

  const handleClearKnockout = async () => {
    if (!selectedTournament) return;

    if (!window.confirm('This will DELETE all knockout matches (QF, SF, Final) and clear the knockout bracket. Continue?')) return;

    try {
      await tournamentAPI.clearKnockout(selectedTournament._id);
      await fetchTournamentDetails(selectedTournament._id);
      alert('Knockout bracket cleared successfully!');
    } catch (error) {
      console.error('Error clearing knockout:', error);
      alert(error.response?.data?.message || 'Failed to clear knockout bracket');
    }
  };

  const handleDeleteTournament = async () => {
    if (!selectedTournament) return;

    if (!window.confirm(`Are you sure you want to delete "${selectedTournament.name}"? This will also delete all associated matches. This action cannot be undone!`)) return;

    try {
      await tournamentAPI.delete(selectedTournament._id);
      setTournaments(tournaments.filter(t => t._id !== selectedTournament._id));
      setSelectedTournament(null);
      alert('Tournament deleted successfully!');
    } catch (error) {
      console.error('Error deleting tournament:', error);
      alert(error.response?.data?.message || 'Failed to delete tournament');
    }
  };

  const handleResetTournament = async () => {
    if (!selectedTournament) return;

    if (!window.confirm(`Are you sure you want to reset "${selectedTournament.name}"? This will DELETE ALL MATCHES (group stage and knockout) and reset all standings. The groups and teams will be preserved. This action cannot be undone!`)) return;

    try {
      await tournamentAPI.resetTournament(selectedTournament._id);
      await fetchTournamentDetails(selectedTournament._id);
      alert('Tournament reset successfully! All matches have been removed.');
    } catch (error) {
      console.error('Error resetting tournament:', error);
      alert(error.response?.data?.message || 'Failed to reset tournament');
    }
  };

  const handleResetGroupStage = async () => {
    if (!selectedTournament) return;

    if (!window.confirm('Are you sure you want to reset the GROUP STAGE? This will DELETE all group matches and reset all standings to zero. This action cannot be undone!')) return;

    try {
      await tournamentAPI.resetGroupStage(selectedTournament._id);
      await fetchTournamentDetails(selectedTournament._id);
      alert('Group stage reset successfully! All group matches have been removed.');
    } catch (error) {
      console.error('Error resetting group stage:', error);
      alert(error.response?.data?.message || 'Failed to reset group stage');
    }
  };

  const handleResetKnockoutStage = async () => {
    if (!selectedTournament) return;

    if (!window.confirm('Are you sure you want to reset the KNOCKOUT STAGE? This will DELETE all knockout matches (QF, SF, Final) and clear the bracket. This action cannot be undone!')) return;

    try {
      await tournamentAPI.resetKnockoutStage(selectedTournament._id);
      await fetchTournamentDetails(selectedTournament._id);
      alert('Knockout stage reset successfully! All knockout matches have been removed.');
    } catch (error) {
      console.error('Error resetting knockout stage:', error);
      alert(error.response?.data?.message || 'Failed to reset knockout stage');
    }
  };

  const handleAddMatch = async () => {
    if (!selectedTournament) return;
    if (!newMatchData.team1 || !newMatchData.team2) {
      alert('Please select both teams');
      return;
    }
    if (newMatchData.team1 === newMatchData.team2) {
      alert('Teams must be different');
      return;
    }

    try {
      await tournamentAPI.addMatch(selectedTournament._id, newMatchData);
      await fetchTournamentDetails(selectedTournament._id);
      setShowAddMatch(false);
      setNewMatchData({
        matchType: 'group',
        team1: '',
        team2: '',
        groupName: 'Group A',
        knockoutMatchId: 'QF1'
      });
      alert('Match added successfully!');
    } catch (error) {
      console.error('Error adding match:', error);
      alert(error.response?.data?.message || 'Failed to add match');
    }
  };

  const handleEditMatch = (match, type, knockoutId = null) => {
    setEditingMatch({ match, type, knockoutId });
    setMatchEditData({
      team1: match.team1?._id || match.team1 || '',
      team2: match.team2?._id || match.team2 || ''
    });
  };

  const handleSaveMatchEdit = async () => {
    if (!editingMatch || !selectedTournament) return;

    try {
      if (editingMatch.type === 'group') {
        await tournamentAPI.updateGroupMatch(
          selectedTournament._id,
          editingMatch.match._id,
          matchEditData
        );
      } else {
        await tournamentAPI.updateKnockoutMatch(
          selectedTournament._id,
          editingMatch.knockoutId,
          matchEditData
        );
      }
      await fetchTournamentDetails(selectedTournament._id);
      setEditingMatch(null);
      setMatchEditData({ team1: '', team2: '' });
      alert('Match updated successfully!');
    } catch (error) {
      console.error('Error updating match:', error);
      alert(error.response?.data?.message || 'Failed to update match');
    }
  };

  const handleTeamDrop = (groupIndex, teamId) => {
    // Remove team from any existing group
    const newGroupSetup = groupSetup.map(group => ({
      ...group,
      teams: group.teams.filter(id => id !== teamId)
    }));

    // Add to the target group
    newGroupSetup[groupIndex].teams.push(teamId);
    setGroupSetup(newGroupSetup);
  };

  const getTeamName = (teamId) => {
    const team = teams.find(t => t._id === teamId);
    return team ? team.name : 'TBD';
  };

  const getAssignedTeams = () => {
    return groupSetup.flatMap(g => g.teams);
  };

  const getUnassignedTeams = () => {
    const assigned = getAssignedTeams();
    return teams.filter(t => !assigned.includes(t._id));
  };

  // Knockout Bracket Component
  const KnockoutBracket = ({ knockout }) => {
    if (!knockout) return null;

    const { quarterfinals, semifinals, final } = knockout;

    const MatchCard = ({ match, title }) => {
      const team1Name = match?.team1 ? getTeamName(match.team1._id || match.team1) : match?.team1Source || 'TBD';
      const team2Name = match?.team2 ? getTeamName(match.team2._id || match.team2) : match?.team2Source || 'TBD';
      const winnerName = match?.winner ? getTeamName(match.winner._id || match.winner) : null;
      const status = match?.status || 'pending';

      return (
        <div style={{
          background: status === 'completed' ? 'linear-gradient(135deg, #10b981, #059669)' :
                     status === 'scheduled' || status === 'live' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' :
                     'linear-gradient(135deg, #6b7280, #4b5563)',
          borderRadius: '8px',
          padding: '0.75rem',
          minWidth: '140px',
          color: 'white',
          fontSize: '0.85rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          cursor: match?.match ? 'pointer' : 'default'
        }}
        onClick={() => match?.match && navigate(`/match/${match.match._id || match.match}`)}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center', fontSize: '0.75rem', opacity: 0.9 }}>
            {title}
          </div>
          <div style={{
            padding: '0.4rem',
            background: winnerName && winnerName === team1Name ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
            borderRadius: '4px',
            marginBottom: '0.25rem',
            fontWeight: winnerName && winnerName === team1Name ? 'bold' : 'normal'
          }}>
            {team1Name}
          </div>
          <div style={{
            padding: '0.4rem',
            background: winnerName && winnerName === team2Name ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
            borderRadius: '4px',
            fontWeight: winnerName && winnerName === team2Name ? 'bold' : 'normal'
          }}>
            {team2Name}
          </div>
          {status === 'completed' && winnerName && (
            <div style={{ marginTop: '0.5rem', textAlign: 'center', fontSize: '0.75rem' }}>
              Winner: {winnerName}
            </div>
          )}
        </div>
      );
    };

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '2rem',
        padding: '2rem',
        overflowX: 'auto'
      }}>
        {/* Quarterfinals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h4 style={{ textAlign: 'center', marginBottom: '0.5rem', color: '#374151' }}>Quarterfinals</h4>
          {quarterfinals && quarterfinals.map((qf, i) => (
            <MatchCard key={i} match={qf} title={qf.matchNumber} />
          ))}
        </div>

        {/* Connector Lines */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8rem' }}>
          <div style={{ width: '30px', height: '2px', background: '#9ca3af' }}></div>
          <div style={{ width: '30px', height: '2px', background: '#9ca3af' }}></div>
        </div>

        {/* Semifinals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem', justifyContent: 'center' }}>
          <h4 style={{ textAlign: 'center', marginBottom: '0.5rem', color: '#374151' }}>Semifinals</h4>
          {semifinals && semifinals.map((sf, i) => (
            <MatchCard key={i} match={sf} title={sf.matchNumber} />
          ))}
        </div>

        {/* Connector Lines */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ width: '30px', height: '2px', background: '#9ca3af' }}></div>
        </div>

        {/* Final */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h4 style={{ textAlign: 'center', marginBottom: '0.5rem', color: '#374151' }}>Final</h4>
          {final && <MatchCard match={final} title="FINAL" />}
          {selectedTournament?.champion && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              borderRadius: '8px',
              color: 'white',
              fontWeight: 'bold',
              textAlign: 'center'
            }}>
              CHAMPION: {getTeamName(selectedTournament.champion._id || selectedTournament.champion)}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="loading">Loading tournament data...</div>;
  }

  return (
    <div className="container">
      <h1 style={{
        color: '#1a2a6c',
        marginBottom: '2rem',
        fontSize: '2.5rem',
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: '2px',
        textAlign: 'center',
        background: 'linear-gradient(90deg, #1a2a6c, #b21f1f, #fdbb2d)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }}>
        Tournament Management
      </h1>

      {/* Tournament Selection / Creation */}
      {!selectedTournament && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Tournaments</span>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              style={{
                padding: '0.5rem 1rem',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              + Create Tournament
            </button>
          </div>

          {showCreateForm && (
            <form onSubmit={handleCreateTournament} style={{ padding: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <input
                  type="text"
                  placeholder="Tournament Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #d1d5db', gridColumn: 'span 2' }}
                />
                <input
                  type="number"
                  placeholder="Teams per Group"
                  value={formData.teamsPerGroup}
                  onChange={(e) => setFormData({ ...formData, teamsPerGroup: parseInt(e.target.value) })}
                  min={2}
                  max={8}
                  style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                />
                <input
                  type="number"
                  placeholder="Total Groups"
                  value={formData.totalGroups}
                  onChange={(e) => setFormData({ ...formData, totalGroups: parseInt(e.target.value) })}
                  min={2}
                  max={8}
                  style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                />
                <input
                  type="number"
                  placeholder="Max Overs per Match"
                  value={formData.maxOversPerMatch}
                  onChange={(e) => setFormData({ ...formData, maxOversPerMatch: parseInt(e.target.value) })}
                  min={1}
                  max={50}
                  style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                />
                <textarea
                  placeholder="Description (optional)"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                />
              </div>
              <button
                type="submit"
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem 2rem',
                  background: 'linear-gradient(135deg, #1a2a6c, #2d4a9c)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Create Tournament
              </button>
            </form>
          )}

          {tournaments.length > 0 && (
            <div style={{ padding: '1rem' }}>
              {tournaments.map(t => (
                <div
                  key={t._id}
                  onClick={() => fetchTournamentDetails(t._id)}
                  style={{
                    padding: '1rem',
                    marginBottom: '0.5rem',
                    background: '#f3f4f6',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <strong>{t.name}</strong>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                      Status: {t.status}
                    </div>
                  </div>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    background: t.status === 'completed' ? '#10b981' :
                               t.status === 'knockout-stage' ? '#f59e0b' :
                               t.status === 'group-stage' ? '#3b82f6' : '#6b7280',
                    color: 'white',
                    borderRadius: '9999px',
                    fontSize: '0.75rem'
                  }}>
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {tournaments.length === 0 && !showCreateForm && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
              No tournaments found. Create one to get started!
            </div>
          )}
        </div>
      )}

      {/* Selected Tournament View */}
      {selectedTournament && (
        <>
          {/* Tournament Header */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{
              padding: '1.5rem',
              background: 'linear-gradient(135deg, #1a2a6c, #2d4a9c)',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ margin: 0 }}>{selectedTournament.name}</h2>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '9999px',
                  fontSize: '0.85rem'
                }}>
                  {selectedTournament.status}
                </span>
                <button
                  onClick={handleResetTournament}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Reset
                </button>
                <button
                  onClick={handleDeleteTournament}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Delete
                </button>
                <button
                  onClick={() => setSelectedTournament(null)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Back
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {['overview', 'groups', 'knockout', 'matches'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: activeTab === tab ? 'linear-gradient(135deg, #1a2a6c, #2d4a9c)' : '#e5e7eb',
                  color: activeTab === tab ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: activeTab === tab ? 'bold' : 'normal',
                  textTransform: 'capitalize'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="card">
              <div className="card-header">Tournament Overview</div>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div style={{ padding: '1rem', background: '#f3f4f6', borderRadius: '8px' }}>
                    <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>Total Groups</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1a2a6c' }}>
                      {selectedTournament.groups?.length || 0}
                    </div>
                  </div>
                  <div style={{ padding: '1rem', background: '#f3f4f6', borderRadius: '8px' }}>
                    <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>Teams per Group</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1a2a6c' }}>
                      {selectedTournament.format?.teamsPerGroup || 4}
                    </div>
                  </div>
                  <div style={{ padding: '1rem', background: '#f3f4f6', borderRadius: '8px' }}>
                    <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>Overs per Match</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1a2a6c' }}>
                      {selectedTournament.format?.maxOversPerMatch || 8}
                    </div>
                  </div>
                  <div style={{ padding: '1rem', background: '#f3f4f6', borderRadius: '8px' }}>
                    <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>Status</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1a2a6c' }}>
                      {selectedTournament.status}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {selectedTournament.status === 'planned' && (
                    <>
                      <button
                        onClick={() => setShowGroupSetup(true)}
                        style={{
                          padding: '0.75rem 1.5rem',
                          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        Setup Groups
                      </button>
                      {selectedTournament.groups?.length > 0 && (
                        <button
                          onClick={handleGenerateGroupMatches}
                          style={{
                            padding: '0.75rem 1.5rem',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          Generate Group Matches
                        </button>
                      )}
                    </>
                  )}
                  {selectedTournament.status === 'group-stage' && (
                    <button
                      onClick={handleGenerateKnockout}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      Generate Knockout Bracket
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Groups Tab */}
          {activeTab === 'groups' && (
            <div>
              {/* Reset Group Stage Button */}
              {selectedTournament.groups?.some(g => g.matches?.length > 0 || g.standings?.some(s => s.played > 0)) && (
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleResetGroupStage}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Reset Group Stage
                  </button>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {selectedTournament.groups?.map((group, index) => (
                <div key={index} className="card">
                  <div className="card-header" style={{
                    background: 'linear-gradient(135deg, #1a2a6c, #2d4a9c)',
                    color: 'white'
                  }}>
                    {group.name}
                  </div>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Team</th>
                        <th>P</th>
                        <th>W</th>
                        <th>L</th>
                        <th>Pts</th>
                        <th>NRR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.standings && group.standings.length > 0 ? (
                        group.standings
                          .sort((a, b) => b.points - a.points || b.netRunRate - a.netRunRate)
                          .map((standing, i) => (
                            <tr key={i} style={{
                              background: i < 2 ? 'rgba(16, 185, 129, 0.1)' : 'transparent'
                            }}>
                              <td><strong>{i + 1}</strong></td>
                              <td>{getTeamName(standing.team?._id || standing.team)}</td>
                              <td>{standing.played}</td>
                              <td style={{ color: '#10b981', fontWeight: '600' }}>{standing.won}</td>
                              <td style={{ color: '#dc3545', fontWeight: '600' }}>{standing.lost}</td>
                              <td><strong>{standing.points}</strong></td>
                              <td>{standing.netRunRate?.toFixed(2) || '0.00'}</td>
                            </tr>
                          ))
                      ) : group.teams && group.teams.length > 0 ? (
                        group.teams.map((team, i) => (
                          <tr key={i}>
                            <td><strong>{i + 1}</strong></td>
                            <td>{team?.name || getTeamName(team?._id || team)}</td>
                            <td>0</td>
                            <td style={{ color: '#10b981', fontWeight: '600' }}>0</td>
                            <td style={{ color: '#dc3545', fontWeight: '600' }}>0</td>
                            <td><strong>0</strong></td>
                            <td>0.00</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', color: '#9ca3af' }}>
                            No teams in this group
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ))}
              {(!selectedTournament.groups || selectedTournament.groups.length === 0) && (
                <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  No groups configured yet. Go to Overview to setup groups.
                </div>
              )}
              </div>
            </div>
          )}

          {/* Knockout Tab */}
          {activeTab === 'knockout' && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Knockout Bracket</span>
                {selectedTournament.knockout?.quarterfinals?.length > 0 && (
                  <button
                    onClick={handleResetKnockoutStage}
                    style={{
                      padding: '0.4rem 0.8rem',
                      background: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 'bold'
                    }}
                  >
                    Reset Knockout Stage
                  </button>
                )}
              </div>
              {selectedTournament.knockout?.quarterfinals?.length > 0 ? (
                <KnockoutBracket knockout={selectedTournament.knockout} />
              ) : (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                  <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Knockout bracket not generated yet</p>
                  <p>Complete the group stage and generate the knockout bracket from the Overview tab.</p>
                </div>
              )}
            </div>
          )}

          {/* Matches Tab */}
          {activeTab === 'matches' && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Tournament Matches</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setShowAddMatch(true)}
                    style={{
                      padding: '0.4rem 0.8rem',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 'bold'
                    }}
                  >
                    + Add Match
                  </button>
                  {selectedTournament.groups?.some(g => g.matches?.length > 0) && (
                    <button
                      onClick={handleRegenerateGroupMatches}
                      style={{
                        padding: '0.4rem 0.8rem',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      Regenerate Group Matches
                    </button>
                  )}
                  {selectedTournament.knockout?.quarterfinals?.length > 0 && (
                    <>
                      <button
                        onClick={handleRegenerateKnockout}
                        style={{
                          padding: '0.4rem 0.8rem',
                          background: '#f59e0b',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        Regenerate Knockout
                      </button>
                      <button
                        onClick={handleClearKnockout}
                        style={{
                          padding: '0.4rem 0.8rem',
                          background: '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        Clear Knockout
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div style={{ padding: '1rem' }}>
                {/* Group Stage Matches - All combined and sorted by match number */}
                <h4 style={{ color: '#374151', marginBottom: '0.75rem' }}>Group Stage Matches</h4>
                {selectedTournament.groups?.some(g => g.matches?.length > 0) ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    {(() => {
                      // Collect all matches with their group names
                      const allMatches = [];
                      selectedTournament.groups.forEach(group => {
                        (group.matches || []).forEach(m => {
                          allMatches.push({
                            ...m,
                            _id: m._id,
                            matchNumber: m.matchNumber,
                            team1: m.team1,
                            team2: m.team2,
                            status: m.status,
                            groupName: m.groupName || group.name
                          });
                        });
                      });
                      // Sort by matchNumber ascending (1 first)
                      allMatches.sort((a, b) => a.matchNumber - b.matchNumber);
                      return allMatches;
                    })().map((match, mIndex) => (
                        <div
                          key={mIndex}
                          style={{
                            padding: '0.75rem 1rem',
                            background: match.status === 'completed' ? '#dcfce7' :
                                       match.status === 'live' ? '#fef3c7' : '#f3f4f6',
                            borderRadius: '8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <span
                            onClick={() => navigate(`/match/${match._id}`)}
                            style={{ cursor: 'pointer', flex: 1 }}
                          >
                            <strong style={{ color: '#6b7280', marginRight: '0.5rem' }}>#{match.matchNumber}</strong>
                            <strong>{getTeamName(match.team1?._id || match.team1)}</strong>
                            {' vs '}
                            <strong>{getTeamName(match.team2?._id || match.team2)}</strong>
                            <span style={{ color: '#9ca3af', marginLeft: '0.5rem', fontSize: '0.85rem' }}>({match.groupName})</span>
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              background: match.status === 'completed' ? '#10b981' :
                                         match.status === 'live' ? '#f59e0b' : '#6b7280',
                              color: 'white',
                              borderRadius: '9999px',
                              fontSize: '0.75rem'
                            }}>
                              {match.status}
                            </span>
                            {match.status === 'scheduled' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditMatch(match, 'group');
                                }}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  background: '#3b82f6',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem'
                                }}
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div style={{ color: '#9ca3af', fontStyle: 'italic', marginBottom: '1.5rem' }}>No group matches yet</div>
                )}

                {/* Knockout Matches */}
                {selectedTournament.knockout?.quarterfinals?.length > 0 && (
                  <>
                    <h4 style={{ color: '#374151', marginBottom: '0.75rem', marginTop: '2rem' }}>Knockout Matches</h4>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                      {[...selectedTournament.knockout.quarterfinals,
                        ...selectedTournament.knockout.semifinals,
                        selectedTournament.knockout.final].filter(m => m).map((knockoutMatch, index) => (
                        <div
                          key={index}
                          style={{
                            padding: '0.75rem 1rem',
                            background: knockoutMatch.status === 'completed' ? '#dcfce7' :
                                       knockoutMatch.status === 'scheduled' ? '#dbeafe' : '#f3f4f6',
                            borderRadius: '8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <span
                            onClick={() => knockoutMatch.match && navigate(`/match/${knockoutMatch.match._id || knockoutMatch.match}`)}
                            style={{ cursor: knockoutMatch.match ? 'pointer' : 'default', flex: 1 }}
                          >
                            <strong style={{ color: '#6b7280', marginRight: '0.5rem' }}>{knockoutMatch.matchNumber}</strong>
                            <strong>{knockoutMatch.team1 ? getTeamName(knockoutMatch.team1._id || knockoutMatch.team1) : knockoutMatch.team1Source || 'TBD'}</strong>
                            {' vs '}
                            <strong>{knockoutMatch.team2 ? getTeamName(knockoutMatch.team2._id || knockoutMatch.team2) : knockoutMatch.team2Source || 'TBD'}</strong>
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              background: knockoutMatch.status === 'completed' ? '#10b981' :
                                         knockoutMatch.status === 'scheduled' ? '#3b82f6' : '#6b7280',
                              color: 'white',
                              borderRadius: '9999px',
                              fontSize: '0.75rem'
                            }}>
                              {knockoutMatch.status}
                            </span>
                            {knockoutMatch.status === 'scheduled' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditMatch(knockoutMatch, 'knockout', knockoutMatch.matchNumber);
                                }}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  background: '#3b82f6',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem'
                                }}
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Match Edit Modal */}
          {editingMatch && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000
            }}>
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '2rem',
                maxWidth: '500px',
                width: '90%'
              }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Edit Match</h3>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Team 1</label>
                  <select
                    value={matchEditData.team1}
                    onChange={(e) => setMatchEditData({ ...matchEditData, team1: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '4px',
                      border: '1px solid #d1d5db'
                    }}
                  >
                    <option value="">Select Team</option>
                    {teams.map(team => (
                      <option key={team._id} value={team._id}>{team.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Team 2</label>
                  <select
                    value={matchEditData.team2}
                    onChange={(e) => setMatchEditData({ ...matchEditData, team2: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '4px',
                      border: '1px solid #d1d5db'
                    }}
                  >
                    <option value="">Select Team</option>
                    {teams.map(team => (
                      <option key={team._id} value={team._id}>{team.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button
                    onClick={() => {
                      setEditingMatch(null);
                      setMatchEditData({ team1: '', team2: '' });
                    }}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: '#e5e7eb',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveMatchEdit}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Match Modal */}
          {showAddMatch && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000
            }}>
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '2rem',
                maxWidth: '500px',
                width: '90%',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Add New Match</h3>

                {/* Match Type Selection */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Match Type</label>
                  <select
                    value={newMatchData.matchType}
                    onChange={(e) => setNewMatchData({ ...newMatchData, matchType: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '4px',
                      border: '1px solid #d1d5db'
                    }}
                  >
                    <option value="group">Group Match</option>
                    <option value="quarterfinal">Quarterfinal</option>
                    <option value="semifinal">Semifinal</option>
                    <option value="final">Final</option>
                  </select>
                </div>

                {/* Group Selection (only for group matches) */}
                {newMatchData.matchType === 'group' && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Group</label>
                    <select
                      value={newMatchData.groupName}
                      onChange={(e) => setNewMatchData({ ...newMatchData, groupName: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '4px',
                        border: '1px solid #d1d5db'
                      }}
                    >
                      {selectedTournament?.groups?.map((group, index) => (
                        <option key={index} value={group.name}>{group.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Knockout Match ID (for knockout matches) */}
                {newMatchData.matchType === 'quarterfinal' && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Quarterfinal Match</label>
                    <select
                      value={newMatchData.knockoutMatchId}
                      onChange={(e) => setNewMatchData({ ...newMatchData, knockoutMatchId: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '4px',
                        border: '1px solid #d1d5db'
                      }}
                    >
                      <option value="QF1">QF1 (A1 vs B2)</option>
                      <option value="QF2">QF2 (C1 vs D2)</option>
                      <option value="QF3">QF3 (B1 vs A2)</option>
                      <option value="QF4">QF4 (D1 vs C2)</option>
                    </select>
                  </div>
                )}

                {newMatchData.matchType === 'semifinal' && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Semifinal Match</label>
                    <select
                      value={newMatchData.knockoutMatchId}
                      onChange={(e) => setNewMatchData({ ...newMatchData, knockoutMatchId: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '4px',
                        border: '1px solid #d1d5db'
                      }}
                    >
                      <option value="SF1">SF1 (Winner QF1 vs Winner QF2)</option>
                      <option value="SF2">SF2 (Winner QF3 vs Winner QF4)</option>
                    </select>
                  </div>
                )}

                {/* Team 1 Selection */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Team 1</label>
                  <select
                    value={newMatchData.team1}
                    onChange={(e) => setNewMatchData({ ...newMatchData, team1: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '4px',
                      border: '1px solid #d1d5db'
                    }}
                  >
                    <option value="">Select Team</option>
                    {teams.map(team => (
                      <option key={team._id} value={team._id}>{team.name}</option>
                    ))}
                  </select>
                </div>

                {/* Team 2 Selection */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Team 2</label>
                  <select
                    value={newMatchData.team2}
                    onChange={(e) => setNewMatchData({ ...newMatchData, team2: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '4px',
                      border: '1px solid #d1d5db'
                    }}
                  >
                    <option value="">Select Team</option>
                    {teams.map(team => (
                      <option key={team._id} value={team._id}>{team.name}</option>
                    ))}
                  </select>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button
                    onClick={() => {
                      setShowAddMatch(false);
                      setNewMatchData({
                        matchType: 'group',
                        team1: '',
                        team2: '',
                        groupName: 'Group A',
                        knockoutMatchId: 'QF1'
                      });
                    }}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: '#e5e7eb',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddMatch}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Add Match
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Group Setup Modal */}
          {showGroupSetup && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000
            }}>
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '2rem',
                maxWidth: '900px',
                width: '90%',
                maxHeight: '80vh',
                overflow: 'auto'
              }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Setup Groups</h3>

                {/* Unassigned Teams */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ marginBottom: '0.75rem', color: '#374151' }}>Available Teams</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {getUnassignedTeams().map(team => (
                      <div
                        key={team._id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('teamId', team._id)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#e5e7eb',
                          borderRadius: '4px',
                          cursor: 'grab'
                        }}
                      >
                        {team.name}
                      </div>
                    ))}
                    {getUnassignedTeams().length === 0 && (
                      <span style={{ color: '#9ca3af' }}>All teams assigned!</span>
                    )}
                  </div>
                </div>

                {/* Groups */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  {groupSetup.map((group, gIndex) => (
                    <div
                      key={gIndex}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const teamId = e.dataTransfer.getData('teamId');
                        handleTeamDrop(gIndex, teamId);
                      }}
                      style={{
                        padding: '1rem',
                        border: '2px dashed #d1d5db',
                        borderRadius: '8px',
                        minHeight: '150px'
                      }}
                    >
                      <h4 style={{ marginBottom: '0.75rem', color: '#1a2a6c' }}>{group.name}</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {group.teams.map(teamId => {
                          const team = teams.find(t => t._id === teamId);
                          return (
                            <div
                              key={teamId}
                              style={{
                                padding: '0.5rem 1rem',
                                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                color: 'white',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                              }}
                            >
                              {team?.name || teamId}
                              <button
                                onClick={() => {
                                  const newGroupSetup = [...groupSetup];
                                  newGroupSetup[gIndex].teams = newGroupSetup[gIndex].teams.filter(id => id !== teamId);
                                  setGroupSetup(newGroupSetup);
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'white',
                                  cursor: 'pointer',
                                  fontSize: '1rem'
                                }}
                              >
                                x
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      {group.teams.length === 0 && (
                        <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Drag teams here</span>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button
                    onClick={() => setShowGroupSetup(false)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: '#e5e7eb',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSetupGroups}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Save Groups
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Tournament;
