const mongoose = require('mongoose');
require('dotenv').config();

const Team = require('./models/Team');
const Player = require('./models/Player');
const Match = require('./models/Match');

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
