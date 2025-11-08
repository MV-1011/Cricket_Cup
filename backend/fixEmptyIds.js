import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Match from './models/Match.js';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    fixEmptyIds();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function fixEmptyIds() {
  try {
    console.log('Finding matches with empty string IDs...');

    const matches = await Match.find();
    let fixedCount = 0;

    for (const match of matches) {
      let needsUpdate = false;

      for (const innings of match.innings) {
        // Fix ballByBall
        innings.ballByBall = innings.ballByBall.filter(ball => {
          if (ball.bowler === '' || ball.batsman === '') {
            console.log(`Removing ball with empty IDs in match ${match.matchNumber}`);
            needsUpdate = true;
            return false;
          }
          if (ball.dismissedPlayer === '') {
            ball.dismissedPlayer = null;
            needsUpdate = true;
          }
          return true;
        });

        // Fix batting scorecard
        innings.battingScorecard = innings.battingScorecard.filter(entry => {
          if (entry.player === '') {
            console.log(`Removing batting entry with empty player ID in match ${match.matchNumber}`);
            needsUpdate = true;
            return false;
          }
          return true;
        });

        // Fix bowling scorecard
        innings.bowlingScorecard = innings.bowlingScorecard.filter(entry => {
          if (entry.player === '') {
            console.log(`Removing bowling entry with empty player ID in match ${match.matchNumber}`);
            needsUpdate = true;
            return false;
          }
          return true;
        });
      }

      if (needsUpdate) {
        // Use update with validation disabled, then re-enable
        await Match.updateOne(
          { _id: match._id },
          { $set: { innings: match.innings } },
          { runValidators: false }
        );
        fixedCount++;
        console.log(`Fixed match ${match.matchNumber}`);
      }
    }

    console.log(`\n✅ Fixed ${fixedCount} match(es) with empty IDs`);
    console.log('Database cleanup complete!');

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error fixing empty IDs:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}
