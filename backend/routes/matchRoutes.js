import express from 'express';
import * as matchController from '../controllers/matchController.js';
const router = express.Router();

router.get('/', matchController.getAllMatches);
router.get('/live', matchController.getLiveMatches);
router.post('/:id/start', matchController.startMatch);
router.post('/:id/ball', matchController.updateBallByBall);
router.delete('/:id/ball/last', matchController.undoLastBall);
router.post('/:id/restart', matchController.restartMatch);
router.get('/:id', matchController.getMatchById);
router.post('/', matchController.createMatch);
router.put('/:id', matchController.updateMatch);
router.delete('/:id', matchController.deleteMatch);

export default router;
