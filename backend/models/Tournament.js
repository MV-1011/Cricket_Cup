import mongoose from 'mongoose';

const tournamentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['planned', 'group-stage', 'knockout-stage', 'completed'],
    default: 'planned'
  },

  // Tournament format configuration
  format: {
    teamsPerGroup: { type: Number, default: 4 },
    totalGroups: { type: Number, default: 4 },
    matchesPerTeamInGroup: { type: Number, default: 3 }, // Round-robin within group
    qualifiersPerGroup: { type: Number, default: 2 }, // Top 2 from each group
    maxOversPerMatch: { type: Number, default: 8 }
  },

  // Groups configuration - stores group data with teams
  groups: [{
    name: { type: String, required: true }, // "Group A", "Group B", etc.
    teams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],
    matches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }],
    standings: [{
      team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
      played: { type: Number, default: 0 },
      won: { type: Number, default: 0 },
      lost: { type: Number, default: 0 },
      points: { type: Number, default: 0 },
      netRunRate: { type: Number, default: 0 },
      runsScored: { type: Number, default: 0 },
      runsConceded: { type: Number, default: 0 },
      oversPlayed: { type: Number, default: 0 },
      oversFaced: { type: Number, default: 0 }
    }]
  }],

  // Knockout bracket structure
  knockout: {
    quarterfinals: [{
      matchNumber: { type: String }, // "QF1", "QF2", etc.
      match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' },
      team1Source: { type: String }, // "Group A - 1st", "Group B - 2nd"
      team2Source: { type: String },
      team1: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
      team2: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
      winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
      status: { type: String, enum: ['pending', 'scheduled', 'live', 'completed'], default: 'pending' }
    }],
    semifinals: [{
      matchNumber: { type: String }, // "SF1", "SF2"
      match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' },
      team1Source: { type: String }, // "Winner QF1", "Winner QF2"
      team2Source: { type: String },
      team1: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
      team2: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
      winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
      status: { type: String, enum: ['pending', 'scheduled', 'live', 'completed'], default: 'pending' }
    }],
    final: {
      matchNumber: { type: String, default: 'FINAL' },
      match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' },
      team1Source: { type: String }, // "Winner SF1"
      team2Source: { type: String }, // "Winner SF2"
      team1: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
      team2: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
      winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
      status: { type: String, enum: ['pending', 'scheduled', 'live', 'completed'], default: 'pending' }
    }
  },

  // Tournament winner
  champion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  runnerUp: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  }
}, {
  timestamps: true
});

// Method to get group standings sorted by points and NRR
tournamentSchema.methods.getGroupStandings = function(groupName) {
  const group = this.groups.find(g => g.name === groupName);
  if (!group) return [];

  return group.standings.sort((a, b) => {
    // First by points (descending)
    if (b.points !== a.points) return b.points - a.points;
    // Then by NRR (descending)
    return b.netRunRate - a.netRunRate;
  });
};

// Method to get qualified teams from all groups
tournamentSchema.methods.getQualifiedTeams = function() {
  const qualified = [];

  for (const group of this.groups) {
    const standings = group.standings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.netRunRate - a.netRunRate;
    });

    // Get top N teams (based on qualifiersPerGroup)
    const topTeams = standings.slice(0, this.format.qualifiersPerGroup);
    topTeams.forEach((team, index) => {
      qualified.push({
        team: team.team,
        group: group.name,
        position: index + 1, // 1st or 2nd place
        points: team.points,
        nrr: team.netRunRate
      });
    });
  }

  return qualified;
};

// Method to check if group stage is complete
tournamentSchema.methods.isGroupStageComplete = function() {
  for (const group of this.groups) {
    for (const matchId of group.matches) {
      // This would need to be populated to check status
      // For now, we'll check in the controller
    }
  }
  return false; // Will be checked in controller with populated data
};

const Tournament = mongoose.model('Tournament', tournamentSchema);

export default Tournament;
