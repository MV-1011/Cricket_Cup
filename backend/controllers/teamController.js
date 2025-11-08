import Team from '../models/Team.js';
import Player from '../models/Player.js';

// Get all teams
export const getAllTeams = async (req, res) => {
  try {
    const teams = await Team.find().populate('players').sort({ points: -1, netRunRate: -1 });
    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get team by ID
export const getTeamById = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id).populate('players');
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    res.json(team);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create team
export const createTeam = async (req, res) => {
  try {
    const team = new Team(req.body);
    const newTeam = await team.save();
    res.status(201).json(newTeam);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update team
export const updateTeam = async (req, res) => {
  try {
    const team = await Team.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    res.json(team);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete team
export const deleteTeam = async (req, res) => {
  try {
    const team = await Team.findByIdAndDelete(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get standings
export const getStandings = async (req, res) => {
  try {
    const teams = await Team.find()
      .sort({ points: -1, netRunRate: -1 })
      .select('name shortName matchesPlayed matchesWon matchesLost points netRunRate');
    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
