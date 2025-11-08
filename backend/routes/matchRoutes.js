import express from 'express';
import * as matchController from '../controllers/matchController.js';
const router = express.Router();

router.get('/', matchController.getAllMatches);
router.get('/live', matchController.getLiveMatches);
router.get('/:id', matchController.getMatchById);
router.post('/', matchController.createMatch);
router.put('/:id', matchController.updateMatch);
router.delete('/:id', matchController.deleteMatch);
router.post('/:id/start', matchController.startMatch);
router.post('/:id/ball', matchController.updateBallByBall);

export default router;
