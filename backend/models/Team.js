import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  logo: {
    type: String,
    default: ''
  },
  players: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }],
  group: {
    type: String,
    default: '',
    trim: true
  },
  matchesPlayed: {
    type: Number,
    default: 0
  },
  matchesWon: {
    type: Number,
    default: 0
  },
  matchesLost: {
    type: Number,
    default: 0
  },
  points: {
    type: Number,
    default: 0
  },
  netRunRate: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

export default mongoose.model('Team', teamSchema);
