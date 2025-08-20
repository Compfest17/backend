const express = require('express');
const router = express.Router();
const PointController = require('../controllers/PointController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/rules', requireRole(['admin']), PointController.getPointRules);

router.post('/rules', requireRole(['admin']), PointController.createPointRule);

router.put('/rules/:ruleId', requireRole(['admin']), PointController.updatePointRule);

router.delete('/rules/:ruleId', requireRole(['admin']), PointController.deletePointRule);

router.post('/manual', requireRole(['admin']), PointController.manualAdjustment);

router.get('/history/:userId', PointController.getUserPointHistory);

router.get('/statistics', requireRole(['admin']), PointController.getPointStatistics);

module.exports = router;
