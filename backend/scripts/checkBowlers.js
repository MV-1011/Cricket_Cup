import mongoose from 'mongoose';
import Player from '../models/Player.js';

const MONGODB_URI = 'mongodb://localhost:27017/Samp_Cup';

async function checkBowlers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const allPlayers = await Player.find({}).populate('team');

    const bowlers = allPlayers.filter(p => p.role === 'Bowler');

    console.log(`Total Bowlers: ${bowlers.length}\n`);

    console.log('Bowler Stats:');
    console.log('=============');
    bowlers.forEach(b => {
      console.log(`${b.name.padEnd(25)} | Team: ${(b.team?.shortName || 'N/A').padEnd(5)} | Innings: ${b.bowlingStats.innings} | Wickets: ${b.bowlingStats.wickets} | Economy: ${b.bowlingStats.economy.toFixed(2)}`);
    });

    console.log(`\nBowlers with innings > 0: ${bowlers.filter(b => b.bowlingStats.innings > 0).length}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkBowlers();
