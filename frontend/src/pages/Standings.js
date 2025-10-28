import React, { useState, useEffect } from 'react';
import { teamAPI } from '../services/api';

function Standings() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStandings();
  }, []);

  const fetchStandings = async () => {
    try {
      const response = await teamAPI.getStandings();
      setTeams(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching standings:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading standings...</div>;
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">Points Table</div>
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
            {teams.map((team, index) => (
              <tr key={team._id}>
                <td><strong>{index + 1}</strong></td>
                <td>{team.name}</td>
                <td>{team.matchesPlayed}</td>
                <td>{team.matchesWon}</td>
                <td>{team.matchesLost}</td>
                <td><strong>{team.points}</strong></td>
                <td>{team.netRunRate.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Standings;
