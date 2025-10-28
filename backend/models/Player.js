const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  role: {
    type: String,
    enum: ['Batsman', 'Bowler', 'All-rounder'],
    required: true
  },
  // Batting Statistics
  battingStats: {
    matchesPlayed: { type: Number, default: 0 },
    innings: { type: Number, default: 0 },
    runs: { type: Number, default: 0 },
    ballsFaced: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    sixes: { type: Number, default: 0 },
    highestScore: { type: Number, default: 0 },
    notOuts: { type: Number, default: 0 },
    strikeRate: { type: Number, default: 0 },
    average: { type: Number, default: 0 }
  },
  // Bowling Statistics
  bowlingStats: {
    matchesPlayed: { type: Number, default: 0 },
    innings: { type: Number, default: 0 },
    overs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    runsConceded: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    maidens: { type: Number, default: 0 },
    economy: { type: Number, default: 0 },
    average: { type: Number, default: 0 },
    bestFigures: { type: String, default: '0/0' }
  }
}, {
  timestamps: true
});

// Calculate batting average
playerSchema.methods.calculateBattingAverage = function() {
  const outs = this.battingStats.innings - this.battingStats.notOuts;
  this.battingStats.average = outs > 0 ? (this.battingStats.runs / outs).toFixed(2) : 0;
};

// Calculate batting strike rate
playerSchema.methods.calculateStrikeRate = function() {
  this.battingStats.strikeRate = this.battingStats.ballsFaced > 0
    ? ((this.battingStats.runs / this.battingStats.ballsFaced) * 100).toFixed(2)
    : 0;
};

// Calculate bowling average
playerSchema.methods.calculateBowlingAverage = function() {
  this.bowlingStats.average = this.bowlingStats.wickets > 0
    ? (this.bowlingStats.runsConceded / this.bowlingStats.wickets).toFixed(2)
    : 0;
};

// Calculate economy rate
playerSchema.methods.calculateEconomy = function() {
  this.bowlingStats.economy = this.bowlingStats.overs > 0
    ? (this.bowlingStats.runsConceded / this.bowlingStats.overs).toFixed(2)
    : 0;
};

module.exports = mongoose.model('Player', playerSchema);
