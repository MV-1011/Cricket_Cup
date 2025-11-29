import React, { useState, useEffect } from 'react';
import { tournamentAPI } from '../services/api';

function Standings() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await tournamentAPI.getAll();
        setTournaments(response.data);

        // Auto-select if only one tournament
        if (response.data.length === 1) {
          fetchTournamentDetails(response.data[0]._id);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching tournaments:', error);
        setLoading(false);
      }
    };
    fetchTournaments();
  }, []);

  const fetchTournamentDetails = async (id) => {
    try {
      const response = await tournamentAPI.getById(id);
      setSelectedTournament(response.data);
    } catch (error) {
      console.error('Error fetching tournament:', error);
    }
  };

  const getTeamName = (team) => {
    if (!team) return 'TBD';
    if (typeof team === 'string') return team;
    return team.name || 'TBD';
  };

  if (loading) {
    return <div className="loading">Loading standings...</div>;
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
        Points Table
      </h1>

      {/* Tournament Selection */}
      {tournaments.length > 1 && !selectedTournament && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="card-header">Select Tournament</div>
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
                  alignItems: 'center',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#e5e7eb'}
                onMouseOut={(e) => e.currentTarget.style.background = '#f3f4f6'}
              >
                <div>
                  <strong style={{ fontSize: '1.1rem' }}>{t.name}</strong>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    {t.groups?.length || 0} Groups | Status: {t.status}
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
        </div>
      )}

      {/* Tournament Header when selected (with back button if multiple tournaments) */}
      {selectedTournament && tournaments.length > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          padding: '1rem',
          background: 'linear-gradient(135deg, #1a2a6c, #2d4a9c)',
          borderRadius: '8px',
          color: 'white'
        }}>
          <h2 style={{ margin: 0 }}>{selectedTournament.name}</h2>
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
            Back to Tournaments
          </button>
        </div>
      )}

      {/* No tournaments found */}
      {tournaments.length === 0 && (
        <div className="card">
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
            <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No tournaments found</p>
            <p>Create a tournament to see standings</p>
          </div>
        </div>
      )}

      {/* Standings Display */}
      {selectedTournament && (
        <>
          {/* Check if tournament has groups with standings */}
          {selectedTournament.groups && selectedTournament.groups.length > 0 ? (
            // Display standings by group
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
              {selectedTournament.groups.map((group, index) => (
                <div key={index} className="card">
                  <div className="card-header" style={{
                    background: 'linear-gradient(135deg, #1a2a6c, #2d4a9c)',
                    color: 'white',
                    fontSize: '1.3rem',
                    fontWeight: 'bold'
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
                      {group.standings
                        ?.sort((a, b) => {
                          if (b.points !== a.points) return b.points - a.points;
                          return (b.netRunRate || 0) - (a.netRunRate || 0);
                        })
                        .map((standing, i) => (
                          <tr key={i} style={{
                            background: i < 2 ? 'rgba(16, 185, 129, 0.1)' : 'transparent'
                          }}>
                            <td>
                              <strong style={{
                                fontSize: '1.1rem',
                                color: i === 0 ? '#fdbb2d' : i === 1 ? '#94a3b8' : '#1a2a6c'
                              }}>
                                {i + 1}
                              </strong>
                            </td>
                            <td><strong>{getTeamName(standing.team)}</strong></td>
                            <td>{standing.played || 0}</td>
                            <td style={{ color: '#10b981', fontWeight: '600' }}>{standing.won || 0}</td>
                            <td style={{ color: '#dc3545', fontWeight: '600' }}>{standing.lost || 0}</td>
                            <td><strong style={{ fontSize: '1.1rem', color: '#1a2a6c' }}>{standing.points || 0}</strong></td>
                            <td style={{ color: (standing.netRunRate || 0) >= 0 ? '#10b981' : '#dc3545' }}>
                              {(standing.netRunRate || 0) >= 0 ? '+' : ''}{(standing.netRunRate || 0).toFixed(3)}
                            </td>
                          </tr>
                        ))}
                      {(!group.standings || group.standings.length === 0) && (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>
                            No teams in this group yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  {/* Qualification indicator */}
                  <div style={{
                    padding: '0.75rem 1rem',
                    background: '#f3f4f6',
                    fontSize: '0.85rem',
                    color: '#6b7280',
                    borderTop: '1px solid #e5e7eb'
                  }}>
                    Top 2 teams qualify for knockout stage
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // No groups - show single table (tournament without groups)
            <div className="card">
              <div className="card-header" style={{
                background: 'linear-gradient(135deg, #1a2a6c, #2d4a9c)',
                color: 'white',
                fontSize: '1.3rem',
                fontWeight: 'bold'
              }}>
                Overall Standings
              </div>
              <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No group standings available</p>
                <p>Setup groups in the Tournament page to see standings</p>
              </div>
            </div>
          )}

          {/* Knockout Qualification Summary */}
          {selectedTournament.groups && selectedTournament.groups.length > 0 && selectedTournament.status !== 'planned' && (
            <div className="card" style={{ marginTop: '2rem' }}>
              <div className="card-header" style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: 'white'
              }}>
                Knockout Stage Qualification
              </div>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  {selectedTournament.groups.map((group, index) => {
                    const sortedStandings = [...(group.standings || [])]
                      .sort((a, b) => {
                        if (b.points !== a.points) return b.points - a.points;
                        return (b.netRunRate || 0) - (a.netRunRate || 0);
                      });
                    const qualified = sortedStandings.slice(0, 2);

                    return (
                      <div key={index} style={{
                        padding: '1rem',
                        background: '#f3f4f6',
                        borderRadius: '8px'
                      }}>
                        <h4 style={{ marginBottom: '0.75rem', color: '#1a2a6c' }}>{group.name}</h4>
                        {qualified.map((team, i) => (
                          <div key={i} style={{
                            padding: '0.5rem',
                            marginBottom: '0.25rem',
                            background: i === 0 ? 'rgba(253, 187, 45, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                            borderRadius: '4px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <span>
                              <strong style={{ marginRight: '0.5rem' }}>{i + 1}.</strong>
                              {getTeamName(team.team)}
                            </span>
                            <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                              {team.points || 0} pts
                            </span>
                          </div>
                        ))}
                        {qualified.length === 0 && (
                          <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                            No qualified teams yet
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Champion display if tournament completed */}
          {selectedTournament.champion && (
            <div className="card" style={{ marginTop: '2rem' }}>
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                color: 'white'
              }}>
                <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>TOURNAMENT CHAMPION</h2>
                <h1 style={{ fontSize: '2.5rem', margin: 0 }}>
                  {getTeamName(selectedTournament.champion)}
                </h1>
                {selectedTournament.runnerUp && (
                  <p style={{ marginTop: '1rem', opacity: 0.9 }}>
                    Runner-up: {getTeamName(selectedTournament.runnerUp)}
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Standings;
