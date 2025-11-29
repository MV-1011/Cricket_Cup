import React, { useState, useEffect } from 'react';
import { playerAPI } from '../services/api';
import * as XLSX from 'xlsx';

function TopPerformers() {
  const [batsmen, setBatsmen] = useState([]);
  const [bowlers, setBowlers] = useState([]);
  const [allRounders, setAllRounders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllPlayers();
  }, []);

  const exportToExcel = (data, filename, sheetName) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  const exportBatsmen = () => {
    const data = batsmen.map((player, index) => ({
      Rank: index + 1,
      Player: player.name,
      Team: player.team?.name || 'N/A',
      Innings: player.battingStats.innings,
      Runs: player.battingStats.runs,
      Highest: player.battingStats.highestScore,
      Average: player.battingStats.average,
      'Strike Rate': player.battingStats.strikeRate,
      '4s': player.battingStats.fours,
      '6s': player.battingStats.sixes
    }));
    exportToExcel(data, 'Batsmen_Rankings', 'Batsmen');
  };

  const exportBowlers = () => {
    const data = bowlers.map((player, index) => ({
      Rank: index + 1,
      Player: player.name,
      Team: player.team?.name || 'N/A',
      Innings: player.bowlingStats.innings,
      Wickets: player.bowlingStats.wickets,
      Overs: player.bowlingStats.overs.toFixed(1),
      Runs: player.bowlingStats.runsConceded,
      Average: player.bowlingStats.average,
      Economy: player.bowlingStats.economy
    }));
    exportToExcel(data, 'Bowlers_Rankings', 'Bowlers');
  };

  const exportAllRounders = () => {
    const data = allRounders.map((player, index) => ({
      Rank: index + 1,
      Player: player.name,
      Team: player.team?.name || 'N/A',
      Runs: player.battingStats.runs,
      'Batting Avg': player.battingStats.average,
      SR: player.battingStats.strikeRate,
      Wickets: player.bowlingStats.wickets,
      'Bowling Avg': player.bowlingStats.average,
      Economy: player.bowlingStats.economy,
      Score: (parseFloat(player.battingStats.average) - parseFloat(player.bowlingStats.economy)).toFixed(2)
    }));
    exportToExcel(data, 'AllRounders_Rankings', 'All-Rounders');
  };

  const fetchAllPlayers = async () => {
    try {
      const response = await playerAPI.getAll();
      const players = response.data;

      // BATSMEN: All players who have batted, ranked by Most Runs (Higher is better)
      const batsmenList = players
        .filter(p => p.battingStats.innings > 0)
        .sort((a, b) => {
          const runsA = a.battingStats.runs || 0;
          const runsB = b.battingStats.runs || 0;
          return runsB - runsA; // Descending order (most runs on top)
        });

      // BOWLERS: All players who have bowled, ranked by Economy Rate (Lower is better)
      const bowlersList = players
        .filter(p => p.bowlingStats.innings > 0)
        .sort((a, b) => {
          const econA = parseFloat(a.bowlingStats.economy) || 999;
          const econB = parseFloat(b.bowlingStats.economy) || 999;
          return econA - econB; // Ascending order (lower economy is better)
        });

      // ALL-ROUNDERS: Players who have BOTH batted AND bowled, ranked by (Batting Avg - Economy)
      const allRoundersList = players
        .filter(p => p.battingStats.innings > 0 && p.bowlingStats.innings > 0)
        .sort((a, b) => {
          const batAvgA = parseFloat(a.battingStats.average) || 0;
          const econA = parseFloat(a.bowlingStats.economy) || 10;
          const scoreA = batAvgA - econA;

          const batAvgB = parseFloat(b.battingStats.average) || 0;
          const econB = parseFloat(b.bowlingStats.economy) || 10;
          const scoreB = batAvgB - econB;

          return scoreB - scoreA; // Descending order (higher score is better)
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
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            🏏 Batsmen Standings
            <span style={{ fontSize: '0.9rem', fontWeight: 'normal', marginLeft: '1rem', color: '#6b7280' }}>
              (Ranked by Most Runs)
            </span>
          </div>
          {batsmen.length > 0 && (
            <button
              onClick={exportBatsmen}
              className="btn btn-success"
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              📊 Export to Excel
            </button>
          )}
        </div>
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
                  <td>{player.team?.name || 'N/A'}</td>
                  <td>{player.battingStats.innings}</td>
                  <td>{player.battingStats.runs}</td>
                  <td>{player.battingStats.highestScore}</td>
                  <td><strong style={{ color: '#b21f1f', fontSize: '1.1rem' }}>{player.battingStats.average}</strong></td>
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
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            ⚡ Bowlers Standings
            <span style={{ fontSize: '0.9rem', fontWeight: 'normal', marginLeft: '1rem', color: '#6b7280' }}>
              (Ranked by Economy Rate - Lower is Better)
            </span>
          </div>
          {bowlers.length > 0 && (
            <button
              onClick={exportBowlers}
              className="btn btn-success"
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              📊 Export to Excel
            </button>
          )}
        </div>
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
                  <td>{player.team?.name || 'N/A'}</td>
                  <td>{player.bowlingStats.innings}</td>
                  <td>{player.bowlingStats.wickets}</td>
                  <td>{player.bowlingStats.overs.toFixed(1)}</td>
                  <td>{player.bowlingStats.runsConceded}</td>
                  <td>{player.bowlingStats.average}</td>
                  <td><strong style={{ color: '#10b981', fontSize: '1.1rem' }}>{player.bowlingStats.economy}</strong></td>
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
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            ⭐ All-Rounders Standings
            <span style={{ fontSize: '0.9rem', fontWeight: 'normal', marginLeft: '1rem', color: '#6b7280' }}>
              (Ranked by Batting Avg - Economy)
            </span>
          </div>
          {allRounders.length > 0 && (
            <button
              onClick={exportAllRounders}
              className="btn btn-success"
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              📊 Export to Excel
            </button>
          )}
        </div>
        {allRounders.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Team</th>
                <th>Runs</th>
                <th>Bat Avg</th>
                <th>SR</th>
                <th>Wickets</th>
                <th>Bowl Avg</th>
                <th>Econ</th>
                <th>Score</th>
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
                  <td>{player.team?.name || 'N/A'}</td>
                  <td>{player.battingStats.runs}</td>
                  <td>{player.battingStats.average}</td>
                  <td>{player.battingStats.strikeRate}</td>
                  <td>{player.bowlingStats.wickets}</td>
                  <td>{player.bowlingStats.average}</td>
                  <td>{player.bowlingStats.economy}</td>
                  <td>
                    <strong style={{ color: '#b21f1f', fontSize: '1.1rem' }}>
                      {(parseFloat(player.battingStats.average) - parseFloat(player.bowlingStats.economy)).toFixed(2)}
                    </strong>
                  </td>
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
