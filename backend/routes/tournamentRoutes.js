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
router.get('/:id/groups/standings', tournamentController.getAllGroupStandings);
router.get('/:id/groups/:groupName/standings', tournamentController.getGroupStandings);

// Knockout management
router.post('/:id/knockout/generate', tournamentController.generateKnockoutBracket);
router.put('/:id/knockout/:knockoutId', tournamentController.updateKnockoutMatch);

// Match result handlers
router.post('/match/:matchId/update-standings', tournamentController.updateGroupStandings);
router.post('/match/:matchId/advance-knockout', tournamentController.advanceKnockoutWinner);

export default router;
