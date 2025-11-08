import mongoose from 'mongoose';

// Custom validator to reject empty strings for ObjectId fields
const objectIdValidator = {
  validator: function(v) {
    // Allow null/undefined, but not empty strings
    return v === null || v === undefined || (typeof v === 'string' && v.length > 0) || mongoose.Types.ObjectId.isValid(v);
  },
  message: 'ObjectId cannot be an empty string'
};

const ballSchema = new mongoose.Schema({
  overNumber: Number,
  ballNumber: Number,
  bowler: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true,
    validate: objectIdValidator
  },
  batsman: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true,
    validate: objectIdValidator
  },
  runs: { type: Number, default: 0 },
  extras: { type: Number, default: 0 },
  extraType: { type: String, enum: ['wide', 'noball', 'bye', 'legbye', 'none'], default: 'none' },
  isWicket: { type: Boolean, default: false },
  wicketType: { type: String, enum: ['bowled', 'caught', 'lbw', 'runout', 'stumped', 'hitwicket', 'none'], default: 'none' },
  dismissedPlayer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    validate: objectIdValidator
  },
  boundaryType: { type: String, enum: ['none', 'straight_wall_air', 'straight_wall_ground', 'ceiling', 'side_wall_air', 'side_wall_ground', 'net_air', 'net_ground'], default: 'none' },
  additionalRuns: { type: Number, default: 0 }
}, { _id: false });

const inningsSchema = new mongoose.Schema({
  battingTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  bowlingTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  runs: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
  overs: { type: Number, default: 0 },
  balls: { type: Number, default: 0 },
  extras: { type: Number, default: 0 },
  ballByBall: [ballSchema],
  battingScorecard: [{
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
      validate: objectIdValidator
    },
    runs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    sixes: { type: Number, default: 0 },
    strikeRate: { type: Number, default: 0 },
    isOut: { type: Boolean, default: false },
    howOut: { type: String, default: '' }
  }],
  bowlingScorecard: [{
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
      validate: objectIdValidator
    },
    overs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    maidens: { type: Number, default: 0 },
    economy: { type: Number, default: 0 }
  }]
}, { _id: false });

const matchSchema = new mongoose.Schema({
  matchNumber: {
    type: Number,
    required: true,
    unique: true
  },
  team1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  team2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  venue: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'completed'],
    default: 'scheduled'
  },
  tossWinner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  tossDecision: {
    type: String,
    enum: ['bat', 'bowl']
  },
  currentInnings: {
    type: Number,
    default: 1
  },
  innings: [inningsSchema],
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  resultText: {
    type: String,
    default: ''
  },
  maxOvers: {
    type: Number,
    default: 8
  }
}, {
  timestamps: true
});

export default mongoose.model('Match', matchSchema);
