const Match = require('../models/Match');
const Team = require('../models/Team');
const Player = require('../models/Player');

// Get all matches
exports.getAllMatches = async (req, res) => {
  try {
    const matches = await Match.find()
      .populate('team1', 'name shortName')
      .populate('team2', 'name shortName')
      .populate('winner', 'name shortName')
      .sort({ date: -1 });
    res.json(matches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get match by ID
exports.getMatchById = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('team1', 'name shortName')
      .populate('team2', 'name shortName')
      .populate('winner', 'name shortName')
      .populate('innings.battingScorecard.player', 'name')
      .populate('innings.bowlingScorecard.player', 'name')
      .populate('innings.ballByBall.bowler', 'name')
      .populate('innings.ballByBall.batsman', 'name');

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }
    res.json(match);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create match
exports.createMatch = async (req, res) => {
  try {
    const match = new Match(req.body);
    const newMatch = await match.save();
    res.status(201).json(newMatch);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update match
exports.updateMatch = async (req, res) => {
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
exports.deleteMatch = async (req, res) => {
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
exports.startMatch = async (req, res) => {
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
exports.updateBallByBall = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const { bowler, batsman, runs, extras, extraType, isWicket, wicketType, dismissedPlayer, boundaryType, additionalRuns } = req.body;
    const currentInnings = match.innings[match.currentInnings - 1];

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

    // Add ball to ball-by-ball
    const ballData = {
      overNumber: Math.floor(currentInnings.balls / 4) + 1,
      ballNumber: (currentInnings.balls % 4) + 1,
      bowler,
      batsman,
      runs: boundaryRuns,
      extras: extrasPenalty,
      extraType: extraType || 'none',
      isWicket: isWicket || false,
      wicketType: wicketType || 'none',
      dismissedPlayer: dismissedPlayer || null,
      boundaryType: boundaryType || 'none',
      additionalRuns: addRuns
    };

    currentInnings.ballByBall.push(ballData);

    // Update innings totals
    currentInnings.runs += boundaryRuns + extrasPenalty;

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
    let batsmanScore = currentInnings.battingScorecard.find(
      b => b.player.toString() === batsman.toString()
    );

    if (!batsmanScore) {
      batsmanScore = {
        player: batsman,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        isOut: false,
        howOut: ''
      };
      currentInnings.battingScorecard.push(batsmanScore);
    }

    if (extraType !== 'wide' && extraType !== 'noball') {
      batsmanScore.balls += 1;
    }

    if (extraType === 'none' || extraType === 'noball') {
      batsmanScore.runs += boundaryRuns;
    }

    // Count fours and sixes based on boundary type
    if (boundaryType === 'straight_wall_ground') batsmanScore.fours += 1;
    if (boundaryType === 'straight_wall_air') batsmanScore.sixes += 1;

    batsmanScore.strikeRate = batsmanScore.balls > 0
      ? ((batsmanScore.runs / batsmanScore.balls) * 100).toFixed(2)
      : 0;

    if (isWicket && dismissedPlayer.toString() === batsman.toString()) {
      batsmanScore.isOut = true;
      batsmanScore.howOut = wicketType;
    }

    // Update bowling scorecard
    let bowlerStats = currentInnings.bowlingScorecard.find(
      b => b.player.toString() === bowler.toString()
    );

    if (!bowlerStats) {
      bowlerStats = {
        player: bowler,
        overs: 0,
        balls: 0,
        runs: 0,
        wickets: 0,
        maidens: 0,
        economy: 0
      };
      currentInnings.bowlingScorecard.push(bowlerStats);
    }

    if (extraType !== 'wide' && extraType !== 'noball') {
      bowlerStats.balls += 1;
      bowlerStats.overs = Math.floor(bowlerStats.balls / 4) + (bowlerStats.balls % 4) / 10;
    }

    bowlerStats.runs += boundaryRuns + extrasPenalty;

    if (isWicket) {
      bowlerStats.wickets += 1;
    }

    const totalOvers = Math.floor(bowlerStats.balls / 4);
    bowlerStats.economy = totalOvers > 0
      ? (bowlerStats.runs / totalOvers).toFixed(2)
      : 0;

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

    await match.save();

    // Emit socket event for real-time update
    if (req.io) {
      req.io.emit('matchUpdate', match);
    }

    res.json(match);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

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
exports.getLiveMatches = async (req, res) => {
  try {
    const matches = await Match.find({ status: 'live' })
      .populate('team1', 'name shortName')
      .populate('team2', 'name shortName');
    res.json(matches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
