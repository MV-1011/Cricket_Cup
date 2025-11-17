import React, { useState, useEffect } from 'react';
import { teamAPI } from '../services/api';

function Standings() {
  const [teams, setTeams] = useState([]);
  const [groupedTeams, setGroupedTeams] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStandings();
  }, []);

  const fetchStandings = async () => {
    try {
      const response = await teamAPI.getStandings();
      const teamsData = response.data;
      setTeams(teamsData);

      // Debug: Log teams and their groups
      console.log('Teams data:', teamsData.map(t => ({ name: t.name, group: t.group })));

      // Group teams by their group field
      const grouped = teamsData.reduce((acc, team) => {
        const groupName = (team.group && team.group.trim() !== '') ? team.group : 'No Group';
        if (!acc[groupName]) {
          acc[groupName] = [];
        }
        acc[groupName].push(team);
        return acc;
      }, {});

      // Debug: Log grouped teams
      console.log('Grouped teams:', Object.keys(grouped).map(key => ({ group: key, count: grouped[key].length })));

      // Sort teams within each group by points (descending), then by NRR
      Object.keys(grouped).forEach(groupName => {
        grouped[groupName].sort((a, b) => {
          if (b.points !== a.points) {
            return b.points - a.points;
          }
          return b.netRunRate - a.netRunRate;
        });
      });

      setGroupedTeams(grouped);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching standings:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading standings...</div>;
  }

  const groupNames = Object.keys(groupedTeams).sort();

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

      {groupNames.length === 0 ? (
        <div className="card">
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
            <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No teams found</p>
            <p>Create teams to see standings</p>
          </div>
        </div>
      ) : (
        groupNames.map(groupName => (
          <div key={groupName} className="card" style={{ marginBottom: '2rem' }}>
            <div className="card-header" style={{
              background: 'linear-gradient(135deg, #1a2a6c, #2d4a9c)',
              color: 'white',
              fontSize: '1.3rem',
              fontWeight: 'bold'
            }}>
              {groupName}
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Position</th>
                  <th>Team</th>
                  <th>Played</th>
                  <th>Won</th>
                  <th>Lost</th>
                  <th>Points</th>
                  <th>NRR</th>
                </tr>
              </thead>
              <tbody>
                {groupedTeams[groupName].map((team, index) => (
                  <tr key={team._id} style={{
                    background: index === 0 ? 'rgba(253, 187, 45, 0.1)' : 'transparent'
                  }}>
                    <td>
                      <strong style={{
                        fontSize: '1.1rem',
                        color: index === 0 ? '#fdbb2d' : '#1a2a6c'
                      }}>
                        {index + 1}
                      </strong>
                    </td>
                    <td><strong>{team.name}</strong></td>
                    <td>{team.matchesPlayed}</td>
                    <td style={{ color: '#10b981', fontWeight: '600' }}>{team.matchesWon}</td>
                    <td style={{ color: '#dc3545', fontWeight: '600' }}>{team.matchesLost}</td>
                    <td><strong style={{ fontSize: '1.1rem', color: '#1a2a6c' }}>{team.points}</strong></td>
                    <td>{team.netRunRate.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}

export default Standings;
