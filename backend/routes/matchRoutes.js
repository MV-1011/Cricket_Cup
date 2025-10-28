const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');

router.get('/', matchController.getAllMatches);
router.get('/live', matchController.getLiveMatches);
router.get('/:id', matchController.getMatchById);
router.post('/', matchController.createMatch);
router.put('/:id', matchController.updateMatch);
router.delete('/:id', matchController.deleteMatch);
router.post('/:id/start', matchController.startMatch);
router.post('/:id/ball', matchController.updateBallByBall);

module.exports = router;
