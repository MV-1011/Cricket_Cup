import Tournament from '../models/Tournament.js';
import Match from '../models/Match.js';
import Team from '../models/Team.js';

// Get all tournaments
export const getAllTournaments = async (req, res) => {
  try {
    const tournaments = await Tournament.find()
      .populate('groups.teams', 'name')
      .populate('champion', 'name')
      .populate('runnerUp', 'name')
      .sort({ createdAt: -1 });
    res.json(tournaments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get tournament by ID
export const getTournamentById = async (req, res) => {
  try {
    // Build base populate options
    const populateOptions = [
      { path: 'groups.teams', select: 'name' },
      {
        path: 'groups.matches',
        populate: [
          { path: 'team1', select: 'name' },
          { path: 'team2', select: 'name' }
        ]
      },
      { path: 'groups.standings.team', select: 'name' },
      { path: 'knockout.quarterfinals.team1', select: 'name' },
      { path: 'knockout.quarterfinals.team2', select: 'name' },
      { path: 'knockout.quarterfinals.winner', select: 'name' },
      { path: 'knockout.quarterfinals.match' },
      { path: 'knockout.semifinals.team1', select: 'name' },
      { path: 'knockout.semifinals.team2', select: 'name' },
      { path: 'knockout.semifinals.winner', select: 'name' },
      { path: 'knockout.semifinals.match' },
      { path: 'champion', select: 'name' },
      { path: 'runnerUp', select: 'name' }
    ];

    let tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    // Only add final populates if knockout.final exists and is not null
    if (tournament.knockout && tournament.knockout.final) {
      populateOptions.push(
        { path: 'knockout.final.team1', select: 'name' },
        { path: 'knockout.final.team2', select: 'name' },
        { path: 'knockout.final.winner', select: 'name' },
        { path: 'knockout.final.match' }
      );
    }

    // Re-fetch with all populates
    tournament = await Tournament.findById(req.params.id).populate(populateOptions);

    // Sort matches by matchNumber after population
    if (tournament.groups) {
      tournament.groups.forEach(group => {
        if (group.matches && group.matches.length > 0) {
          group.matches.sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0));
        }
      });
    }

    res.json(tournament);
  } catch (error) {
    console.error('Error fetching tournament:', error);
    res.status(500).json({ message: error.message });
  }
};

// Create tournament
export const createTournament = async (req, res) => {
  try {
    const tournament = new Tournament(req.body);
    const newTournament = await tournament.save();
    res.status(201).json(newTournament);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update tournament
export const updateTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    res.json(tournament);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete tournament
export const deleteTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    // Delete all matches associated with this tournament
    await Match.deleteMany({ tournament: req.params.id });

    await Tournament.findByIdAndDelete(req.params.id);
    res.json({ message: 'Tournament and associated matches deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Setup groups for tournament (assign teams to groups)
export const setupGroups = async (req, res) => {
  try {
    const { groups } = req.body; // Array of { name, teams: [teamIds] }
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    tournament.groups = groups.map(group => ({
      name: group.name,
      teams: group.teams,
      matches: [],
      standings: group.teams.map(teamId => ({
        team: teamId,
        played: 0,
        won: 0,
        lost: 0,
        points: 0,
        netRunRate: 0,
        runsScored: 0,
        runsConceded: 0,
        oversPlayed: 0,
        oversFaced: 0
      }))
    }));

    await tournament.save();
    res.json(tournament);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Generate group stage matches (round-robin within each group)
export const generateGroupMatches = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    if (tournament.groups.length === 0) {
      return res.status(400).json({ message: 'No groups configured. Please setup groups first.' });
    }

    // Get the highest current match number
    const lastMatch = await Match.findOne().sort({ matchNumber: -1 });
    let matchNumber = lastMatch ? lastMatch.matchNumber + 1 : 1;

    const createdMatches = [];

    for (const group of tournament.groups) {
      const teams = group.teams;
      const groupMatches = [];

      // Generate round-robin matches for this group
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          const match = new Match({
            matchNumber: matchNumber++,
            tournament: tournament._id,
            stage: 'group',
            groupName: group.name,
            team1: teams[i],
            team2: teams[j],
            date: new Date(), // Default date, can be updated later
            maxOvers: tournament.format.maxOversPerMatch,
            status: 'scheduled'
          });

          await match.save();
          groupMatches.push(match._id);
          createdMatches.push(match);
        }
      }

      // Update group with match references
      group.matches = groupMatches;
    }

    tournament.status = 'group-stage';
    await tournament.save();

    res.json({
      message: `Generated ${createdMatches.length} group stage matches`,
      matches: createdMatches,
      tournament
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Regenerate group stage matches (delete existing and create new)
export const regenerateGroupMatches = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    if (tournament.groups.length === 0) {
      return res.status(400).json({ message: 'No groups configured. Please setup groups first.' });
    }

    // Delete all existing group stage matches for this tournament
    await Match.deleteMany({ tournament: tournament._id, stage: 'group' });

    // Get the highest current match number
    const lastMatch = await Match.findOne().sort({ matchNumber: -1 });
    let matchNumber = lastMatch ? lastMatch.matchNumber + 1 : 1;

    const createdMatches = [];

    for (const group of tournament.groups) {
      const teams = group.teams;
      const groupMatches = [];

      // Reset standings for the group
      group.standings = group.teams.map(teamId => ({
        team: teamId,
        played: 0,
        won: 0,
        lost: 0,
        points: 0,
        netRunRate: 0,
        runsScored: 0,
        runsConceded: 0,
        oversPlayed: 0,
        oversFaced: 0
      }));

      // Generate round-robin matches for this group
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          const match = new Match({
            matchNumber: matchNumber++,
            tournament: tournament._id,
            stage: 'group',
            groupName: group.name,
            team1: teams[i],
            team2: teams[j],
            date: new Date(),
            maxOvers: tournament.format.maxOversPerMatch,
            status: 'scheduled'
          });

          await match.save();
          groupMatches.push(match._id);
          createdMatches.push(match);
        }
      }

      // Update group with match references
      group.matches = groupMatches;
    }

    tournament.status = 'group-stage';
    tournament.markModified('groups');
    await tournament.save();

    res.json({
      message: `Regenerated ${createdMatches.length} group stage matches`,
      matches: createdMatches,
      tournament
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update a group match (change teams, date, etc.)
export const updateGroupMatch = async (req, res) => {
  try {
    const { id, matchId } = req.params;
    const { team1, team2, date, time } = req.body;

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    if (match.tournament.toString() !== id) {
      return res.status(400).json({ message: 'Match does not belong to this tournament' });
    }

    if (match.status === 'completed' || match.status === 'live') {
      return res.status(400).json({ message: 'Cannot update a match that is live or completed' });
    }

    // Update match fields
    if (team1) match.team1 = team1;
    if (team2) match.team2 = team2;
    if (date) match.date = date;
    if (time) match.time = time;

    await match.save();

    res.json({
      message: 'Match updated successfully',
      match
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Generate knockout bracket (quarterfinals, semifinals, final)
export const generateKnockoutBracket = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('groups.standings.team', 'name');

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    // Get qualified teams from each group (top 2 from each group, sorted by points then NRR)
    const qualifiedTeams = tournament.getQualifiedTeams();

    if (qualifiedTeams.length < 8) {
      return res.status(400).json({
        message: `Not enough qualified teams. Need 8 teams, found ${qualifiedTeams.length}. Ensure group stage is complete.`
      });
    }

    // Get highest match number
    const lastMatch = await Match.findOne().sort({ matchNumber: -1 });
    let matchNumber = lastMatch ? lastMatch.matchNumber + 1 : 1;

    // Setup quarterfinals bracket
    // QF1: Group A 1st vs Group B 2nd
    // QF2: Group C 1st vs Group D 2nd
    // QF3: Group B 1st vs Group A 2nd
    // QF4: Group D 1st vs Group C 2nd
    const groupTeams = {};
    qualifiedTeams.forEach(qt => {
      if (!groupTeams[qt.group]) groupTeams[qt.group] = [];
      groupTeams[qt.group].push(qt);
    });

    // Sort each group's teams by position
    Object.keys(groupTeams).forEach(group => {
      groupTeams[group].sort((a, b) => a.position - b.position);
    });

    const groups = ['Group A', 'Group B', 'Group C', 'Group D'];
    const quarterfinalSetup = [
      { team1Source: 'Group A - 1st', team2Source: 'Group B - 2nd', team1Group: 'Group A', team1Pos: 0, team2Group: 'Group B', team2Pos: 1 },
      { team1Source: 'Group C - 1st', team2Source: 'Group D - 2nd', team1Group: 'Group C', team1Pos: 0, team2Group: 'Group D', team2Pos: 1 },
      { team1Source: 'Group B - 1st', team2Source: 'Group A - 2nd', team1Group: 'Group B', team1Pos: 0, team2Group: 'Group A', team2Pos: 1 },
      { team1Source: 'Group D - 1st', team2Source: 'Group C - 2nd', team1Group: 'Group D', team1Pos: 0, team2Group: 'Group C', team2Pos: 1 }
    ];

    const quarterfinals = [];
    for (let i = 0; i < quarterfinalSetup.length; i++) {
      const setup = quarterfinalSetup[i];
      const team1 = groupTeams[setup.team1Group]?.[setup.team1Pos]?.team;
      const team2 = groupTeams[setup.team2Group]?.[setup.team2Pos]?.team;

      const match = new Match({
        matchNumber: matchNumber++,
        tournament: tournament._id,
        stage: 'quarterfinal',
        knockoutMatchId: `QF${i + 1}`,
        team1: team1,
        team2: team2,
        date: new Date(),
        maxOvers: tournament.format.maxOversPerMatch,
        status: 'scheduled'
      });

      await match.save();

      quarterfinals.push({
        matchNumber: `QF${i + 1}`,
        match: match._id,
        team1Source: setup.team1Source,
        team2Source: setup.team2Source,
        team1: team1,
        team2: team2,
        winner: null,
        status: 'scheduled'
      });
    }

    // Setup semifinals (teams TBD - will be winners of QFs)
    const semifinals = [
      {
        matchNumber: 'SF1',
        match: null,
        team1Source: 'Winner QF1',
        team2Source: 'Winner QF2',
        team1: null,
        team2: null,
        winner: null,
        status: 'pending'
      },
      {
        matchNumber: 'SF2',
        match: null,
        team1Source: 'Winner QF3',
        team2Source: 'Winner QF4',
        team1: null,
        team2: null,
        winner: null,
        status: 'pending'
      }
    ];

    // Setup final (teams TBD - will be winners of SFs)
    const final = {
      matchNumber: 'FINAL',
      match: null,
      team1Source: 'Winner SF1',
      team2Source: 'Winner SF2',
      team1: null,
      team2: null,
      winner: null,
      status: 'pending'
    };

    tournament.knockout = {
      quarterfinals,
      semifinals,
      final
    };

    tournament.status = 'knockout-stage';
    await tournament.save();

    res.json({
      message: 'Knockout bracket generated successfully',
      knockout: tournament.knockout,
      tournament
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update group standings after a match
export const updateGroupStandings = async (req, res) => {
  try {
    const { matchId } = req.params;
    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    if (match.status !== 'completed') {
      return res.status(400).json({ message: 'Match is not completed' });
    }

    const tournament = await Tournament.findById(match.tournament);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    // Find the group this match belongs to
    const group = tournament.groups.find(g => g.name === match.groupName);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Calculate NRR components from the match
    const innings1 = match.innings[0];
    const innings2 = match.innings[1];

    // Get team1 and team2 standings
    const team1Standing = group.standings.find(s => s.team.toString() === match.team1.toString());
    const team2Standing = group.standings.find(s => s.team.toString() === match.team2.toString());

    if (!team1Standing || !team2Standing) {
      return res.status(404).json({ message: 'Team standings not found' });
    }

    // Determine which team batted first
    const team1BattedFirst = innings1.battingTeam.toString() === match.team1.toString();

    // Calculate overs as decimal (e.g., 7.2 overs = 7.33...)
    const oversToDecimal = (overs, balls) => {
      const completedOvers = Math.floor(overs);
      const partialBalls = balls % 4;
      return completedOvers + (partialBalls / 4);
    };

    const innings1Overs = oversToDecimal(innings1.overs, innings1.balls);
    const innings2Overs = oversToDecimal(innings2.overs, innings2.balls);

    // Update team1 stats
    if (team1BattedFirst) {
      team1Standing.runsScored += innings1.runs;
      team1Standing.runsConceded += innings2.runs;
      team1Standing.oversPlayed += innings1Overs;
      team1Standing.oversFaced += innings2Overs;
    } else {
      team1Standing.runsScored += innings2.runs;
      team1Standing.runsConceded += innings1.runs;
      team1Standing.oversPlayed += innings2Overs;
      team1Standing.oversFaced += innings1Overs;
    }

    // Update team2 stats (opposite of team1)
    if (!team1BattedFirst) {
      team2Standing.runsScored += innings1.runs;
      team2Standing.runsConceded += innings2.runs;
      team2Standing.oversPlayed += innings1Overs;
      team2Standing.oversFaced += innings2Overs;
    } else {
      team2Standing.runsScored += innings2.runs;
      team2Standing.runsConceded += innings1.runs;
      team2Standing.oversPlayed += innings2Overs;
      team2Standing.oversFaced += innings1Overs;
    }

    // Update match counts and points
    team1Standing.played += 1;
    team2Standing.played += 1;

    if (match.winner) {
      if (match.winner.toString() === match.team1.toString()) {
        team1Standing.won += 1;
        team1Standing.points += 2;
        team2Standing.lost += 1;
      } else {
        team2Standing.won += 1;
        team2Standing.points += 2;
        team1Standing.lost += 1;
      }
    } else {
      // Tie - both get 1 point
      team1Standing.points += 1;
      team2Standing.points += 1;
    }

    // Calculate NRR for both teams
    // NRR = (Runs Scored / Overs Played) - (Runs Conceded / Overs Faced)
    team1Standing.netRunRate = team1Standing.oversPlayed > 0 && team1Standing.oversFaced > 0
      ? ((team1Standing.runsScored / team1Standing.oversPlayed) - (team1Standing.runsConceded / team1Standing.oversFaced))
      : 0;

    team2Standing.netRunRate = team2Standing.oversPlayed > 0 && team2Standing.oversFaced > 0
      ? ((team2Standing.runsScored / team2Standing.oversPlayed) - (team2Standing.runsConceded / team2Standing.oversFaced))
      : 0;

    tournament.markModified('groups');
    await tournament.save();

    res.json({
      message: 'Group standings updated',
      group: group.name,
      standings: group.standings
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Advance knockout winner (after a knockout match is completed)
export const advanceKnockoutWinner = async (req, res) => {
  try {
    const { matchId } = req.params;
    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    if (match.status !== 'completed') {
      return res.status(400).json({ message: 'Match is not completed' });
    }

    if (match.stage === 'group') {
      return res.status(400).json({ message: 'This is a group stage match. Use updateGroupStandings instead.' });
    }

    const tournament = await Tournament.findById(match.tournament);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    const lastMatchQuery = await Match.findOne().sort({ matchNumber: -1 });
    let nextMatchNumber = lastMatchQuery ? lastMatchQuery.matchNumber + 1 : 1;

    if (match.stage === 'quarterfinal') {
      // Find the QF and update winner
      const qfIndex = tournament.knockout.quarterfinals.findIndex(
        qf => qf.match && qf.match.toString() === matchId
      );

      if (qfIndex === -1) {
        return res.status(404).json({ message: 'Quarterfinal not found' });
      }

      tournament.knockout.quarterfinals[qfIndex].winner = match.winner;
      tournament.knockout.quarterfinals[qfIndex].status = 'completed';

      // Check if we can setup semifinals
      const qf1 = tournament.knockout.quarterfinals[0];
      const qf2 = tournament.knockout.quarterfinals[1];
      const qf3 = tournament.knockout.quarterfinals[2];
      const qf4 = tournament.knockout.quarterfinals[3];

      // SF1: Winner QF1 vs Winner QF2
      if (qf1?.winner && qf2?.winner && !tournament.knockout.semifinals[0].match) {
        const sf1Match = new Match({
          matchNumber: nextMatchNumber++,
          tournament: tournament._id,
          stage: 'semifinal',
          knockoutMatchId: 'SF1',
          team1: qf1.winner,
          team2: qf2.winner,
          date: new Date(),
          maxOvers: tournament.format.maxOversPerMatch,
          status: 'scheduled'
        });
        await sf1Match.save();

        tournament.knockout.semifinals[0].match = sf1Match._id;
        tournament.knockout.semifinals[0].team1 = qf1.winner;
        tournament.knockout.semifinals[0].team2 = qf2.winner;
        tournament.knockout.semifinals[0].status = 'scheduled';
      }

      // SF2: Winner QF3 vs Winner QF4
      if (qf3?.winner && qf4?.winner && !tournament.knockout.semifinals[1].match) {
        const sf2Match = new Match({
          matchNumber: nextMatchNumber++,
          tournament: tournament._id,
          stage: 'semifinal',
          knockoutMatchId: 'SF2',
          team1: qf3.winner,
          team2: qf4.winner,
          date: new Date(),
          maxOvers: tournament.format.maxOversPerMatch,
          status: 'scheduled'
        });
        await sf2Match.save();

        tournament.knockout.semifinals[1].match = sf2Match._id;
        tournament.knockout.semifinals[1].team1 = qf3.winner;
        tournament.knockout.semifinals[1].team2 = qf4.winner;
        tournament.knockout.semifinals[1].status = 'scheduled';
      }
    } else if (match.stage === 'semifinal') {
      // Find the SF and update winner
      const sfIndex = tournament.knockout.semifinals.findIndex(
        sf => sf.match && sf.match.toString() === matchId
      );

      if (sfIndex === -1) {
        return res.status(404).json({ message: 'Semifinal not found' });
      }

      tournament.knockout.semifinals[sfIndex].winner = match.winner;
      tournament.knockout.semifinals[sfIndex].status = 'completed';

      // Check if we can setup final
      const sf1 = tournament.knockout.semifinals[0];
      const sf2 = tournament.knockout.semifinals[1];

      if (sf1?.winner && sf2?.winner && !tournament.knockout.final.match) {
        const finalMatch = new Match({
          matchNumber: nextMatchNumber++,
          tournament: tournament._id,
          stage: 'final',
          knockoutMatchId: 'FINAL',
          team1: sf1.winner,
          team2: sf2.winner,
          date: new Date(),
          maxOvers: tournament.format.maxOversPerMatch,
          status: 'scheduled'
        });
        await finalMatch.save();

        tournament.knockout.final.match = finalMatch._id;
        tournament.knockout.final.team1 = sf1.winner;
        tournament.knockout.final.team2 = sf2.winner;
        tournament.knockout.final.status = 'scheduled';
      }
    } else if (match.stage === 'final') {
      tournament.knockout.final.winner = match.winner;
      tournament.knockout.final.status = 'completed';
      tournament.champion = match.winner;

      // Determine runner-up
      const runnerUp = match.winner.toString() === match.team1.toString()
        ? match.team2
        : match.team1;
      tournament.runnerUp = runnerUp;
      tournament.status = 'completed';
    }

    tournament.markModified('knockout');
    await tournament.save();

    res.json({
      message: 'Knockout bracket updated',
      knockout: tournament.knockout,
      tournament
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get group standings
export const getGroupStandings = async (req, res) => {
  try {
    const { id, groupName } = req.params;
    const tournament = await Tournament.findById(id)
      .populate('groups.standings.team', 'name');

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    const standings = tournament.getGroupStandings(groupName);
    res.json(standings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all group standings
export const getAllGroupStandings = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('groups.standings.team', 'name');

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    const allStandings = {};
    for (const group of tournament.groups) {
      allStandings[group.name] = tournament.getGroupStandings(group.name);
    }

    res.json(allStandings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Regenerate knockout bracket (delete existing and create new)
export const regenerateKnockoutBracket = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('groups.standings.team', 'name');

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    // Delete all existing knockout stage matches for this tournament
    await Match.deleteMany({
      tournament: tournament._id,
      stage: { $in: ['quarterfinal', 'semifinal', 'final'] }
    });

    // Clear knockout data
    tournament.knockout = {
      quarterfinals: [],
      semifinals: [],
      final: {
        matchNumber: 'FINAL',
        match: null,
        team1Source: 'Winner SF1',
        team2Source: 'Winner SF2',
        team1: null,
        team2: null,
        winner: null,
        status: 'pending'
      }
    };
    tournament.champion = null;
    tournament.runnerUp = null;

    // Now regenerate the knockout bracket
    // Get qualified teams from each group (top 2 from each group, sorted by points then NRR)
    const qualifiedTeams = tournament.getQualifiedTeams();

    if (qualifiedTeams.length < 8) {
      // Reset status and save even if not enough teams
      tournament.status = 'group-stage';
      await tournament.save();
      return res.status(400).json({
        message: `Not enough qualified teams. Need 8 teams, found ${qualifiedTeams.length}. Ensure group stage is complete.`
      });
    }

    // Get highest match number
    const lastMatch = await Match.findOne().sort({ matchNumber: -1 });
    let matchNumber = lastMatch ? lastMatch.matchNumber + 1 : 1;

    // Setup quarterfinals bracket
    const groupTeams = {};
    qualifiedTeams.forEach(qt => {
      if (!groupTeams[qt.group]) groupTeams[qt.group] = [];
      groupTeams[qt.group].push(qt);
    });

    // Sort each group's teams by position
    Object.keys(groupTeams).forEach(group => {
      groupTeams[group].sort((a, b) => a.position - b.position);
    });

    const quarterfinalSetup = [
      { team1Source: 'Group A - 1st', team2Source: 'Group B - 2nd', team1Group: 'Group A', team1Pos: 0, team2Group: 'Group B', team2Pos: 1 },
      { team1Source: 'Group C - 1st', team2Source: 'Group D - 2nd', team1Group: 'Group C', team1Pos: 0, team2Group: 'Group D', team2Pos: 1 },
      { team1Source: 'Group B - 1st', team2Source: 'Group A - 2nd', team1Group: 'Group B', team1Pos: 0, team2Group: 'Group A', team2Pos: 1 },
      { team1Source: 'Group D - 1st', team2Source: 'Group C - 2nd', team1Group: 'Group D', team1Pos: 0, team2Group: 'Group C', team2Pos: 1 }
    ];

    const quarterfinals = [];
    for (let i = 0; i < quarterfinalSetup.length; i++) {
      const setup = quarterfinalSetup[i];
      const team1 = groupTeams[setup.team1Group]?.[setup.team1Pos]?.team;
      const team2 = groupTeams[setup.team2Group]?.[setup.team2Pos]?.team;

      const match = new Match({
        matchNumber: matchNumber++,
        tournament: tournament._id,
        stage: 'quarterfinal',
        knockoutMatchId: `QF${i + 1}`,
        team1: team1,
        team2: team2,
        date: new Date(),
        maxOvers: tournament.format.maxOversPerMatch,
        status: 'scheduled'
      });

      await match.save();

      quarterfinals.push({
        matchNumber: `QF${i + 1}`,
        match: match._id,
        team1Source: setup.team1Source,
        team2Source: setup.team2Source,
        team1: team1,
        team2: team2,
        winner: null,
        status: 'scheduled'
      });
    }

    // Setup semifinals (teams TBD)
    const semifinals = [
      {
        matchNumber: 'SF1',
        match: null,
        team1Source: 'Winner QF1',
        team2Source: 'Winner QF2',
        team1: null,
        team2: null,
        winner: null,
        status: 'pending'
      },
      {
        matchNumber: 'SF2',
        match: null,
        team1Source: 'Winner QF3',
        team2Source: 'Winner QF4',
        team1: null,
        team2: null,
        winner: null,
        status: 'pending'
      }
    ];

    // Setup final (teams TBD)
    const final = {
      matchNumber: 'FINAL',
      match: null,
      team1Source: 'Winner SF1',
      team2Source: 'Winner SF2',
      team1: null,
      team2: null,
      winner: null,
      status: 'pending'
    };

    tournament.knockout = {
      quarterfinals,
      semifinals,
      final
    };

    tournament.status = 'knockout-stage';
    await tournament.save();

    res.json({
      message: 'Knockout bracket regenerated successfully',
      knockout: tournament.knockout,
      tournament
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update knockout match manually (for editing teams before match starts)
export const updateKnockoutMatch = async (req, res) => {
  try {
    const { id, knockoutId } = req.params;
    const { team1, team2, date, time } = req.body;

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    // Find the knockout match
    let knockoutMatch = null;
    let matchRef = null;

    // Check quarterfinals
    knockoutMatch = tournament.knockout.quarterfinals.find(qf => qf.matchNumber === knockoutId);
    if (knockoutMatch) {
      if (team1) knockoutMatch.team1 = team1;
      if (team2) knockoutMatch.team2 = team2;
      matchRef = knockoutMatch.match;
    }

    // Check semifinals
    if (!knockoutMatch) {
      knockoutMatch = tournament.knockout.semifinals.find(sf => sf.matchNumber === knockoutId);
      if (knockoutMatch) {
        if (team1) knockoutMatch.team1 = team1;
        if (team2) knockoutMatch.team2 = team2;
        matchRef = knockoutMatch.match;
      }
    }

    // Check final
    if (!knockoutMatch && knockoutId === 'FINAL') {
      knockoutMatch = tournament.knockout.final;
      if (team1) knockoutMatch.team1 = team1;
      if (team2) knockoutMatch.team2 = team2;
      matchRef = knockoutMatch.match;
    }

    if (!knockoutMatch) {
      return res.status(404).json({ message: 'Knockout match not found' });
    }

    // Update the actual Match document if it exists
    if (matchRef) {
      const updateData = {};
      if (team1) updateData.team1 = team1;
      if (team2) updateData.team2 = team2;
      if (date) updateData.date = date;
      if (time) updateData.time = time;

      await Match.findByIdAndUpdate(matchRef, updateData);
    }

    tournament.markModified('knockout');
    await tournament.save();

    res.json({
      message: 'Knockout match updated',
      knockoutMatch,
      tournament
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Clear knockout bracket (delete all knockout matches and reset knockout data)
export const clearKnockout = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    // Delete all knockout stage matches for this tournament
    await Match.deleteMany({
      tournament: tournament._id,
      stage: { $in: ['quarterfinal', 'semifinal', 'final'] }
    });

    // Clear knockout data
    tournament.knockout = {
      quarterfinals: [],
      semifinals: [],
      final: {
        matchNumber: 'FINAL',
        match: null,
        team1Source: 'Winner SF1',
        team2Source: 'Winner SF2',
        team1: null,
        team2: null,
        winner: null,
        status: 'pending'
      }
    };
    tournament.champion = null;
    tournament.runnerUp = null;
    tournament.status = 'group-stage';

    await tournament.save();

    res.json({
      message: 'Knockout bracket cleared successfully',
      tournament
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Add a new match to tournament (group or knockout)
export const addMatch = async (req, res) => {
  try {
    const { matchType, team1, team2, groupName, knockoutMatchId, matchNumber: customMatchNumber, date: customDate } = req.body;

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    // Get the highest current match number (use custom if provided)
    let matchNumber;
    if (customMatchNumber) {
      matchNumber = customMatchNumber;
    } else {
      const lastMatch = await Match.findOne().sort({ matchNumber: -1 });
      matchNumber = lastMatch ? lastMatch.matchNumber + 1 : 1;
    }

    // Determine stage based on matchType
    let stage = 'group';
    if (matchType === 'quarterfinal' || matchType === 'semifinal' || matchType === 'final') {
      stage = matchType;
    }

    // Create the match
    const match = new Match({
      matchNumber,
      tournament: tournament._id,
      stage,
      groupName: matchType === 'group' ? groupName : null,
      knockoutMatchId: knockoutMatchId || null,
      team1,
      team2,
      date: customDate ? new Date(customDate) : new Date(),
      maxOvers: tournament.format.maxOversPerMatch,
      status: 'scheduled'
    });

    await match.save();

    // If it's a group match, add to the group's matches array
    if (matchType === 'group' && groupName) {
      const group = tournament.groups.find(g => g.name === groupName);
      if (group) {
        group.matches.push(match._id);
        tournament.markModified('groups');
        await tournament.save();
      }
    }

    // If it's a knockout match, update the knockout bracket
    if (matchType === 'quarterfinal' && knockoutMatchId) {
      const qfIndex = tournament.knockout.quarterfinals.findIndex(qf => qf.matchNumber === knockoutMatchId);
      if (qfIndex !== -1) {
        tournament.knockout.quarterfinals[qfIndex].match = match._id;
        tournament.knockout.quarterfinals[qfIndex].team1 = team1;
        tournament.knockout.quarterfinals[qfIndex].team2 = team2;
        tournament.knockout.quarterfinals[qfIndex].status = 'scheduled';
        tournament.markModified('knockout');
        await tournament.save();
      }
    } else if (matchType === 'semifinal' && knockoutMatchId) {
      const sfIndex = tournament.knockout.semifinals.findIndex(sf => sf.matchNumber === knockoutMatchId);
      if (sfIndex !== -1) {
        tournament.knockout.semifinals[sfIndex].match = match._id;
        tournament.knockout.semifinals[sfIndex].team1 = team1;
        tournament.knockout.semifinals[sfIndex].team2 = team2;
        tournament.knockout.semifinals[sfIndex].status = 'scheduled';
        tournament.markModified('knockout');
        await tournament.save();
      }
    } else if (matchType === 'final') {
      if (tournament.knockout.final) {
        tournament.knockout.final.match = match._id;
        tournament.knockout.final.team1 = team1;
        tournament.knockout.final.team2 = team2;
        tournament.knockout.final.status = 'scheduled';
        tournament.markModified('knockout');
        await tournament.save();
      }
    }

    res.json({
      message: 'Match added successfully',
      match
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Reset group stage only - clear group matches and standings
export const resetGroupStage = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    // Delete only group stage matches
    await Match.deleteMany({ tournament: tournament._id, stage: 'group' });

    // Reset group matches and standings
    tournament.groups.forEach(group => {
      group.matches = [];
      group.standings = group.teams.map(teamId => ({
        team: teamId,
        played: 0,
        won: 0,
        lost: 0,
        points: 0,
        netRunRate: 0,
        runsScored: 0,
        runsConceded: 0,
        oversPlayed: 0,
        oversFaced: 0
      }));
    });

    // Reset tournament status
    tournament.status = 'planned';

    tournament.markModified('groups');
    await tournament.save();

    res.json({
      message: 'Group stage reset successfully. All group matches have been removed.',
      tournament
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Reset knockout stage only - clear knockout matches
export const resetKnockoutStage = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    // Delete only knockout stage matches
    await Match.deleteMany({
      tournament: tournament._id,
      stage: { $in: ['quarterfinal', 'semifinal', 'final'] }
    });

    // Reset knockout data
    tournament.knockout = {
      quarterfinals: [],
      semifinals: [],
      final: {
        matchNumber: 'FINAL',
        match: null,
        team1Source: 'Winner SF1',
        team2Source: 'Winner SF2',
        team1: null,
        team2: null,
        winner: null,
        status: 'pending'
      }
    };

    // Reset champions
    tournament.champion = null;
    tournament.runnerUp = null;

    // Set status back to group-stage if groups exist
    if (tournament.groups?.length > 0) {
      tournament.status = 'group-stage';
    }

    tournament.markModified('knockout');
    await tournament.save();

    res.json({
      message: 'Knockout stage reset successfully. All knockout matches have been removed.',
      tournament
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Reset tournament - clear all matches (group and knockout)
export const resetTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    // Delete all matches associated with this tournament
    await Match.deleteMany({ tournament: tournament._id });

    // Reset group matches and standings
    tournament.groups.forEach(group => {
      group.matches = [];
      group.standings = group.teams.map(teamId => ({
        team: teamId,
        played: 0,
        won: 0,
        lost: 0,
        points: 0,
        netRunRate: 0,
        runsScored: 0,
        runsConceded: 0,
        oversPlayed: 0,
        oversFaced: 0
      }));
    });

    // Reset knockout data
    tournament.knockout = {
      quarterfinals: [],
      semifinals: [],
      final: {
        matchNumber: 'FINAL',
        match: null,
        team1Source: 'Winner SF1',
        team2Source: 'Winner SF2',
        team1: null,
        team2: null,
        winner: null,
        status: 'pending'
      }
    };

    // Reset tournament status and champions
    tournament.champion = null;
    tournament.runnerUp = null;
    tournament.status = 'planned';

    tournament.markModified('groups');
    tournament.markModified('knockout');
    await tournament.save();

    res.json({
      message: 'Tournament reset successfully. All matches have been removed.',
      tournament
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
