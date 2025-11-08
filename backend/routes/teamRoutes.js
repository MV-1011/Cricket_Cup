import express from 'express';
import * as teamController from '../controllers/teamController.js';
const router = express.Router();

router.get('/', teamController.getAllTeams);
router.get('/standings', teamController.getStandings);
router.get('/:id', teamController.getTeamById);
router.post('/', teamController.createTeam);
router.put('/:id', teamController.updateTeam);
router.delete('/:id', teamController.deleteTeam);

export default router;
