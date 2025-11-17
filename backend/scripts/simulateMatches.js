import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Match from '../models/Match.js';
import Player from '../models/Player.js';
import Team from '../models/Team.js';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cricket-tournament');

const simulateMatch = async (team1Id, team2Id, matchNumber) => {
  try {
    // Get teams and their players
    const team1 = await Team.findById(team1Id).populate('players');
    const team2 = await Team.findById(team2Id).populate('players');

    if (!team1 || !team2) {
      console.log('Teams not found');
      return;
    }

    console.log(`\n🏏 Simulating Match ${matchNumber}: ${team1.name} vs ${team2.name}`);

    // Randomly decide toss winner and decision
    const tossWinner = Math.random() > 0.5 ? team1Id : team2Id;
    const tossDecision = 'bat';
    const battingFirst = tossWinner;
    const bowlingFirst = tossWinner.toString() === team1Id.toString() ? team2Id : team1Id;

    // Create match
    const match = new Match({
      matchNumber,
      team1: team1Id,
      team2: team2Id,
      date: new Date(),
      venue: 'YYC Ground',
      status: 'completed',
      maxOvers: 8,
      tossWinner,
      tossDecision,
      battingFirst,
      innings: []
    });

    // Simulate 2 innings
    for (let inningsNum = 1; inningsNum <= 2; inningsNum++) {
      const battingTeam = inningsNum === 1 ?
        (battingFirst.toString() === team1Id.toString() ? team1 : team2) :
        (battingFirst.toString() === team1Id.toString() ? team2 : team1);

      const bowlingTeam = inningsNum === 1 ?
        (bowlingFirst.toString() === team1Id.toString() ? team1 : team2) :
        (bowlingFirst.toString() === team1Id.toString() ? team2 : team1);

      const innings = {
        battingTeam: battingTeam._id,
        bowlingTeam: bowlingTeam._id,
        runs: 0,
        wickets: 0,
        overs: 0,
        balls: 0,
        extras: 0,
        ballByBall: [],
        battingScorecard: [],
        bowlingScorecard: []
      };

      // Get batsmen and bowlers
      const batsmen = battingTeam.players.filter(p => p.role === 'Batsman' || p.role === 'All-rounder').slice(0, 8);
      const bowlers = bowlingTeam.players.filter(p => p.role === 'Bowler' || p.role === 'All-rounder').slice(0, 4);

      // Simulate 8 overs (32 balls)
      let currentBatsmanIndex = 0;
      let currentBowlerIndex = 0;
      let totalBalls = 0;
      let currentBatsman = batsmen[currentBatsmanIndex];
      let currentBowler = bowlers[currentBowlerIndex];

      // Initialize scorecard entries
      const batsmanScores = {};
      const bowlerStats = {};

      while (totalBalls < 32 && innings.wickets < 7) {
        // Change bowler every 4 balls (1 over)
        if (totalBalls > 0 && totalBalls % 4 === 0) {
          currentBowlerIndex = (currentBowlerIndex + 1) % bowlers.length;
          currentBowler = bowlers[currentBowlerIndex];
        }

        // Initialize batsman score if needed
        if (!batsmanScores[currentBatsman._id]) {
          batsmanScores[currentBatsman._id] = {
            player: currentBatsman._id,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            strikeRate: 0,
            isOut: false,
            howOut: ''
          };
        }

        // Initialize bowler stats if needed
        if (!bowlerStats[currentBowler._id]) {
          bowlerStats[currentBowler._id] = {
            player: currentBowler._id,
            overs: 0,
            balls: 0,
            runs: 0,
            wickets: 0,
            maidens: 0,
            economy: 0
          };
        }

        // Simulate ball outcome
        const random = Math.random();
        let runs = 0;
        let isWicket = false;
        let extraType = 'none';
        let extras = 0;

        if (random < 0.05) {
          // 5% chance of wide
          extraType = 'wide';
          extras = 4;
          runs = 4;
          innings.extras += 4;
        } else if (random < 0.10) {
          // 5% chance of wicket
          isWicket = true;
          batsmanScores[currentBatsman._id].isOut = true;
          batsmanScores[currentBatsman._id].howOut = 'bowled';
          batsmanScores[currentBatsman._id].runs -= 4; // Wicket penalty
          innings.wickets += 1;
          innings.runs -= 4;
          bowlerStats[currentBowler._id].wickets += 1;

          // Next batsman
          currentBatsmanIndex++;
          if (currentBatsmanIndex < batsmen.length) {
            currentBatsman = batsmen[currentBatsmanIndex];
          }
        } else if (random < 0.25) {
          // 15% chance of boundary
          runs = Math.random() > 0.5 ? 4 : 6;
          if (runs === 4) batsmanScores[currentBatsman._id].fours += 1;
          if (runs === 6) batsmanScores[currentBatsman._id].sixes += 1;
        } else if (random < 0.45) {
          // 20% chance of 2 runs
          runs = 2;
        } else if (random < 0.65) {
          // 20% chance of 1 run
          runs = 1;
        } else {
          // 35% chance of dot ball
          runs = 0;
        }

        // Update scores
        if (!isWicket && extraType === 'none') {
          batsmanScores[currentBatsman._id].runs += runs;
          batsmanScores[currentBatsman._id].balls += 1;
          bowlerStats[currentBowler._id].balls += 1;
          bowlerStats[currentBowler._id].runs += runs;
          innings.runs += runs;
          innings.balls += 1;
          totalBalls += 1;
        } else if (extraType === 'wide') {
          // Wide: runs but no ball count in first 6 overs
          if (totalBalls < 24) {
            bowlerStats[currentBowler._id].balls += 1;
            bowlerStats[currentBowler._id].runs += extras;
            batsmanScores[currentBatsman._id].balls += 1;
            innings.balls += 1;
            totalBalls += 1;
          } else {
            // Last 2 overs: re-bowled
            bowlerStats[currentBowler._id].runs += extras;
          }
          innings.runs += extras;
        } else if (isWicket) {
          batsmanScores[currentBatsman._id].balls += 1;
          bowlerStats[currentBowler._id].balls += 1;
          bowlerStats[currentBowler._id].runs -= 4;
          innings.balls += 1;
          totalBalls += 1;
        }

        // Record ball
        innings.ballByBall.push({
          overNumber: Math.floor(totalBalls / 4) + 1,
          ballNumber: (totalBalls % 4) + 1,
          bowler: currentBowler._id,
          batsman: currentBatsman._id,
          runs,
          extras,
          extraType,
          isWicket,
          wicketType: isWicket ? 'bowled' : 'none',
          dismissedPlayer: isWicket ? currentBatsman._id : null,
          boundaryType: 'none',
          additionalRuns: 0
        });
      }

      // Calculate final stats
      Object.values(batsmanScores).forEach(batsman => {
        batsman.strikeRate = batsman.balls > 0 ? ((batsman.runs / batsman.balls) * 100).toFixed(2) : 0;
        innings.battingScorecard.push(batsman);
      });

      Object.values(bowlerStats).forEach(bowler => {
        bowler.overs = Math.floor(bowler.balls / 4) + (bowler.balls % 4) / 10;
        bowler.economy = bowler.overs > 0 ? (bowler.runs / Math.floor(bowler.balls / 4)).toFixed(2) : 0;
        innings.bowlingScorecard.push(bowler);
      });

      innings.overs = Math.floor(innings.balls / 4) + (innings.balls % 4) / 10;

      match.innings.push(innings);
      console.log(`  Innings ${inningsNum}: ${innings.runs}/${innings.wickets} (${innings.overs} overs)`);
    }

    // Determine winner
    match.currentInnings = 2;
    const innings1 = match.innings[0];
    const innings2 = match.innings[1];

    if (innings1.runs > innings2.runs) {
      match.winner = innings1.battingTeam;
      match.resultText = `${team1.name} won by ${innings1.runs - innings2.runs} runs`;
    } else if (innings2.runs > innings1.runs) {
      match.winner = innings2.battingTeam;
      match.resultText = `${team2.name} won by ${10 - innings2.wickets} wickets`;
    } else {
      match.resultText = 'Match Tied';
    }

    match.status = 'completed';
    await match.save();

    // Update team standings
    if (match.winner) {
      await Team.findByIdAndUpdate(match.winner, {
        $inc: { matchesPlayed: 1, matchesWon: 1, points: 2 }
      });
      const loserId = match.winner.toString() === team1Id.toString() ? team2Id : team1Id;
      await Team.findByIdAndUpdate(loserId, {
        $inc: { matchesPlayed: 1, matchesLost: 1 }
      });
    } else {
      await Team.findByIdAndUpdate(team1Id, {
        $inc: { matchesPlayed: 1, points: 1 }
      });
      await Team.findByIdAndUpdate(team2Id, {
        $inc: { matchesPlayed: 1, points: 1 }
      });
    }

    // Update player stats
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

          // Calculate average
          const outs = player.battingStats.innings - player.battingStats.notOuts;
          player.battingStats.average = outs > 0 ? (player.battingStats.runs / outs).toFixed(2) : 0;

          // Calculate strike rate
          player.battingStats.strikeRate = player.battingStats.ballsFaced > 0
            ? ((player.battingStats.runs / player.battingStats.ballsFaced) * 100).toFixed(2)
            : 0;

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

          // Calculate bowling average
          player.bowlingStats.average = player.bowlingStats.wickets > 0
            ? (player.bowlingStats.runsConceded / player.bowlingStats.wickets).toFixed(2)
            : 0;

          // Calculate economy
          player.bowlingStats.economy = player.bowlingStats.overs > 0
            ? (player.bowlingStats.runsConceded / player.bowlingStats.overs).toFixed(2)
            : 0;

          await player.save();
        }
      }
    }

    console.log(`✅ ${match.resultText}`);
    return match;

  } catch (error) {
    console.error('Error simulating match:', error);
  }
};

const main = async () => {
  try {
    console.log('🎮 Starting Match Simulation...\n');

    // Get all teams
    const teams = await Team.find();

    if (teams.length < 2) {
      console.log('❌ Not enough teams found. Please create teams first.');
      process.exit(1);
    }

    console.log(`Found ${teams.length} teams:`);
    teams.forEach(team => console.log(`  - ${team.name} (${team.shortName})`));

    // Simulate matches between teams
    let matchNumber = 1;

    // Round-robin: Each team plays every other team once
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        await simulateMatch(teams[i]._id, teams[j]._id, matchNumber);
        matchNumber++;
      }
    }

    console.log('\n🎉 All matches simulated successfully!');
    console.log('\n📊 Check your application to see:');
    console.log('  - Team Standings (Points Table)');
    console.log('  - Player Standings (Top Performers)');
    console.log('  - Match Results');

    process.exit(0);

  } catch (error) {
    console.error('Error in main:', error);
    process.exit(1);
  }
};

main();
