import express from 'express';
import * as playerController from '../controllers/playerController.js';
const router = express.Router();

router.get('/', playerController.getAllPlayers);
router.get('/top-batsmen', playerController.getTopBatsmen);
router.get('/top-bowlers', playerController.getTopBowlers);
router.get('/:id', playerController.getPlayerById);
router.post('/', playerController.createPlayer);
router.put('/:id', playerController.updatePlayer);
router.delete('/:id', playerController.deletePlayer);

export default router;
