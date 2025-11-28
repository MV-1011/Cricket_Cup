import Player from '../models/Player.js';
import Team from '../models/Team.js';

// Get all players
export const getAllPlayers = async (req, res) => {
  try {
    const players = await Player.find().populate('team', 'name');
    res.json(players);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get player by ID
export const getPlayerById = async (req, res) => {
  try {
    const player = await Player.findById(req.params.id).populate('team');
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }
    res.json(player);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create player
export const createPlayer = async (req, res) => {
  try {
    const player = new Player(req.body);
    const newPlayer = await player.save();

    // Add player to team
    await Team.findByIdAndUpdate(
      req.body.team,
      { $push: { players: newPlayer._id } }
    );

    res.status(201).json(newPlayer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update player
export const updatePlayer = async (req, res) => {
  try {
    const player = await Player.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }
    res.json(player);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete player
export const deletePlayer = async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }

    // Remove player from team
    await Team.findByIdAndUpdate(
      player.team,
      { $pull: { players: player._id } }
    );

    await Player.findByIdAndDelete(req.params.id);
    res.json({ message: 'Player deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get top batsmen
export const getTopBatsmen = async (req, res) => {
  try {
    const limit = req.query.limit || 20;
    const players = await Player.find({ 'battingStats.innings': { $gt: 0 } })
      .populate('team', 'name')
      .sort({ 'battingStats.runs': -1, 'battingStats.average': -1 })
      .limit(parseInt(limit));
    res.json(players);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get top bowlers
export const getTopBowlers = async (req, res) => {
  try {
    const limit = req.query.limit || 20;
    const players = await Player.find({ 'bowlingStats.innings': { $gt: 0 } })
      .populate('team', 'name')
      .sort({ 'bowlingStats.wickets': -1, 'bowlingStats.average': 1 })
      .limit(parseInt(limit));
    res.json(players);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
