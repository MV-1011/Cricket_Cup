import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Group from '../models/Group.js';
import Team from '../models/Team.js';
import Player from '../models/Player.js';
import Match from '../models/Match.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/yyc-cricket';

async function populateData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data (optional - comment out if you want to keep existing data)
    // await Group.deleteMany({});
    await Team.deleteMany({});
    await Player.deleteMany({});
    await Match.deleteMany({});

    // Create Groups (or use existing)
    console.log('Setting up groups...');
    let groups = [];
    for (const groupData of [
      { name: 'Group A', description: 'First group of teams' },
      { name: 'Group B', description: 'Second group of teams' },
      { name: 'Group C', description: 'Third group of teams' }
    ]) {
      let group = await Group.findOne({ name: groupData.name });
      if (!group) {
        group = await Group.create(groupData);
        console.log(`  Created group: ${groupData.name}`);
      } else {
        console.log(`  Found existing group: ${groupData.name}`);
      }
      groups.push(group);
    }
    console.log('✓ Groups ready');

    // Create Teams
    console.log('Creating teams...');
    const teams = await Team.insertMany([
      // Group A Teams
      { name: 'Warriors', shortName: 'WAR', group: 'Group A', matchesPlayed: 0, matchesWon: 0, matchesLost: 0, points: 0, netRunRate: 0 },
      { name: 'Knights', shortName: 'KNI', group: 'Group A', matchesPlayed: 0, matchesWon: 0, matchesLost: 0, points: 0, netRunRate: 0 },
      { name: 'Royals', shortName: 'ROY', group: 'Group A', matchesPlayed: 0, matchesWon: 0, matchesLost: 0, points: 0, netRunRate: 0 },

      // Group B Teams
      { name: 'Tigers', shortName: 'TIG', group: 'Group B', matchesPlayed: 0, matchesWon: 0, matchesLost: 0, points: 0, netRunRate: 0 },
      { name: 'Panthers', shortName: 'PAN', group: 'Group B', matchesPlayed: 0, matchesWon: 0, matchesLost: 0, points: 0, netRunRate: 0 },
      { name: 'Lions', shortName: 'LIO', group: 'Group B', matchesPlayed: 0, matchesWon: 0, matchesLost: 0, points: 0, netRunRate: 0 },

      // Group C Teams
      { name: 'Eagles', shortName: 'EAG', group: 'Group C', matchesPlayed: 0, matchesWon: 0, matchesLost: 0, points: 0, netRunRate: 0 },
      { name: 'Hawks', shortName: 'HAW', group: 'Group C', matchesPlayed: 0, matchesWon: 0, matchesLost: 0, points: 0, netRunRate: 0 },
      { name: 'Falcons', shortName: 'FAL', group: 'Group C', matchesPlayed: 0, matchesWon: 0, matchesLost: 0, points: 0, netRunRate: 0 }
    ]);
    console.log('✓ Created 9 teams across 3 groups');

    // Create Players for each team
    console.log('Creating players...');
    const playerNames = [
      'Rahul', 'Virat', 'Rohit', 'Dhoni', 'Hardik', 'Jadeja', 'Bumrah', 'Shami',
      'Arjun', 'Karan', 'Dev', 'Ravi', 'Sanjay', 'Amit', 'Vijay', 'Suresh'
    ];

    const allPlayers = [];
    for (const team of teams) {
      const teamPlayers = [];
      for (let i = 0; i < 8; i++) {
        const roles = ['Batsman', 'Batsman', 'All-rounder', 'All-rounder', 'Batsman', 'Bowler', 'Bowler', 'All-rounder'];
        const player = {
          name: `${playerNames[i]} ${team.name.substring(0, 3)}`,
          team: team._id,
          role: roles[i]
        };
        teamPlayers.push(player);
      }
      allPlayers.push(...teamPlayers);
    }
    const players = await Player.insertMany(allPlayers);
    console.log(`✓ Created ${players.length} players`);

    // Create Matches with realistic data
    console.log('Creating matches with data...');

    let matchCounter = 1;

    // Match 1: Warriors vs Knights (Group A)
    const match1 = await createMatch(teams[0], teams[1], players, 'Warriors', matchCounter++);

    // Match 2: Royals vs Warriors (Group A)
    const match2 = await createMatch(teams[2], teams[0], players, 'Warriors', matchCounter++);

    // Match 3: Knights vs Royals (Group A)
    const match3 = await createMatch(teams[1], teams[2], players, 'Royals', matchCounter++);

    // Match 4: Tigers vs Panthers (Group B)
    const match4 = await createMatch(teams[3], teams[4], players, 'Tigers', matchCounter++);

    // Match 5: Lions vs Tigers (Group B)
    const match5 = await createMatch(teams[5], teams[3], players, 'Lions', matchCounter++);

    // Match 6: Panthers vs Lions (Group B)
    const match6 = await createMatch(teams[4], teams[5], players, 'Panthers', matchCounter++);

    // Match 7: Eagles vs Hawks (Group C)
    const match7 = await createMatch(teams[6], teams[7], players, 'Eagles', matchCounter++);

    // Match 8: Falcons vs Eagles (Group C)
    const match8 = await createMatch(teams[8], teams[6], players, 'Falcons', matchCounter++);

    console.log('✓ Created 8 matches with complete scoring data');

    console.log('\n✅ Data population complete!');
    console.log('You can now view:');
    console.log('- Standings with 3 different groups');
    console.log('- Top performers with batting and bowling stats');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error populating data:', error);
    process.exit(1);
  }
}

async function createMatch(team1, team2, allPlayers, winnerName, matchNumber) {
  const team1Players = allPlayers.filter(p => p.team.toString() === team1._id.toString()).slice(0, 8);
  const team2Players = allPlayers.filter(p => p.team.toString() === team2._id.toString()).slice(0, 8);

  const isTeam1Winner = team1.name === winnerName;

  // Generate realistic scores
  const winningScore = 45 + Math.floor(Math.random() * 20); // 45-64
  const losingScore = winningScore - (5 + Math.floor(Math.random() * 15)); // Lose by 5-19 runs

  const team1Score = isTeam1Winner ? winningScore : losingScore;
  const team2Score = isTeam1Winner ? losingScore : winningScore;

  // Create match
  const match = new Match({
    matchNumber,
    team1: team1._id,
    team2: team2._id,
    date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date in last 7 days
    venue: 'YYC Cricket Ground',
    status: 'completed',
    winner: isTeam1Winner ? team1._id : team2._id,
    tossWinner: team1._id,
    tossDecision: 'bat'
  });

  // Innings 1 (Team batting first)
  const innings1Batsmen = generateBattingStats(team1Players, team1Score);
  const innings1Bowlers = generateBowlingStats(team2Players, team1Score);

  match.innings.push({
    battingTeam: team1._id,
    bowlingTeam: team2._id,
    runs: team1Score,
    wickets: Math.min(7, 3 + Math.floor(Math.random() * 4)),
    overs: 16,
    balls: 0,
    battingScorecard: innings1Batsmen,
    bowlingScorecard: innings1Bowlers,
    ballByBall: []
  });

  // Innings 2 (Team batting second)
  const innings2Batsmen = generateBattingStats(team2Players, team2Score);
  const innings2Bowlers = generateBowlingStats(team1Players, team2Score);

  match.innings.push({
    battingTeam: team2._id,
    bowlingTeam: team1._id,
    runs: team2Score,
    wickets: Math.min(7, 3 + Math.floor(Math.random() * 4)),
    overs: isTeam1Winner ? 16 : (14 + Math.floor(Math.random() * 2)),
    balls: isTeam1Winner ? 0 : Math.floor(Math.random() * 4),
    battingScorecard: innings2Batsmen,
    bowlingScorecard: innings2Bowlers,
    ballByBall: []
  });

  await match.save();

  // Update team stats
  const team1Overs = 16;
  const team2Overs = match.innings[1].overs + (match.innings[1].balls / 4);

  await Team.findByIdAndUpdate(team1._id, {
    $inc: {
      matchesPlayed: 1,
      matchesWon: isTeam1Winner ? 1 : 0,
      matchesLost: isTeam1Winner ? 0 : 1,
      points: isTeam1Winner ? 2 : 0
    },
    $set: {
      netRunRate: await calculateTeamNRR(team1._id)
    }
  });

  await Team.findByIdAndUpdate(team2._id, {
    $inc: {
      matchesPlayed: 1,
      matchesWon: isTeam1Winner ? 0 : 1,
      matchesLost: isTeam1Winner ? 1 : 0,
      points: isTeam1Winner ? 0 : 2
    },
    $set: {
      netRunRate: await calculateTeamNRR(team2._id)
    }
  });

  // Update player stats
  await updatePlayerStats(innings1Batsmen, innings1Bowlers);
  await updatePlayerStats(innings2Batsmen, innings2Bowlers);

  return match;
}

function generateBattingStats(players, totalRuns) {
  const batsmen = [];
  const numBatsmen = Math.min(6, players.length);
  let runsDistributed = 0;

  for (let i = 0; i < numBatsmen; i++) {
    const isLastBatsman = i === numBatsmen - 1;
    const remainingRuns = totalRuns - runsDistributed;

    let runs;
    if (isLastBatsman) {
      runs = remainingRuns;
    } else {
      const maxRuns = Math.min(20, remainingRuns - (numBatsmen - i - 1) * 2);
      runs = Math.floor(Math.random() * maxRuns);
    }

    const balls = runs + Math.floor(Math.random() * 8) + 2;
    const fours = Math.floor(runs / 8);
    const sixes = Math.floor(runs / 12);

    batsmen.push({
      player: players[i]._id,
      runs,
      balls,
      fours,
      sixes,
      strikeRate: balls > 0 ? ((runs / balls) * 100).toFixed(2) : 0,
      isOut: i < numBatsmen - 2,
      howOut: i < numBatsmen - 2 ? ['bowled', 'caught', 'lbw', 'run out'][Math.floor(Math.random() * 4)] : 'not out'
    });

    runsDistributed += runs;
  }

  return batsmen;
}

function generateBowlingStats(players, runsAgainst) {
  const bowlers = [];
  const numBowlers = Math.min(4, players.length);
  let runsDistributed = 0;

  for (let i = 0; i < numBowlers; i++) {
    const overs = 4;
    const balls = 0;

    const isLastBowler = i === numBowlers - 1;
    const remainingRuns = runsAgainst - runsDistributed;

    let runs;
    if (isLastBowler) {
      runs = remainingRuns;
    } else {
      runs = Math.floor(Math.random() * 18) + 5;
    }

    const wickets = Math.floor(Math.random() * 3);
    const totalBalls = (overs * 4) + balls;

    bowlers.push({
      player: players[i]._id,
      overs,
      balls,
      runs,
      wickets,
      maidens: 0,
      economy: totalBalls > 0 ? ((runs / totalBalls) * 4).toFixed(2) : 0
    });

    runsDistributed += runs;
  }

  return bowlers;
}

async function updatePlayerStats(batsmen, bowlers) {
  // Update batting stats
  for (const batsman of batsmen) {
    const player = await Player.findById(batsman.player);
    if (player) {
      player.battingStats.innings += 1;
      player.battingStats.runs += batsman.runs;
      player.battingStats.ballsFaced += batsman.balls;
      player.battingStats.fours += batsman.fours;
      player.battingStats.sixes += batsman.sixes;
      if (!batsman.isOut) {
        player.battingStats.notOuts += 1;
      }
      if (batsman.runs > player.battingStats.highestScore) {
        player.battingStats.highestScore = batsman.runs;
      }
      player.calculateBattingAverage();
      player.calculateStrikeRate();
      await player.save();
    }
  }

  // Update bowling stats
  for (const bowler of bowlers) {
    const player = await Player.findById(bowler.player);
    if (player) {
      player.bowlingStats.innings += 1;
      player.bowlingStats.overs += bowler.overs;
      player.bowlingStats.balls += bowler.balls;
      player.bowlingStats.runsConceded += bowler.runs;
      player.bowlingStats.wickets += bowler.wickets;
      player.calculateBowlingAverage();
      player.calculateEconomy();
      await player.save();
    }
  }
}

async function calculateTeamNRR(teamId) {
  const matches = await Match.find({
    $or: [{ 'team1.teamId': teamId }, { 'team2.teamId': teamId }],
    status: 'completed'
  });

  let runsScoredTotal = 0;
  let oversFacedTotal = 0;
  let runsConcededTotal = 0;
  let oversBowledTotal = 0;

  for (const match of matches) {
    for (const innings of match.innings) {
      const oversPlayed = innings.overs + (innings.balls / 4);

      if (innings.battingTeam.toString() === teamId.toString()) {
        runsScoredTotal += innings.runs;
        oversFacedTotal += oversPlayed;
      } else {
        runsConcededTotal += innings.runs;
        oversBowledTotal += oversPlayed;
      }
    }
  }

  const runRateFor = oversFacedTotal > 0 ? runsScoredTotal / oversFacedTotal : 0;
  const runRateAgainst = oversBowledTotal > 0 ? runsConcededTotal / oversBowledTotal : 0;

  return (runRateFor - runRateAgainst).toFixed(3);
}

populateData();
