import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { matchAPI, playerAPI, teamAPI } from '../services/api';
import io from 'socket.io-client';

const socket = io('http://localhost:5022');

function LiveScore() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allPlayers, setAllPlayers] = useState([]);

  // Score input states
  const [currentBatsman, setCurrentBatsman] = useState('');
  const [currentBowler, setCurrentBowler] = useState('');
  const [boundaryType, setBoundaryType] = useState('none');
  const [additionalRuns, setAdditionalRuns] = useState(0);
  const [extraType, setExtraType] = useState('none');
  const [isWicket, setIsWicket] = useState(false);
  const [wicketType, setWicketType] = useState('none');
  const [dismissedPlayer, setDismissedPlayer] = useState('');

  // Batting pair system
  const [battingPair, setBattingPair] = useState({ player1: '', player2: '' });
  const [striker, setStriker] = useState(''); // Current striker from the pair
  const [pairStartOver, setPairStartOver] = useState(0);
  const [showPairSelection, setShowPairSelection] = useState(false);

  // Toss dialog states
  const [showTossDialog, setShowTossDialog] = useState(false);
  const [tossData, setTossData] = useState({
    tossWinner: '',
    tossDecision: 'bat'
  });

  useEffect(() => {
    fetchMatch();
    fetchPlayers();

    socket.on('matchUpdate', (updatedMatch) => {
      if (updatedMatch._id === id) {
        setMatch(updatedMatch);
      }
    });

    return () => {
      socket.off('matchUpdate');
    };
  }, [id]);

  const fetchMatch = async () => {
    try {
      const response = await matchAPI.getById(id);
      setMatch(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching match:', error);
      setLoading(false);
    }
  };

  const fetchPlayers = async () => {
    try {
      const response = await playerAPI.getAll();
      setAllPlayers(response.data);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const handleStartMatch = async (e) => {
    e.preventDefault();

    if (!tossData.tossWinner) {
      alert('Please select toss winner');
      return;
    }

    try {
      await matchAPI.startMatch(id, tossData);
      setShowTossDialog(false);
      setTossData({ tossWinner: '', tossDecision: 'bat' });
      fetchMatch();
    } catch (error) {
      console.error('Error starting match:', error);
      alert('Error starting match: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleSetBattingPair = () => {
    if (!battingPair.player1 || !battingPair.player2) {
      alert('Please select both batsmen for the pair');
      return;
    }
    if (battingPair.player1 === battingPair.player2) {
      alert('Please select two different players');
      return;
    }

    const currentInnings = match.innings[match.currentInnings - 1];
    const currentOver = Math.floor(currentInnings.balls / 4);

    // Set the striker as player1 initially
    setStriker(battingPair.player1);
    setCurrentBatsman(battingPair.player1);
    setPairStartOver(currentOver);
    setShowPairSelection(false);
  };

  const rotateStrike = () => {
    // Swap striker and non-striker
    if (striker === battingPair.player1) {
      setStriker(battingPair.player2);
      setCurrentBatsman(battingPair.player2);
    } else {
      setStriker(battingPair.player1);
      setCurrentBatsman(battingPair.player1);
    }
  };

  const handleQuickScore = async (scoreType) => {
    if (!battingPair.player1 || !battingPair.player2) {
      alert('Please select the batting pair first');
      return;
    }
    if (!currentBowler) {
      alert('Please select the bowler');
      return;
    }

    let ballData = {
      batsman: currentBatsman,
      bowler: currentBowler,
      runs: 0,
      extras: 0,
      extraType: 'none',
      isWicket: false,
      wicketType: 'none',
      dismissedPlayer: null,
      boundaryType: 'none',
      additionalRuns: 0
    };

    // Set data based on quick score type
    switch(scoreType) {
      case 'dot':
        ballData.runs = 0;
        break;
      case '1': case '2': case '3':
        ballData.runs = parseInt(scoreType);
        break;
      case 'wide':
        ballData.extraType = 'wide';
        ballData.extras = 4;
        break;
      case 'noball':
        ballData.extraType = 'noball';
        ballData.extras = 4;
        break;
      case 'straight_wall_air':
        ballData.boundaryType = 'straight_wall_air';
        ballData.additionalRuns = additionalRuns;
        break;
      case 'straight_wall_ground':
        ballData.boundaryType = 'straight_wall_ground';
        ballData.additionalRuns = additionalRuns;
        break;
      case 'ceiling':
        ballData.boundaryType = 'ceiling';
        ballData.additionalRuns = additionalRuns;
        break;
      case 'side_wall_air':
        ballData.boundaryType = 'side_wall_air';
        ballData.additionalRuns = additionalRuns;
        break;
      case 'side_wall_ground':
        ballData.boundaryType = 'side_wall_ground';
        ballData.additionalRuns = additionalRuns;
        break;
      case 'net_air':
        ballData.boundaryType = 'net_air';
        ballData.additionalRuns = additionalRuns;
        break;
      case 'net_ground':
        ballData.boundaryType = 'net_ground';
        ballData.additionalRuns = additionalRuns;
        break;
      case 'wicket':
        ballData.isWicket = true;
        ballData.wicketType = wicketType || 'bowled';
        ballData.dismissedPlayer = dismissedPlayer || currentBatsman;
        break;
    }

    try {
      await matchAPI.updateBall(id, ballData);

      const currentInnings = match.innings[match.currentInnings - 1];
      const currentBall = currentInnings.balls % 4;

      // Rotate strike logic
      // 1. After over ends (ball 4), swap striker
      // 2. After odd runs (1, 3), swap striker
      // 3. After wicket, keep same striker (new batsman comes to non-striker)

      let shouldRotate = false;

      if (!ballData.isWicket) {
        // Check if over just ended
        if (currentBall === 3 && ballData.extraType !== 'wide' && ballData.extraType !== 'noball') {
          shouldRotate = true;
        }
        // Check for odd runs
        else if (scoreType === '1' || scoreType === '3') {
          shouldRotate = true;
        }
        // Check if boundary with odd additional runs
        else if ((ballData.boundaryType !== 'none' && ballData.additionalRuns % 2 === 1)) {
          shouldRotate = true;
        }
      }

      if (shouldRotate) {
        rotateStrike();
      }

      // Reset form
      setBoundaryType('none');
      setAdditionalRuns(0);
      setExtraType('none');
      setIsWicket(false);
      setWicketType('none');
      setDismissedPlayer('');

      // Check if pair's 2 overs are complete
      const newOver = Math.floor((currentInnings.balls + 1) / 4);
      if (newOver - pairStartOver >= 2) {
        setShowPairSelection(true);
        setBattingPair({ player1: '', player2: '' });
        setStriker('');
        setCurrentBatsman('');
      }

      fetchMatch();
    } catch (error) {
      console.error('Error updating ball:', error);
      alert('Error updating score: ' + (error.response?.data?.message || error.message));
    }
  };

  if (loading) {
    return <div className="loading">Loading match...</div>;
  }

  if (!match) {
    return <div className="loading">Match not found</div>;
  }

  const currentInnings = match.innings[match.currentInnings - 1];
  const battingTeamPlayers = allPlayers.filter(
    p => currentInnings && p.team._id === currentInnings.battingTeam.toString()
  );
  const bowlingTeamPlayers = allPlayers.filter(
    p => currentInnings && p.team._id === currentInnings.bowlingTeam.toString()
  );

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          Match {match.matchNumber}: {match.team1.name} vs {match.team2.name}
        </div>

        {match.status === 'scheduled' && (
          <div>
            <p>Match is scheduled for {new Date(match.date).toLocaleDateString()}</p>
            <p>Venue: {match.venue}</p>

            {!showTossDialog ? (
              <button className="btn btn-success" onClick={() => setShowTossDialog(true)}>
                Start Match
              </button>
            ) : (
              <div style={{
                background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
                padding: '2rem',
                borderRadius: '10px',
                marginTop: '1rem',
                border: '2px solid #10b981'
              }}>
                <h3 style={{ color: '#1a2a6c', marginBottom: '1.5rem' }}>Toss Details</h3>
                <form onSubmit={handleStartMatch}>
                  <div className="form-group">
                    <label className="form-label">Toss Winner</label>
                    <select
                      className="form-select"
                      value={tossData.tossWinner}
                      onChange={(e) => setTossData({...tossData, tossWinner: e.target.value})}
                      required
                    >
                      <option value="">Select Team</option>
                      <option value={match.team1._id}>{match.team1.name}</option>
                      <option value={match.team2._id}>{match.team2.name}</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Toss Decision</label>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="radio"
                          name="tossDecision"
                          value="bat"
                          checked={tossData.tossDecision === 'bat'}
                          onChange={(e) => setTossData({...tossData, tossDecision: e.target.value})}
                        />
                        Bat First
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="radio"
                          name="tossDecision"
                          value="bowl"
                          checked={tossData.tossDecision === 'bowl'}
                          onChange={(e) => setTossData({...tossData, tossDecision: e.target.value})}
                        />
                        Bowl First
                      </label>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="submit" className="btn btn-success">
                      Start Match
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowTossDialog(false);
                        setTossData({ tossWinner: '', tossDecision: 'bat' });
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {match.status === 'completed' && (
          <div style={{ background: '#10b981', color: 'white', padding: '2rem', borderRadius: '10px' }}>
            <h2>Match Completed</h2>
            <h3>{match.resultText}</h3>
          </div>
        )}

        {match.status === 'live' && currentInnings && (
          <>
            <div className="live-score">
              <span className="live-badge">LIVE</span>
              <div className="score-display">
                <div className="team-score">
                  <h3>{match.innings[0].battingTeam === match.team1._id ? match.team1.shortName : match.team2.shortName}</h3>
                  <div className="score">{match.innings[0].runs}/{match.innings[0].wickets}</div>
                  <p>{match.innings[0].overs.toFixed(1)} overs</p>
                </div>
                {match.innings[1] && (
                  <>
                    <div>vs</div>
                    <div className="team-score">
                      <h3>{match.innings[1].battingTeam === match.team1._id ? match.team1.shortName : match.team2.shortName}</h3>
                      <div className="score">{match.innings[1].runs}/{match.innings[1].wickets}</div>
                      <p>{match.innings[1].overs.toFixed(1)} overs</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Score Input Interface */}
            <div className="score-input">
              <h3 style={{ marginBottom: '1.5rem', color: '#667eea' }}>Score Input</h3>

              <div className="current-ball-info">
                <p><strong>Current Over:</strong> {Math.floor(currentInnings.balls / 4) + 1}.{currentInnings.balls % 4}</p>
                <p><strong>Innings:</strong> {match.currentInnings}</p>
                {currentInnings.balls >= 24 && (
                  <div style={{
                    background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                    color: 'white',
                    padding: '1rem',
                    borderRadius: '10px',
                    marginTop: '1rem',
                    border: '3px solid #fdbb2d',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    animation: 'pulse 2s infinite'
                  }}>
                    LAST 2 OVERS!<br/>
                    <span style={{ fontSize: '0.9rem' }}>
                      • Wides/No-Balls RE-BOWLED<br/>
                      • HIT-AND-RUN: Must run if ball is hit
                    </span>
                  </div>
                )}
              </div>

              {/* Batting Pair Selection */}
              {(!battingPair.player1 || !battingPair.player2 || showPairSelection) && (
                <div style={{
                  background: 'linear-gradient(135deg, #fdbb2d, #f59e0b)',
                  padding: '1.5rem',
                  borderRadius: '10px',
                  marginBottom: '1.5rem',
                  border: '3px solid #1a2a6c'
                }}>
                  <h4 style={{ color: '#1a2a6c', marginBottom: '1rem', fontWeight: 'bold' }}>
                    Select Batting Pair (2 Overs)
                  </h4>
                  <div className="form-group">
                    <label className="form-label">Batsman 1</label>
                    <select
                      className="form-select"
                      value={battingPair.player1}
                      onChange={(e) => setBattingPair({...battingPair, player1: e.target.value})}
                    >
                      <option value="">Select Player 1</option>
                      {battingTeamPlayers.map(player => (
                        <option key={player._id} value={player._id}>
                          {player.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Batsman 2</label>
                    <select
                      className="form-select"
                      value={battingPair.player2}
                      onChange={(e) => setBattingPair({...battingPair, player2: e.target.value})}
                    >
                      <option value="">Select Player 2</option>
                      {battingTeamPlayers.map(player => (
                        <option key={player._id} value={player._id}>
                          {player.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    className="btn btn-success"
                    onClick={handleSetBattingPair}
                    style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', fontWeight: 'bold' }}
                  >
                    Set Batting Pair
                  </button>
                </div>
              )}

              {/* Current Batting Pair Display */}
              {battingPair.player1 && battingPair.player2 && !showPairSelection && (
                <div style={{
                  background: 'linear-gradient(135deg, #10b981, #34d399)',
                  padding: '1rem',
                  borderRadius: '10px',
                  marginBottom: '1.5rem',
                  color: 'white',
                  border: '2px solid #059669'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '1.1rem' }}>Current Pair:</strong>
                      <div style={{ marginTop: '0.5rem' }}>
                        <span style={{
                          background: striker === battingPair.player1 ? '#fdbb2d' : 'rgba(255,255,255,0.3)',
                          color: striker === battingPair.player1 ? '#000' : '#fff',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '5px',
                          marginRight: '0.5rem',
                          fontWeight: 'bold'
                        }}>
                          {battingTeamPlayers.find(p => p._id === battingPair.player1)?.name}
                          {striker === battingPair.player1 && ' ⭐'}
                        </span>
                        <span style={{
                          background: striker === battingPair.player2 ? '#fdbb2d' : 'rgba(255,255,255,0.3)',
                          color: striker === battingPair.player2 ? '#000' : '#fff',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '5px',
                          fontWeight: 'bold'
                        }}>
                          {battingTeamPlayers.find(p => p._id === battingPair.player2)?.name}
                          {striker === battingPair.player2 && ' ⭐'}
                        </span>
                      </div>
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={() => setShowPairSelection(true)}
                      style={{ padding: '0.5rem 1rem' }}
                    >
                      Change Pair
                    </button>
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.9 }}>
                    ⭐ = On Strike | Overs {Math.floor(currentInnings.balls / 4) - pairStartOver}/2 completed
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Select Bowler</label>
                <select
                  className="form-select"
                  value={currentBowler}
                  onChange={(e) => setCurrentBowler(e.target.value)}
                >
                  <option value="">Select Bowler</option>
                  {bowlingTeamPlayers.map(player => (
                    <option key={player._id} value={player._id}>
                      {player.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* YYC Quick Scoring Buttons */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Quick Score</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button className="btn btn-secondary" onClick={() => handleQuickScore('dot')} style={{ padding: '1rem', fontSize: '1.1rem' }}>
                    Dot Ball
                  </button>
                  <button className="btn btn-primary" onClick={() => handleQuickScore('1')} style={{ padding: '1rem', fontSize: '1.1rem' }}>
                    1 Run
                  </button>
                  <button className="btn btn-primary" onClick={() => handleQuickScore('2')} style={{ padding: '1rem', fontSize: '1.1rem' }}>
                    2 Runs
                  </button>
                  <button className="btn btn-primary" onClick={() => handleQuickScore('3')} style={{ padding: '1rem', fontSize: '1.1rem' }}>
                    3 Runs
                  </button>
                </div>
              </div>

              {/* YYC Boundary Buttons */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>YYC Boundaries</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    className="btn btn-success"
                    onClick={() => handleQuickScore('straight_wall_air')}
                    style={{ padding: '1rem', fontSize: '0.95rem', background: 'linear-gradient(135deg, #059669, #10b981)' }}
                  >
                    Straight Wall (Air)<br/>6 + runs
                  </button>
                  <button
                    className="btn btn-success"
                    onClick={() => handleQuickScore('straight_wall_ground')}
                    style={{ padding: '1rem', fontSize: '0.95rem', background: 'linear-gradient(135deg, #0d9488, #14b8a6)' }}
                  >
                    Straight Wall (Ground)<br/>4 + runs
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleQuickScore('ceiling')}
                    style={{ padding: '1rem', fontSize: '0.95rem' }}
                  >
                    Ceiling<br/>2 + runs
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleQuickScore('side_wall_air')}
                    style={{ padding: '1rem', fontSize: '0.95rem' }}
                  >
                    Side Wall (Air)<br/>2 + runs
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleQuickScore('side_wall_ground')}
                    style={{ padding: '1rem', fontSize: '0.95rem' }}
                  >
                    Side Wall (Ground)<br/>1 + runs
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleQuickScore('net_air')}
                    style={{ padding: '1rem', fontSize: '0.95rem' }}
                  >
                    Net/Curtain (Air)<br/>2 + runs
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleQuickScore('net_ground')}
                    style={{ padding: '1rem', fontSize: '0.95rem' }}
                  >
                    Net/Curtain (Ground)<br/>1 + runs
                  </button>
                </div>

                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label">Additional Runs (if any)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={additionalRuns}
                    onChange={(e) => setAdditionalRuns(parseInt(e.target.value) || 0)}
                    min="0"
                    max="3"
                    placeholder="Extra runs by running"
                  />
                </div>
              </div>

              {/* Extras */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Extras (4 runs each)</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleQuickScore('wide')}
                    style={{ padding: '1rem', fontSize: '1.1rem' }}
                  >
                    Wide (4 runs)
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleQuickScore('noball')}
                    style={{ padding: '1rem', fontSize: '1.1rem' }}
                  >
                    No Ball (4 runs)
                  </button>
                </div>
              </div>

              {/* Wicket */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Wicket</label>
                <div className="form-group" style={{ marginTop: '0.5rem' }}>
                  <label className="form-label">Wicket Type</label>
                  <select
                    className="form-select"
                    value={wicketType}
                    onChange={(e) => setWicketType(e.target.value)}
                  >
                    <option value="bowled">Bowled</option>
                    <option value="caught">Caught</option>
                    <option value="lbw">LBW</option>
                    <option value="runout">Run Out</option>
                    <option value="stumped">Stumped</option>
                    <option value="hitwicket">Hit Wicket</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Dismissed Player</label>
                  <select
                    className="form-select"
                    value={dismissedPlayer}
                    onChange={(e) => setDismissedPlayer(e.target.value)}
                  >
                    <option value="">Select Player (defaults to batsman)</option>
                    {battingTeamPlayers.map(player => (
                      <option key={player._id} value={player._id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  className="btn btn-danger"
                  onClick={() => handleQuickScore('wicket')}
                  style={{ width: '100%', padding: '1rem', marginTop: '0.5rem', fontSize: '1.1rem', fontWeight: 'bold' }}
                >
                  WICKET
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Scorecard */}
      {currentInnings && (
        <div className="card">
          <div className="card-header">Scorecard</div>
          <div className="scorecard">
            <div className="scorecard-section">
              <h4>Batting</h4>
              <table className="table">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Runs</th>
                    <th>Balls</th>
                    <th>4s</th>
                    <th>6s</th>
                    <th>SR</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {currentInnings.battingScorecard.map((batting, idx) => (
                    <tr key={idx}>
                      <td>{batting.player?.name || 'Player'}</td>
                      <td>{batting.runs}</td>
                      <td>{batting.balls}</td>
                      <td>{batting.fours}</td>
                      <td>{batting.sixes}</td>
                      <td>{batting.strikeRate}</td>
                      <td>{batting.isOut ? batting.howOut : 'Not Out'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="scorecard-section">
              <h4>Bowling</h4>
              <table className="table">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Overs</th>
                    <th>Runs</th>
                    <th>Wickets</th>
                    <th>Economy</th>
                  </tr>
                </thead>
                <tbody>
                  {currentInnings.bowlingScorecard.map((bowling, idx) => (
                    <tr key={idx}>
                      <td>{bowling.player?.name || 'Player'}</td>
                      <td>{bowling.overs.toFixed(1)}</td>
                      <td>{bowling.runs}</td>
                      <td>{bowling.wickets}</td>
                      <td>{bowling.economy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveScore;
