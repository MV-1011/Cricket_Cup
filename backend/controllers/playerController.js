const Player = require('../models/Player');
const Team = require('../models/Team');

// Get all players
exports.getAllPlayers = async (req, res) => {
  try {
    const players = await Player.find().populate('team', 'name shortName');
    res.json(players);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get player by ID
exports.getPlayerById = async (req, res) => {
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
exports.createPlayer = async (req, res) => {
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
exports.updatePlayer = async (req, res) => {
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
exports.deletePlayer = async (req, res) => {
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
exports.getTopBatsmen = async (req, res) => {
  try {
    const limit = req.query.limit || 20;
    const players = await Player.find({ 'battingStats.innings': { $gt: 0 } })
      .populate('team', 'name shortName')
      .sort({ 'battingStats.runs': -1, 'battingStats.average': -1 })
      .limit(parseInt(limit));
    res.json(players);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get top bowlers
exports.getTopBowlers = async (req, res) => {
  try {
    const limit = req.query.limit || 20;
    const players = await Player.find({ 'bowlingStats.innings': { $gt: 0 } })
      .populate('team', 'name shortName')
      .sort({ 'bowlingStats.wickets': -1, 'bowlingStats.average': 1 })
      .limit(parseInt(limit));
    res.json(players);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
