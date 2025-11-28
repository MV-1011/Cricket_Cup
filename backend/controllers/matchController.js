import Match from '../models/Match.js';
import Team from '../models/Team.js';
import Player from '../models/Player.js';

// Get all matches
export const getAllMatches = async (req, res) => {
  try {
    const matches = await Match.find()
      .populate('team1', 'name')
      .populate('team2', 'name')
      .populate('winner', 'name')
      .sort({ date: -1 });
    res.json(matches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get match by ID
export const getMatchById = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('team1', 'name')
      .populate('team2', 'name')
      .populate('winner', 'name')
      .populate('innings.battingScorecard.player', 'name')
      .populate('innings.bowlingScorecard.player', 'name')
      .populate('innings.ballByBall.bowler', 'name')
      .populate('innings.ballByBall.batsman', 'name')
      .populate('currentBattingPair.player1', 'name')
      .populate('currentBattingPair.player2', 'name')
      .populate('currentStriker', 'name')
      .populate('currentBowler', 'name');

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }
    res.json(match);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create match
export const createMatch = async (req, res) => {
  try {
    const match = new Match(req.body);
    const newMatch = await match.save();
    res.status(201).json(newMatch);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update match
export const updateMatch = async (req, res) => {
  try {
    const match = await Match.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('team1 team2 winner');

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }
    res.json(match);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete match
export const deleteMatch = async (req, res) => {
  try {
    const match = await Match.findByIdAndDelete(req.params.id);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }
    res.json({ message: 'Match deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Start match
export const startMatch = async (req, res) => {
  try {
    const { tossWinner, tossDecision } = req.body;
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    match.status = 'live';
    match.tossWinner = tossWinner;
    match.tossDecision = tossDecision;

    // Initialize first innings
    const battingTeam = tossDecision === 'bat' ? tossWinner :
                       (match.team1.toString() === tossWinner.toString() ? match.team2 : match.team1);
    const bowlingTeam = tossDecision === 'bat' ?
                       (match.team1.toString() === tossWinner.toString() ? match.team2 : match.team1) : tossWinner;

    match.innings.push({
      battingTeam,
      bowlingTeam,
      runs: 0,
      wickets: 0,
      overs: 0,
      balls: 0,
      extras: 0,
      ballByBall: [],
      battingScorecard: [],
      bowlingScorecard: []
    });

    await match.save();
    res.json(match);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update ball by ball
export const updateBallByBall = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const { bowler, batsman, runs, extras, extraType, isWicket, wicketType, dismissedPlayer, boundaryType, additionalRuns, currentBattingPair, currentStriker, pairStartOver } = req.body;
    const currentInnings = match.innings[match.currentInnings - 1];

    // Sanitize empty strings to null for ObjectId fields
    const sanitizedBowler = bowler && bowler !== '' ? bowler : null;
    const sanitizedBatsman = batsman && batsman !== '' ? batsman : null;
    const sanitizedDismissedPlayer = dismissedPlayer && dismissedPlayer !== '' ? dismissedPlayer : null;

    // Validate required fields
    if (!sanitizedBowler || !sanitizedBatsman) {
      return res.status(400).json({ message: 'Bowler and batsman are required fields' });
    }

    // YYC Rule: No-balls and wides are 4 runs each
    const extrasPenalty = (extraType === 'wide' || extraType === 'noball') ? 4 : (extras || 0);

    // Calculate boundary runs based on YYC rules
    let boundaryRuns = 0;
    const addRuns = additionalRuns || 0;

    if (boundaryType === 'straight_wall_air') {
      boundaryRuns = 6 + Math.min(addRuns, 2); // 6 + max 2 additional
    } else if (boundaryType === 'straight_wall_ground') {
      boundaryRuns = 4 + addRuns; // 4 + any runs
    } else if (boundaryType === 'ceiling') {
      boundaryRuns = 2 + addRuns; // 2 + extra runs
    } else if (boundaryType === 'ceiling_backwall') {
      boundaryRuns = 4; // Fixed 4 runs (YYC Rule: ceiling then back wall)
    } else if (boundaryType === 'side_wall_air') {
      boundaryRuns = 2 + addRuns; // 2 + extra runs
    } else if (boundaryType === 'side_wall_ground') {
      boundaryRuns = 1 + addRuns; // 1 + extra runs
    } else if (boundaryType === 'net_air') {
      boundaryRuns = 2 + Math.min(addRuns, 2); // 2 + max 2 additional
    } else if (boundaryType === 'net_ground') {
      boundaryRuns = 1 + Math.min(addRuns, 2); // 1 + max 2 additional
    } else {
      boundaryRuns = runs || 0; // Normal runs
    }

    // YYC CRITICAL RULE: "When a player is declared out, the ball is dead, and 4 runs will be deducted.
    // No runs scored before being out will be counted."
    // This means: If wicket, ignore all runs on that ball and apply -4 penalty
    const finalBoundaryRuns = isWicket ? 0 : boundaryRuns;
    const wicketPenalty = isWicket ? -4 : 0;

    // Add ball to ball-by-ball
    const ballData = {
      overNumber: Math.floor(currentInnings.balls / 4) + 1,
      ballNumber: (currentInnings.balls % 4) + 1,
      bowler: sanitizedBowler,
      batsman: sanitizedBatsman,
      runs: finalBoundaryRuns,
      extras: extrasPenalty,
      extraType: extraType || 'none',
      isWicket: isWicket || false,
      wicketType: wicketType || 'none',
      dismissedPlayer: sanitizedDismissedPlayer,
      boundaryType: boundaryType || 'none',
      additionalRuns: addRuns
    };

    currentInnings.ballByBall.push(ballData);

    // Update innings totals
    currentInnings.runs += finalBoundaryRuns + extrasPenalty + wicketPenalty;

    // YYC Rule: In last 2 overs, wides/no-balls ARE re-bowled
    // In first 6 overs, wides/no-balls are NOT re-bowled
    const isLast2Overs = currentInnings.balls >= 24; // 6 overs * 4 balls = 24 balls
    const shouldReBowl = isLast2Overs && (extraType === 'wide' || extraType === 'noball');

    // Only increment balls and overs if not a wide/no-ball OR if in last 2 overs (re-bowled)
    if (extraType !== 'wide' && extraType !== 'noball') {
      currentInnings.balls += 1;
      currentInnings.overs = Math.floor(currentInnings.balls / 4) + (currentInnings.balls % 4) / 10;
    } else if (!shouldReBowl) {
      // First 6 overs: wides/no-balls NOT re-bowled, so increment ball count
      currentInnings.balls += 1;
      currentInnings.overs = Math.floor(currentInnings.balls / 4) + (currentInnings.balls % 4) / 10;
    }
    // If shouldReBowl is true (last 2 overs), don't increment ball count

    if (extrasPenalty > 0) {
      currentInnings.extras += extrasPenalty;
    }

    if (isWicket) {
      currentInnings.wickets += 1;
    }

    // Update batting scorecard
    console.log('Looking for batsman in scorecard:', sanitizedBatsman.toString());
    console.log('Current batting scorecard:', currentInnings.battingScorecard.map(b => ({
      playerId: b.player._id ? b.player._id.toString() : b.player.toString(),
      playerObj: b.player,
      runs: b.runs,
      balls: b.balls
    })));

    let batsmanScore = currentInnings.battingScorecard.find(
      b => {
        const playerId = b.player._id ? b.player._id.toString() : b.player.toString();
        console.log(`Comparing ${playerId} === ${sanitizedBatsman.toString()}: ${playerId === sanitizedBatsman.toString()}`);
        return playerId === sanitizedBatsman.toString();
      }
    );

    console.log('Found batsman in scorecard:', batsmanScore ? 'YES' : 'NO');

    let isNewBatsman = false;
    let batsmanIndex = -1;
    if (!batsmanScore) {
      batsmanScore = {
        player: sanitizedBatsman,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        isOut: false,
        howOut: ''
      };
      currentInnings.battingScorecard.push(batsmanScore);
      batsmanIndex = currentInnings.battingScorecard.length - 1;
      isNewBatsman = true;
    } else {
      // Find the index of the batsman in the scorecard
      batsmanIndex = currentInnings.battingScorecard.findIndex(
        b => {
          const playerId = b.player._id ? b.player._id.toString() : b.player.toString();
          return playerId === sanitizedBatsman.toString();
        }
      );
    }

    // YYC Rule: Batsman ball count
    // First 6 overs: All balls count (including wide/no-ball)
    // Last 2 overs: Wide/no-ball doesn't count
    console.log('Ball increment check:', { extraType, shouldReBowl, isWicket, finalBoundaryRuns });
    if (extraType !== 'wide' && extraType !== 'noball') {
      // Normal ball always counts
      console.log('Incrementing batsman balls (normal ball)');
      currentInnings.battingScorecard[batsmanIndex].balls += 1;
    } else if (!shouldReBowl) {
      // First 6 overs: wide/no-ball DOES count for batsman
      console.log('Incrementing batsman balls (wide/noball in first 6 overs)');
      currentInnings.battingScorecard[batsmanIndex].balls += 1;
    }
    console.log('Batsman balls after increment:', currentInnings.battingScorecard[batsmanIndex].balls);
    // Last 2 overs: wide/no-ball does NOT count (shouldReBowl = true)

    // YYC Rule: Only add runs if NOT a wicket (wicket = no runs counted)
    // Batsmen can score off no balls (4 runs + any from bat)
    if (!isWicket) {
      if (extraType === 'none' || extraType === 'noball') {
        currentInnings.battingScorecard[batsmanIndex].runs += finalBoundaryRuns;
        console.log(`Added ${finalBoundaryRuns} runs to batsman. New total: ${currentInnings.battingScorecard[batsmanIndex].runs}`);
      }
    }

    console.log('After ball updates - Batsman:', {
      runs: currentInnings.battingScorecard[batsmanIndex].runs,
      balls: currentInnings.battingScorecard[batsmanIndex].balls,
      strikeRate: currentInnings.battingScorecard[batsmanIndex].strikeRate
    });

    // Count fours and sixes based on boundary type (only if not out)
    if (!isWicket) {
      if (boundaryType === 'four') currentInnings.battingScorecard[batsmanIndex].fours += 1;
      if (boundaryType === 'six') currentInnings.battingScorecard[batsmanIndex].sixes += 1;
    }

    // YYC Rule: When wicket, deduct 4 runs from batsman's score
    // The dismissed player gets the penalty
    if (isWicket && sanitizedDismissedPlayer) {
      console.log('WICKET DETECTED!');
      console.log('Dismissed Player ID:', sanitizedDismissedPlayer.toString());
      console.log('Current Batsman ID:', sanitizedBatsman.toString());
      console.log('Current Batting Scorecard:', currentInnings.battingScorecard.map(b => ({
        player: b.player._id ? b.player._id.toString() : b.player.toString(),
        runs: b.runs,
        balls: b.balls
      })));

      // Find the dismissed batsman in scorecard (might be different from current batsman)
      let dismissedBatsmanScore = currentInnings.battingScorecard.find(
        b => {
          const playerId = b.player._id ? b.player._id.toString() : b.player.toString();
          return playerId === sanitizedDismissedPlayer.toString();
        }
      );

      console.log('Found dismissed batsman in scorecard:', dismissedBatsmanScore ? 'YES' : 'NO');
      if (dismissedBatsmanScore) {
        console.log('Dismissed batsman runs BEFORE penalty:', dismissedBatsmanScore.runs);
      }

      // If dismissed batsman not found (shouldn't happen), use current batsman
      if (!dismissedBatsmanScore) {
        console.log('WARNING: Dismissed batsman not found, using current batsman');
        dismissedBatsmanScore = batsmanScore;
      }

      dismissedBatsmanScore.isOut = true;
      dismissedBatsmanScore.howOut = wicketType;
      dismissedBatsmanScore.runs -= 4; // Wicket penalty (in addition to no runs being counted on that ball)

      console.log('Dismissed batsman runs AFTER penalty:', dismissedBatsmanScore.runs);

      // Recalculate strike rate after penalty
      dismissedBatsmanScore.strikeRate = dismissedBatsmanScore.balls > 0
        ? ((dismissedBatsmanScore.runs / dismissedBatsmanScore.balls) * 100).toFixed(2)
        : 0;
    } else {
      // No wicket, just calculate strike rate normally
      currentInnings.battingScorecard[batsmanIndex].strikeRate = currentInnings.battingScorecard[batsmanIndex].balls > 0
        ? ((currentInnings.battingScorecard[batsmanIndex].runs / currentInnings.battingScorecard[batsmanIndex].balls) * 100).toFixed(2)
        : 0;
    }

    // Update bowling scorecard
    let bowlerStats = currentInnings.bowlingScorecard.find(
      b => {
        const playerId = b.player._id ? b.player._id.toString() : b.player.toString();
        return playerId === sanitizedBowler.toString();
      }
    );

    let isNewBowler = false;
    let bowlerIndex = -1;
    if (!bowlerStats) {
      bowlerStats = {
        player: sanitizedBowler,
        overs: 0,
        balls: 0,
        runs: 0,
        wickets: 0,
        maidens: 0,
        economy: 0
      };
      currentInnings.bowlingScorecard.push(bowlerStats);
      bowlerIndex = currentInnings.bowlingScorecard.length - 1;
      isNewBowler = true;
    } else {
      // Find the index of the bowler in the scorecard
      bowlerIndex = currentInnings.bowlingScorecard.findIndex(
        b => {
          const playerId = b.player._id ? b.player._id.toString() : b.player.toString();
          return playerId === sanitizedBowler.toString();
        }
      );
    }

    // YYC Rule: Bowler ball count
    // First 6 overs: All balls count (including wide/no-ball)
    // Last 2 overs: Wide/no-ball doesn't count
    if (extraType !== 'wide' && extraType !== 'noball') {
      // Normal ball always counts
      currentInnings.bowlingScorecard[bowlerIndex].balls += 1;
      currentInnings.bowlingScorecard[bowlerIndex].overs = Math.floor(currentInnings.bowlingScorecard[bowlerIndex].balls / 4) + (currentInnings.bowlingScorecard[bowlerIndex].balls % 4) / 10;
    } else if (!shouldReBowl) {
      // First 6 overs: wide/no-ball DOES count for bowler
      currentInnings.bowlingScorecard[bowlerIndex].balls += 1;
      currentInnings.bowlingScorecard[bowlerIndex].overs = Math.floor(currentInnings.bowlingScorecard[bowlerIndex].balls / 4) + (currentInnings.bowlingScorecard[bowlerIndex].balls % 4) / 10;
    }
    // Last 2 overs: wide/no-ball does NOT count (shouldReBowl = true)

    // Bowler gets charged for runs + extras + wicket penalty
    currentInnings.bowlingScorecard[bowlerIndex].runs += finalBoundaryRuns + extrasPenalty + wicketPenalty;

    if (isWicket) {
      currentInnings.bowlingScorecard[bowlerIndex].wickets += 1;
    }

    const totalOvers = Math.floor(currentInnings.bowlingScorecard[bowlerIndex].balls / 4);
    currentInnings.bowlingScorecard[bowlerIndex].economy = totalOvers > 0
      ? (currentInnings.bowlingScorecard[bowlerIndex].runs / totalOvers).toFixed(2)
      : 0;

    // Mark nested arrays as modified for Mongoose to detect changes
    // This is crucial for Mongoose to save updates to scorecard entries
    // Must be called on EVERY ball, not just when new entries are added
    match.markModified('innings');

    // Check if innings ended
    if (currentInnings.wickets >= 7 || currentInnings.balls >= match.maxOvers * 4) {
      if (match.currentInnings === 1) {
        // Start second innings
        match.currentInnings = 2;
        match.innings.push({
          battingTeam: currentInnings.bowlingTeam,
          bowlingTeam: currentInnings.battingTeam,
          runs: 0,
          wickets: 0,
          overs: 0,
          balls: 0,
          extras: 0,
          ballByBall: [],
          battingScorecard: [],
          bowlingScorecard: []
        });
      } else {
        // Match ended
        match.status = 'completed';
        await calculateMatchResult(match);
      }
    }

    console.log('BEFORE SAVE - Batsman scorecard:', currentInnings.battingScorecard.map(b => ({
      player: b.player._id ? b.player._id.toString() : b.player.toString(),
      runs: b.runs,
      balls: b.balls,
      strikeRate: b.strikeRate
    })));
    console.log('BEFORE SAVE - Bowler scorecard:', currentInnings.bowlingScorecard.map(b => ({
      player: b.player._id ? b.player._id.toString() : b.player.toString(),
      runs: b.runs,
      balls: b.balls,
      overs: b.overs
    })));

    // Save current match state for persistence (batting pair, striker, bowler, pair start over)
    if (currentBattingPair) {
      match.currentBattingPair = {
        player1: currentBattingPair.player1 || null,
        player2: currentBattingPair.player2 || null
      };
    }
    if (currentStriker) {
      match.currentStriker = currentStriker;
    }
    if (sanitizedBowler) {
      match.currentBowler = sanitizedBowler;
    }
    if (pairStartOver !== undefined) {
      match.pairStartOver = pairStartOver;
    }

    await match.save();

    console.log('AFTER SAVE - Fetching match to verify...');
    const savedMatch = await Match.findById(match._id).populate('team1').populate('team2');
    const savedInnings = savedMatch.innings[savedMatch.currentInnings - 1];
    console.log('AFTER SAVE - Batsman scorecard:', savedInnings.battingScorecard.map(b => ({
      player: b.player._id ? b.player._id.toString() : b.player.toString(),
      runs: b.runs,
      balls: b.balls,
      strikeRate: b.strikeRate
    })));
    console.log('AFTER SAVE - Bowler scorecard:', savedInnings.bowlingScorecard.map(b => ({
      player: b.player._id ? b.player._id.toString() : b.player.toString(),
      runs: b.runs,
      balls: b.balls,
      overs: b.overs
    })));

    // Reconcile scores after saving
    const reconciliation = reconcileInningsScore(currentInnings);
    if (!reconciliation.isValid) {
      console.warn('⚠️  Score reconciliation warning for match', match.matchNumber);
      console.warn('   Discrepancies:', reconciliation.discrepancies);
      console.warn('   Details:', reconciliation);
    } else {
      console.log('✅ Score reconciliation passed for match', match.matchNumber);
    }

    // Emit socket event for real-time update
    if (req.io) {
      req.io.emit('matchUpdate', match);
    }

    res.json(match);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Reconcile innings score to ensure data integrity
function reconcileInningsScore(innings) {
  // Calculate total runs from batting scorecard
  const batsmenRuns = innings.battingScorecard.reduce((sum, batsman) => sum + batsman.runs, 0);

  // Calculate total runs from bowling scorecard
  const bowlersRunsConceded = innings.bowlingScorecard.reduce((sum, bowler) => sum + bowler.runs, 0);

  // Calculate runs from ball-by-ball
  const ballByBallRuns = innings.ballByBall.reduce((sum, ball) => sum + ball.runs + ball.extras, 0);

  // Expected total: batsmen runs + extras
  const expectedTotal = batsmenRuns + innings.extras;

  const reconciliation = {
    inningsTotal: innings.runs,
    batsmenRuns,
    extras: innings.extras,
    expectedTotal,
    bowlersRunsConceded,
    ballByBallRuns,
    isValid: innings.runs === expectedTotal &&
             innings.runs === bowlersRunsConceded &&
             innings.runs === ballByBallRuns,
    discrepancies: []
  };

  if (innings.runs !== expectedTotal) {
    reconciliation.discrepancies.push(`Innings total (${innings.runs}) != Batsmen + Extras (${expectedTotal})`);
  }

  if (innings.runs !== bowlersRunsConceded) {
    reconciliation.discrepancies.push(`Innings total (${innings.runs}) != Bowlers conceded (${bowlersRunsConceded})`);
  }

  if (innings.runs !== ballByBallRuns) {
    reconciliation.discrepancies.push(`Innings total (${innings.runs}) != Ball-by-ball total (${ballByBallRuns})`);
  }

  return reconciliation;
}

// Calculate match result and update team standings
async function calculateMatchResult(match) {
  const innings1 = match.innings[0];
  const innings2 = match.innings[1];

  if (innings2.runs > innings1.runs) {
    match.winner = innings2.battingTeam;
    const wicketsLeft = 8 - innings2.wickets;
    match.resultText = `${match.winner} won by ${wicketsLeft} wickets`;
  } else if (innings1.runs > innings2.runs) {
    match.winner = innings1.battingTeam;
    const runsMargin = innings1.runs - innings2.runs;
    match.resultText = `${match.winner} won by ${runsMargin} runs`;
  } else {
    match.resultText = 'Match tied';
  }

  // Update team standings
  if (match.winner) {
    await Team.findByIdAndUpdate(match.winner, {
      $inc: { matchesPlayed: 1, matchesWon: 1, points: 2 }
    });

    const loser = match.winner.toString() === match.team1.toString() ? match.team2 : match.team1;
    await Team.findByIdAndUpdate(loser, {
      $inc: { matchesPlayed: 1, matchesLost: 1 }
    });
  } else {
    // Tie - both teams get 1 point
    await Team.findByIdAndUpdate(match.team1, {
      $inc: { matchesPlayed: 1, points: 1 }
    });
    await Team.findByIdAndUpdate(match.team2, {
      $inc: { matchesPlayed: 1, points: 1 }
    });
  }

  // Update player statistics
  for (const innings of match.innings) {
    for (const batting of innings.battingScorecard) {
      const player = await Player.findById(batting.player);
      if (player) {
        player.battingStats.innings += 1;
        player.battingStats.runs += batting.runs;
        player.battingStats.ballsFaced += batting.balls;
        player.battingStats.fours += batting.fours;
        player.battingStats.sixes += batting.sixes;
        if (!batting.isOut) player.battingStats.notOuts += 1;
        if (batting.runs > player.battingStats.highestScore) {
          player.battingStats.highestScore = batting.runs;
        }
        player.calculateBattingAverage();
        player.calculateStrikeRate();
        await player.save();
      }
    }

    for (const bowling of innings.bowlingScorecard) {
      const player = await Player.findById(bowling.player);
      if (player) {
        player.bowlingStats.innings += 1;
        player.bowlingStats.balls += bowling.balls;
        player.bowlingStats.overs = player.bowlingStats.balls / 4;
        player.bowlingStats.runsConceded += bowling.runs;
        player.bowlingStats.wickets += bowling.wickets;
        player.calculateBowlingAverage();
        player.calculateEconomy();
        await player.save();
      }
    }
  }
}

// Get live matches
export const getLiveMatches = async (req, res) => {
  try {
    const matches = await Match.find({ status: 'live' })
      .populate('team1', 'name')
      .populate('team2', 'name');
    res.json(matches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Restart match - clear all scores and reset to scheduled
export const restartMatch = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    // Reset match to initial state
    match.status = 'scheduled';
    match.currentInnings = 1;
    match.tossWinner = null;
    match.tossDecision = null;
    match.battingFirst = null;
    match.winner = null;
    match.resultText = '';
    match.innings = [];

    await match.save();
    res.json({ message: 'Match restarted successfully', match });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Undo the last ball
export const undoLastBall = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const currentInnings = match.innings[match.currentInnings - 1];
    if (!currentInnings || currentInnings.ballByBall.length === 0) {
      return res.status(400).json({ message: 'No balls to undo' });
    }

    // Get the last ball
    const lastBall = currentInnings.ballByBall[currentInnings.ballByBall.length - 1];

    // Reverse the runs
    currentInnings.runs -= lastBall.runs;

    // Reverse extras
    if (lastBall.extraType !== 'none') {
      currentInnings.extras -= lastBall.extras;
    }

    // Reverse wicket
    if (lastBall.isWicket) {
      currentInnings.wickets -= 1;
      // Find the dismissed batsman and restore their stats
      const batsmanIndex = currentInnings.battingScorecard.findIndex(
        b => b.player.toString() === lastBall.dismissedPlayer.toString()
      );
      if (batsmanIndex !== -1) {
        currentInnings.battingScorecard[batsmanIndex].isOut = false;
        currentInnings.battingScorecard[batsmanIndex].howOut = '';
        currentInnings.battingScorecard[batsmanIndex].runs += 4; // Restore wicket penalty
      }
    }

    // Reverse batsman stats
    const batsmanIndex = currentInnings.battingScorecard.findIndex(
      b => b.player.toString() === lastBall.batsman.toString()
    );
    if (batsmanIndex !== -1) {
      const batsmanScore = currentInnings.battingScorecard[batsmanIndex];

      // Only reverse ball count if it wasn't an extra (wide/noball in first 6 overs)
      if (lastBall.extraType === 'none' || lastBall.isWicket) {
        batsmanScore.balls -= 1;
      }

      // Reverse runs (but not if it was a wicket, as runs aren't added on wicket)
      if (!lastBall.isWicket && lastBall.extraType === 'none') {
        batsmanScore.runs -= lastBall.runs;
      }

      // Reverse fours/sixes
      if (lastBall.boundaryType === 'four') batsmanScore.fours -= 1;
      if (lastBall.boundaryType === 'six') batsmanScore.sixes -= 1;

      // Recalculate strike rate
      batsmanScore.strikeRate = batsmanScore.balls > 0
        ? ((batsmanScore.runs / batsmanScore.balls) * 100).toFixed(2)
        : 0;
    }

    // Reverse bowler stats
    const bowlerIndex = currentInnings.bowlingScorecard.findIndex(
      b => b.player.toString() === lastBall.bowler.toString()
    );
    if (bowlerIndex !== -1) {
      const bowlerStats = currentInnings.bowlingScorecard[bowlerIndex];

      // Only reverse ball count if it wasn't a re-bowled wide/noball
      if (lastBall.extraType === 'none' || lastBall.isWicket) {
        bowlerStats.balls -= 1;
      }

      // Reverse runs
      if (!lastBall.isWicket) {
        bowlerStats.runs -= lastBall.runs;
      } else {
        bowlerStats.runs += 4; // Restore the 4 runs deducted on wicket
      }

      // Reverse wickets
      if (lastBall.isWicket) {
        bowlerStats.wickets -= 1;
      }

      // Recalculate overs and economy
      bowlerStats.overs = Math.floor(bowlerStats.balls / 4) + (bowlerStats.balls % 4) / 10;
      bowlerStats.economy = bowlerStats.overs > 0
        ? (bowlerStats.runs / Math.floor(bowlerStats.balls / 4)).toFixed(2)
        : 0;
    }

    // Reverse ball count (only if not a re-bowled extra)
    if (lastBall.extraType === 'none' || lastBall.isWicket) {
      currentInnings.balls -= 1;
      currentInnings.overs = Math.floor(currentInnings.balls / 4) + (currentInnings.balls % 4) / 10;
    }

    // Remove the ball from ballByBall array
    currentInnings.ballByBall.pop();

    // Mark the innings as modified
    match.markModified('innings');

    await match.save();
    res.json({ message: 'Last ball undone successfully', match });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
