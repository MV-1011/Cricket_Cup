import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Team from './models/Team.js';
import Player from './models/Player.js';
import Match from './models/Match.js';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    seedDatabase();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function seedDatabase() {
  try {
    // Clear existing data
    console.log('Clearing existing data...');
    await Team.deleteMany({});
    await Player.deleteMany({});
    await Match.deleteMany({});

    console.log('\n✅ Database cleared successfully!');
    console.log('\nAll dummy data has been removed.');
    console.log('You can now add your own teams, players, and matches through the application.');

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error clearing database:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}
