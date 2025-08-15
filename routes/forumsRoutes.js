const express = require('express');
const ForumsController = require('../controllers/ForumsController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', ForumsController.getForums);
router.get('/:id', ForumsController.getForumById);

router.post('/', authenticateToken, ForumsController.createForum);

module.exports = router;
