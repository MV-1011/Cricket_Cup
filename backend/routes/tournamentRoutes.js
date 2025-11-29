import express from 'express';
import * as tournamentController from '../controllers/tournamentController.js';

const router = express.Router();

// Basic CRUD
router.get('/', tournamentController.getAllTournaments);
router.get('/:id', tournamentController.getTournamentById);
router.post('/', tournamentController.createTournament);
router.put('/:id', tournamentController.updateTournament);
router.delete('/:id', tournamentController.deleteTournament);

// Group management
router.post('/:id/groups/setup', tournamentController.setupGroups);
router.post('/:id/groups/generate-matches', tournamentController.generateGroupMatches);
router.post('/:id/groups/regenerate-matches', tournamentController.regenerateGroupMatches);
router.put('/:id/groups/match/:matchId', tournamentController.updateGroupMatch);
router.get('/:id/groups/standings', tournamentController.getAllGroupStandings);
router.get('/:id/groups/:groupName/standings', tournamentController.getGroupStandings);

// Knockout management
router.post('/:id/knockout/generate', tournamentController.generateKnockoutBracket);
router.post('/:id/knockout/regenerate', tournamentController.regenerateKnockoutBracket);
router.delete('/:id/knockout', tournamentController.clearKnockout);
router.put('/:id/knockout/:knockoutId', tournamentController.updateKnockoutMatch);

// Reset tournament (clear all matches - group and knockout)
router.post('/:id/reset', tournamentController.resetTournament);
router.post('/:id/reset/groups', tournamentController.resetGroupStage);
router.post('/:id/reset/knockout', tournamentController.resetKnockoutStage);

// Add match manually
router.post('/:id/matches', tournamentController.addMatch);

// Match result handlers
router.post('/match/:matchId/update-standings', tournamentController.updateGroupStandings);
router.post('/match/:matchId/advance-knockout', tournamentController.advanceKnockoutWinner);

export default router;
