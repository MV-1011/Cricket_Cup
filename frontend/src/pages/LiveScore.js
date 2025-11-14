import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { matchAPI, playerAPI } from '../services/api';
import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || window.location.origin;
const socket = io(SOCKET_URL);

function LiveScore() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allPlayers, setAllPlayers] = useState([]);

  // Score input states
  const [currentBatsman, setCurrentBatsman] = useState('');
  const [currentBowler, setCurrentBowler] = useState('');
  const [additionalRuns, setAdditionalRuns] = useState(0);
  const [wicketType, setWicketType] = useState('none');
  const [dismissedPlayer, setDismissedPlayer] = useState('');

  // Batting pair system
  const [battingPair, setBattingPair] = useState({ player1: '', player2: '' });
  const [striker, setStriker] = useState(''); // Current striker from the pair
  const [pairStartOver, setPairStartOver] = useState(0);
  const [showPairSelection, setShowPairSelection] = useState(false);
  const [usedPairs, setUsedPairs] = useState([]); // Track used batting pairs
  const [lastBowler, setLastBowler] = useState(''); // Track last over's bowler

  // Toss dialog states
  const [showTossDialog, setShowTossDialog] = useState(false);
  const [tossData, setTossData] = useState({
    tossWinner: '',
    tossDecision: 'bat'
  });

  const fetchMatch = useCallback(async () => {
    try {
      const response = await matchAPI.getById(id);
      setMatch(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching match:', error);
      setLoading(false);
    }
  }, [id]);

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
  }, [id, fetchMatch]);

  // Debug useEffect to monitor striker state changes
  useEffect(() => {
    console.log('Striker state changed to:', striker);
    console.log('Batting pair:', battingPair);
    console.log('Show pair selection:', showPairSelection);
  }, [striker, battingPair, showPairSelection]);

  const fetchPlayers = async () => {
    try {
      const response = await playerAPI.getAll();
      setAllPlayers(response.data);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  // Helper function to check if a pair has already batted
  const isPairUsed = (player1Id, player2Id) => {
    return usedPairs.some(pair =>
      (pair.player1 === player1Id && pair.player2 === player2Id) ||
      (pair.player1 === player2Id && pair.player2 === player1Id)
    );
  };

  // Helper function to get bowler's completed overs from current innings
  const getBowlerOvers = (bowlerId) => {
    if (!match || !match.innings || match.innings.length === 0) return 0;
    const currentInnings = match.innings[match.currentInnings - 1];
    const bowlerStats = currentInnings.bowlingScorecard.find(b => b.player._id === bowlerId || b.player === bowlerId);
    return bowlerStats ? Math.floor(bowlerStats.balls / 4) : 0;
  };

  // Helper function to check if a player has completed all their overs
  const hasPlayerCompletedOvers = (playerId) => {
    // Count how many different pairs this player has been part of
    let pairCount = 0;
    usedPairs.forEach(pair => {
      if (pair.player1 === playerId || pair.player2 === playerId) {
        pairCount++;
      }
    });

    // In YYC rules, each player can be in multiple pairs
    // But we check if they can form any new valid pair
    if (!match || !match.innings || match.innings.length === 0) return false;
    const currentInnings = match.innings[match.currentInnings - 1];
    const battingTeamId = currentInnings.battingTeam.toString();
    const teamPlayers = allPlayers.filter(p => p.team._id === battingTeamId);

    // Check if this player can form a new pair with ANY other player
    const canFormNewPair = teamPlayers.some(otherPlayer => {
      if (otherPlayer._id === playerId) return false;
      return !isPairUsed(playerId, otherPlayer._id);
    });

    return !canFormNewPair;
  };

  // Helper function to get available players for batting (exclude used pairs)
  const getAvailableBatsmen = (teamPlayers) => {
    if (!match || !match.innings || match.innings.length === 0) return teamPlayers;
    const currentInnings = match.innings[match.currentInnings - 1];

    // Get players who have already batted
    const battedPlayers = currentInnings.battingScorecard.map(b => b.player._id || b.player);

    // Return players who haven't batted yet, or have batted but can form a new valid pair
    return teamPlayers.filter(player => {
      // If player hasn't batted at all, they're available
      if (!battedPlayers.includes(player._id)) return true;

      // If player has batted, check if they can form a new unused pair
      const canFormNewPair = teamPlayers.some(otherPlayer => {
        if (otherPlayer._id === player._id) return false;
        return !isPairUsed(player._id, otherPlayer._id);
      });

      return canFormNewPair;
    });
  };

  // Helper function to get player status for display
  const getPlayerBattingStatus = (playerId, includeColor = false) => {
    if (hasPlayerCompletedOvers(playerId)) {
      return includeColor ? ' 🔴 Completed' : ' ● Completed';
    }

    // Check if player has batted but can still form new pairs
    if (!match || !match.innings || match.innings.length === 0) return includeColor ? ' 🟢 Available' : ' ● Available';
    const currentInnings = match.innings[match.currentInnings - 1];
    const battedPlayers = currentInnings.battingScorecard.map(b => b.player._id || b.player);

    if (battedPlayers.includes(playerId)) {
      return includeColor ? ' 🟡 Batted' : ' ● Batted';
    }

    return includeColor ? ' 🟢 Available' : ' ● Available';
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
      setShowPairSelection(true); // Show pair selection when match starts
      fetchMatch();
    } catch (error) {
      console.error('Error starting match:', error);
      alert('Error starting match: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleSetBattingPair = () => {
    console.log('handleSetBattingPair called with:', battingPair);

    if (!battingPair.player1 || !battingPair.player2) {
      alert('Please select both batsmen for the pair');
      return;
    }
    if (battingPair.player1 === battingPair.player2) {
      alert('Please select two different players');
      return;
    }

    // Check if this pair has already batted
    if (isPairUsed(battingPair.player1, battingPair.player2)) {
      alert('This batting pair has already played their 2 overs. Please select a different pair.');
      return;
    }

    const currentInnings = match.innings[match.currentInnings - 1];
    const currentOver = Math.floor(currentInnings.balls / 4);

    // YYC Rule: Player 1 (Batsman 1) is ALWAYS the striker when a new pair starts
    const firstBatsmanId = battingPair.player1;
    console.log('Setting striker to Player 1:', firstBatsmanId);

    // Set all states together
    setStriker(firstBatsmanId);
    setCurrentBatsman(firstBatsmanId);
    setUsedPairs([...usedPairs, { player1: battingPair.player1, player2: battingPair.player2 }]);
    setPairStartOver(currentOver);
    setShowPairSelection(false);

    console.log('handleSetBattingPair complete - striker should now be:', firstBatsmanId);
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

  const handleRestartMatch = async () => {
    if (!window.confirm('Are you sure you want to restart this match? All scores and data will be deleted.')) {
      return;
    }

    try {
      await matchAPI.restartMatch(id);

      // Reset all local state
      setShowTossDialog(false);
      setTossData({ tossWinner: '', tossDecision: 'bat' });
      setBattingPair({ player1: '', player2: '' });
      setStriker('');
      setCurrentBatsman('');
      setCurrentBowler('');
      setShowPairSelection(false);
      setUsedPairs([]);
      setPairStartOver(0);
      setAdditionalRuns(0);
      setWicketType('none');
      setDismissedPlayer('');
      setLastBowler('');

      // Refresh match data
      await fetchMatch();

      alert('Match restarted successfully!');
    } catch (error) {
      console.error('Error restarting match:', error);
      alert('Error restarting match: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleQuickScore = async (scoreType) => {
    if (!battingPair.player1 || !battingPair.player2) {
      alert('Please select the batting pair first');
      return;
    }

    // Use striker or player1 as fallback for currentBatsman
    let effectiveBatsman = currentBatsman;
    if (!effectiveBatsman || effectiveBatsman === '') {
      effectiveBatsman = striker || battingPair.player1;
      if (effectiveBatsman && effectiveBatsman !== '') {
        console.log('Using striker/player1 as batsman:', effectiveBatsman);
        setCurrentBatsman(effectiveBatsman); // Update state for next time
      } else {
        alert('Current batsman not set. Please select the batting pair again.');
        console.error('Batsman state:', { currentBatsman, striker, battingPair });
        return;
      }
    }

    if (!currentBowler || currentBowler === '') {
      alert('Please select the bowler');
      return;
    }

    // YYC Rule: A bowler cannot bowl 2 continuous overs
    const currentInnings = match.innings[match.currentInnings - 1];
    const currentBall = currentInnings.balls % 4;

    // If this is the first ball of a new over (ball 0 of the over)
    if (currentBall === 0 && currentInnings.balls > 0) {
      // Check if the current bowler is the same as the last over's bowler
      if (lastBowler && currentBowler === lastBowler) {
        alert('A bowler cannot bowl 2 continuous overs. Please select a different bowler.');
        return;
      }
    }

    // Ensure we have valid IDs (not empty strings)
    const validBatsman = effectiveBatsman && effectiveBatsman !== '' ? effectiveBatsman : null;
    const validBowler = currentBowler && currentBowler !== '' ? currentBowler : null;

    if (!validBatsman || !validBowler) {
      alert('Invalid batsman or bowler selection. Please reselect.');
      console.error('Invalid IDs:', { batsman: effectiveBatsman, bowler: currentBowler });
      return;
    }

    let ballData = {
      batsman: validBatsman,
      bowler: validBowler,
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
      case 'ceiling_backwall':
        ballData.boundaryType = 'ceiling_backwall';
        ballData.additionalRuns = 0; // Fixed 4 runs, no additional
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
        // Sanitize dismissedPlayer - use validBatsman instead of currentBatsman
        const validDismissedPlayer = (dismissedPlayer && dismissedPlayer !== '') ? dismissedPlayer : validBatsman;
        ballData.dismissedPlayer = validDismissedPlayer;
        break;
      default:
        // Unknown score type, do nothing
        break;
    }

    try {
      console.log('Sending ball data:', ballData);
      const response = await matchAPI.updateBall(id, ballData);
      console.log('Ball update response received');

      const currentInnings = match.innings[match.currentInnings - 1];
      const currentBall = currentInnings.balls % 4;

      // Rotate strike logic
      // YYC Rules:
      // 1. After wicket, swap striker (new batsman comes, non-striker faces next ball)
      // 2. After odd runs (1, 3), swap striker
      // 3. DO NOT swap on over end - striker continues

      let shouldRotate = false;

      // YYC Rule: Strike changes on wicket
      if (ballData.isWicket) {
        shouldRotate = true;
      }
      // Check for odd runs (1, 3)
      else if (scoreType === '1' || scoreType === '3') {
        shouldRotate = true;
      }
      // Check if boundary with odd additional runs
      else if ((ballData.boundaryType !== 'none' && ballData.additionalRuns % 2 === 1)) {
        shouldRotate = true;
      }

      if (shouldRotate) {
        rotateStrike();
      }

      // Reset form
      setAdditionalRuns(0);
      setWicketType('none');
      setDismissedPlayer('');

      // Update last bowler at the end of an over (when ball 4 is completed)
      const newBall = (currentInnings.balls + 1) % 4;
      if (newBall === 0) {
        // Over just completed, save this bowler as last bowler
        setLastBowler(validBowler);
      }

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

  // Get available batsmen (filter out players who can't form new pairs)
  const availableBatsmen = getAvailableBatsmen(battingTeamPlayers);

  // Get available bowlers (filter out those who bowled 2 overs already)
  const maxOversPerBowler = 2;
  const availableBowlers = bowlingTeamPlayers.filter(bowler => {
    const oversCompleted = getBowlerOvers(bowler._id);
    return oversCompleted < maxOversPerBowler;
  });

  return (
    <div className="container">
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Match {match.matchNumber}: {match.team1.name} vs {match.team2.name}</span>
          <button
            className="btn btn-danger"
            onClick={handleRestartMatch}
            style={{ padding: '0.5rem 1rem' }}
          >
            🔄 Restart Match
          </button>
        </div>

        {match.status === 'scheduled' && (
          <div>
            <p>Match is scheduled for {new Date(match.date).toLocaleDateString()}</p>
            {match.time && <p>Time: {match.time}</p>}

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
                  <p>{match.innings[0].balls === 0 ? '0.0' : `${Math.floor((match.innings[0].balls - 1) / 4)}.${((match.innings[0].balls - 1) % 4) + 1}`} overs</p>
                </div>
                {match.innings[1] && (
                  <>
                    <div>vs</div>
                    <div className="team-score">
                      <h3>{match.innings[1].battingTeam === match.team1._id ? match.team1.shortName : match.team2.shortName}</h3>
                      <div className="score">{match.innings[1].runs}/{match.innings[1].wickets}</div>
                      <p>{match.innings[1].balls === 0 ? '0.0' : `${Math.floor((match.innings[1].balls - 1) / 4)}.${((match.innings[1].balls - 1) % 4) + 1}`} overs</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Score Input Interface */}
            <div className="score-input">
              <h3 style={{ marginBottom: '1.5rem', color: '#667eea' }}>Score Input</h3>

              <div className="current-ball-info">
                <p><strong>Current Over:</strong> {currentInnings.balls === 0 ? '0.0' : `${Math.floor((currentInnings.balls - 1) / 4)}.${((currentInnings.balls - 1) % 4) + 1}`}</p>
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
              {showPairSelection && (
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

                  {/* Player Status Overview */}
                  <div style={{
                    background: 'rgba(255,255,255,0.9)',
                    padding: '0.75rem',
                    borderRadius: '5px',
                    marginBottom: '1rem',
                    fontSize: '0.85rem'
                  }}>
                    <strong>Team Status:</strong>
                    <div style={{ marginTop: '0.5rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.25rem' }}>
                      {battingTeamPlayers.map(player => {
                        const status = getPlayerBattingStatus(player._id, true);
                        const isCompleted = hasPlayerCompletedOvers(player._id);
                        return (
                          <div key={player._id} style={{
                            color: isCompleted ? '#6c757d' : '#000',
                            textDecoration: isCompleted ? 'line-through' : 'none'
                          }}>
                            {player.name}{status}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#666' }}>
                      🟢 Available &nbsp;&nbsp;
                      🟡 Batted &nbsp;&nbsp;
                      🔴 <s>Completed</s>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Batsman 1</label>
                    <select
                      className="form-select"
                      value={battingPair.player1}
                      onChange={(e) => setBattingPair({...battingPair, player1: e.target.value})}
                    >
                      <option value="">Select Player 1</option>
                      {availableBatsmen.map(player => {
                        const status = getPlayerBattingStatus(player._id);
                        const isDisabled = battingPair.player2 === player._id;
                        return (
                          <option key={player._id} value={player._id} disabled={isDisabled}>
                            {player.name}{status}{isDisabled ? ' (Already selected as Player 2)' : ''}
                          </option>
                        );
                      })}
                    </select>
                    {availableBatsmen.length === 0 && (
                      <small style={{ color: '#dc3545', marginTop: '0.25rem', display: 'block' }}>
                        No available batsmen - all have completed their overs
                      </small>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Batsman 2</label>
                    <select
                      className="form-select"
                      value={battingPair.player2}
                      onChange={(e) => setBattingPair({...battingPair, player2: e.target.value})}
                    >
                      <option value="">Select Player 2</option>
                      {availableBatsmen.map(player => {
                        const status = getPlayerBattingStatus(player._id);
                        const isDisabled = battingPair.player1 === player._id;
                        return (
                          <option key={player._id} value={player._id} disabled={isDisabled}>
                            {player.name}{status}{isDisabled ? ' (Already selected as Player 1)' : ''}
                          </option>
                        );
                      })}
                    </select>
                    {availableBatsmen.length === 0 && (
                      <small style={{ color: '#dc3545', marginTop: '0.25rem', display: 'block' }}>
                        No available batsmen - all have completed their overs
                      </small>
                    )}
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
              {battingPair.player1 && battingPair.player2 && !showPairSelection && (() => {
                console.log('Rendering Current Pair - Player1:', battingPair.player1, 'Player2:', battingPair.player2, 'Striker:', striker);
                return null;
              })()}
              {battingPair.player1 && battingPair.player2 && !showPairSelection && (
                <div key={`${battingPair.player1}-${battingPair.player2}-${striker}`} style={{
                  background: 'linear-gradient(135deg, #10b981, #34d399)',
                  padding: '1rem',
                  borderRadius: '10px',
                  marginBottom: '1.5rem',
                  color: 'white',
                  border: '2px solid #059669'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: '1.1rem' }}>Current Pair:</strong>
                      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <div style={{
                          background: striker === battingPair.player1 ? '#fdbb2d' : 'rgba(255,255,255,0.4)',
                          color: striker === battingPair.player1 ? '#000' : '#fff',
                          padding: '0.5rem 0.8rem',
                          borderRadius: '5px',
                          fontWeight: 'bold',
                          display: 'inline-block',
                          minWidth: '120px',
                          border: striker === battingPair.player1 ? '2px solid #f59e0b' : '2px solid rgba(255,255,255,0.5)'
                        }}>
                          {battingTeamPlayers.find(p => p._id === battingPair.player1)?.name || 'Player 1'}
                        </div>
                        <div style={{
                          background: striker === battingPair.player2 ? '#fdbb2d' : 'rgba(255,255,255,0.4)',
                          color: striker === battingPair.player2 ? '#000' : '#fff',
                          padding: '0.5rem 0.8rem',
                          borderRadius: '5px',
                          fontWeight: 'bold',
                          display: 'inline-block',
                          minWidth: '120px',
                          border: striker === battingPair.player2 ? '2px solid #f59e0b' : '2px solid rgba(255,255,255,0.5)'
                        }}>
                          {battingTeamPlayers.find(p => p._id === battingPair.player2)?.name || 'Player 2'}
                        </div>
                      </div>
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={() => setShowPairSelection(true)}
                      style={{ padding: '0.5rem 1rem', marginLeft: '1rem' }}
                    >
                      Change Pair
                    </button>
                  </div>
                  <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', opacity: 0.9 }}>
                    Gold = On Strike | Overs {Math.floor(currentInnings.balls / 4) - pairStartOver}/2 completed
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
                  {availableBowlers.map(player => {
                    const oversCompleted = getBowlerOvers(player._id);
                    const oversRemaining = maxOversPerBowler - oversCompleted;
                    return (
                      <option key={player._id} value={player._id}>
                        {player.name} ({oversRemaining} over{oversRemaining !== 1 ? 's' : ''} remaining)
                      </option>
                    );
                  })}
                </select>
                {availableBowlers.length === 0 && (
                  <small style={{ color: '#dc3545', marginTop: '0.25rem', display: 'block' }}>
                    No available bowlers - all have completed their 2 overs
                  </small>
                )}
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
                    className="btn btn-info"
                    onClick={() => handleQuickScore('ceiling_backwall')}
                    style={{ padding: '1rem', fontSize: '0.95rem', background: 'linear-gradient(135deg, #0891b2, #06b6d4)', color: 'white' }}
                  >
                    Ceiling + Back Wall<br/>4 runs
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
