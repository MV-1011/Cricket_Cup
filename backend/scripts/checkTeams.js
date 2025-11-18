import mongoose from 'mongoose';
import Team from '../models/Team.js';

const MONGODB_URI = 'mongodb://localhost:27017/Samp_Cup';

async function checkTeams() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const teams = await Team.find({}).sort({ group: 1, points: -1 });

    console.log('Teams in Database:');
    console.log('==================');
    teams.forEach(t => {
      const groupValue = t.group === '' ? 'EMPTY STRING' : (t.group || 'UNDEFINED');
      console.log(`${t.name.padEnd(15)} | Group: '${groupValue.padEnd(15)}' | Played: ${t.matchesPlayed} | Points: ${t.points}`);
    });

    console.log('\nGroup distribution:');
    const groupCounts = teams.reduce((acc, t) => {
      const key = t.group || 'NO_GROUP';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    Object.entries(groupCounts).forEach(([group, count]) => {
      console.log(`  ${group}: ${count} teams`);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkTeams();
