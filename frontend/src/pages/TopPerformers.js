import React, { useState, useEffect } from 'react';
import { playerAPI } from '../services/api';

function TopPerformers() {
  const [batsmen, setBatsmen] = useState([]);
  const [bowlers, setBowlers] = useState([]);
  const [allRounders, setAllRounders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllPlayers();
  }, []);

  const fetchAllPlayers = async () => {
    try {
      const response = await playerAPI.getAll();
      const players = response.data;

      // Filter by role
      const batsmenList = players.filter(p => p.role === 'Batsman' && p.battingStats.innings > 0)
        .sort((a, b) => b.battingStats.runs - a.battingStats.runs);

      const bowlersList = players.filter(p => p.role === 'Bowler' && p.bowlingStats.innings > 0)
        .sort((a, b) => b.bowlingStats.wickets - a.bowlingStats.wickets);

      const allRoundersList = players.filter(p => p.role === 'All-rounder' && (p.battingStats.innings > 0 || p.bowlingStats.innings > 0))
        .sort((a, b) => {
          // Sort all-rounders by a combination of runs and wickets
          const scoreA = (a.battingStats.runs * 2) + (a.bowlingStats.wickets * 20);
          const scoreB = (b.battingStats.runs * 2) + (b.bowlingStats.wickets * 20);
          return scoreB - scoreA;
        });

      setBatsmen(batsmenList);
      setBowlers(bowlersList);
      setAllRounders(allRoundersList);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching players:', error);
      setLoading(false);
    }
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
        Player Standings
      </h1>

      {/* Batsmen Standings */}
      <div className="card">
        <div className="card-header">🏏 Batsmen Standings</div>
        {batsmen.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Team</th>
                <th>Innings</th>
                <th>Runs</th>
                <th>Highest</th>
                <th>Average</th>
                <th>Strike Rate</th>
                <th>4s</th>
                <th>6s</th>
              </tr>
            </thead>
            <tbody>
              {batsmen.map((player, index) => (
                <tr key={player._id} style={{
                  background: index < 3 ? 'rgba(253, 187, 45, 0.1)' : 'transparent'
                }}>
                  <td>
                    <strong style={{
                      fontSize: '1.2rem',
                      color: index === 0 ? '#fdbb2d' : index === 1 ? '#9ca3af' : index === 2 ? '#b87333' : '#1a2a6c'
                    }}>
                      {index + 1}
                    </strong>
                  </td>
                  <td><strong>{player.name}</strong></td>
                  <td>{player.team?.shortName || 'N/A'}</td>
                  <td>{player.battingStats.innings}</td>
                  <td><strong style={{ color: '#b21f1f', fontSize: '1.1rem' }}>{player.battingStats.runs}</strong></td>
                  <td>{player.battingStats.highestScore}</td>
                  <td>{player.battingStats.average}</td>
                  <td>{player.battingStats.strikeRate}</td>
                  <td>{player.battingStats.fours}</td>
                  <td>{player.battingStats.sixes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            No batsmen statistics available yet
          </p>
        )}
      </div>

      {/* Bowlers Standings */}
      <div className="card">
        <div className="card-header">⚡ Bowlers Standings</div>
        {bowlers.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Team</th>
                <th>Innings</th>
                <th>Wickets</th>
                <th>Overs</th>
                <th>Runs</th>
                <th>Average</th>
                <th>Economy</th>
              </tr>
            </thead>
            <tbody>
              {bowlers.map((player, index) => (
                <tr key={player._id} style={{
                  background: index < 3 ? 'rgba(253, 187, 45, 0.1)' : 'transparent'
                }}>
                  <td>
                    <strong style={{
                      fontSize: '1.2rem',
                      color: index === 0 ? '#fdbb2d' : index === 1 ? '#9ca3af' : index === 2 ? '#b87333' : '#1a2a6c'
                    }}>
                      {index + 1}
                    </strong>
                  </td>
                  <td><strong>{player.name}</strong></td>
                  <td>{player.team?.shortName || 'N/A'}</td>
                  <td>{player.bowlingStats.innings}</td>
                  <td><strong style={{ color: '#b21f1f', fontSize: '1.1rem' }}>{player.bowlingStats.wickets}</strong></td>
                  <td>{player.bowlingStats.overs.toFixed(1)}</td>
                  <td>{player.bowlingStats.runsConceded}</td>
                  <td>{player.bowlingStats.average}</td>
                  <td>{player.bowlingStats.economy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            No bowlers statistics available yet
          </p>
        )}
      </div>

      {/* All-Rounders Standings */}
      <div className="card">
        <div className="card-header">⭐ All-Rounders Standings</div>
        {allRounders.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Team</th>
                <th>Runs</th>
                <th>Avg</th>
                <th>SR</th>
                <th>Wickets</th>
                <th>Bowling Avg</th>
                <th>Econ</th>
              </tr>
            </thead>
            <tbody>
              {allRounders.map((player, index) => (
                <tr key={player._id} style={{
                  background: index < 3 ? 'rgba(253, 187, 45, 0.1)' : 'transparent'
                }}>
                  <td>
                    <strong style={{
                      fontSize: '1.2rem',
                      color: index === 0 ? '#fdbb2d' : index === 1 ? '#9ca3af' : index === 2 ? '#b87333' : '#1a2a6c'
                    }}>
                      {index + 1}
                    </strong>
                  </td>
                  <td><strong>{player.name}</strong></td>
                  <td>{player.team?.shortName || 'N/A'}</td>
                  <td><strong style={{ color: '#b21f1f' }}>{player.battingStats.runs}</strong></td>
                  <td>{player.battingStats.average}</td>
                  <td>{player.battingStats.strikeRate}</td>
                  <td><strong style={{ color: '#1a2a6c' }}>{player.bowlingStats.wickets}</strong></td>
                  <td>{player.bowlingStats.average}</td>
                  <td>{player.bowlingStats.economy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            No all-rounders statistics available yet
          </p>
        )}
      </div>
    </div>
  );
}

export default TopPerformers;
