import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Group from '../models/Group.js';
import Team from '../models/Team.js';
import Player from '../models/Player.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/Samp_Cup';

async function createUserTeams() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing teams, players, and matches
    console.log('Clearing existing data...');
    await Team.deleteMany({});
    await Player.deleteMany({});
    // Note: Not deleting matches since there might not be any yet

    // Player data from the image - all in one team
    const playerData = [
      { name: 'Brijen' },
      { name: 'Dhrumit' },
      { name: 'Dhvip' },
      { name: 'Jigar' },
      { name: 'Milind' },
      { name: 'Nirav' },
      { name: 'Parth' },
      { name: 'Vikas' }
    ];

    const teamName = 'YYC Team';
    const teamShortName = 'YYC';

    // Make sure groups exist
    console.log('\nEnsuring groups exist...');
    let groupA = await Group.findOne({ name: 'Group A' });
    if (!groupA) {
      groupA = await Group.create({ name: 'Group A', description: 'First group' });
      console.log(`  Created: Group A`);
    } else {
      console.log(`  Found: Group A`);
    }

    // Create the team
    console.log('\nCreating team...');
    const team = await Team.create({
      name: teamName,
      shortName: teamShortName,
      group: 'Group A',
      matchesPlayed: 0,
      matchesWon: 0,
      matchesLost: 0,
      points: 0,
      netRunRate: 0
    });
    console.log(`  Created: ${teamName} (${teamShortName}) in Group A`);

    // Create players - assign roles in a balanced way
    console.log('\nCreating players...');
    const createdPlayers = [];
    const roles = ['Batsman', 'Batsman', 'All-rounder', 'All-rounder', 'Batsman', 'Bowler', 'Bowler', 'All-rounder'];

    for (let i = 0; i < playerData.length; i++) {
      const playerInfo = playerData[i];
      const role = roles[i];

      const player = await Player.create({
        name: playerInfo.name,
        team: team._id,
        role: role
      });

      createdPlayers.push(player);
      console.log(`  Created: ${playerInfo.name} (${role})`);
    }

    // Update team with player references
    console.log('\nUpdating team player list...');
    team.players = createdPlayers.map(p => p._id);
    await team.save();
    console.log(`  Updated ${teamName} with ${createdPlayers.length} players`);

    console.log('\n✅ All done!');
    console.log('\nSummary:');
    console.log(`- Created 1 team: ${teamName} (${teamShortName})`);
    console.log(`- Created ${createdPlayers.length} players`);
    console.log('\nPlayers:');
    createdPlayers.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} - ${p.role}`);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createUserTeams();
