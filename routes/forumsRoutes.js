const express = require('express');
const ForumsController = require('../controllers/ForumsController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/trending', ForumsController.getTrending); 
router.get('/home/summary', ForumsController.getHomeSummary);
router.get('/bookmarks', authenticateToken, ForumsController.getUserBookmarks);
router.get('/all', 
  authenticateToken, 
  requireRole(['admin']), 
  ForumsController.getForums
);
router.get('/by-province/:province', 
  authenticateToken, 
  requireRole(['admin', 'karyawan']), 
  ForumsController.getReportsByProvince
);

router.get('/', ForumsController.getForums);
router.get('/:id', ForumsController.getForumById);
router.get('/:forumId/comments', ForumsController.getComments);
router.post('/comments/:commentId/vote', authenticateToken, ForumsController.voteComment);

router.post('/', authenticateToken, ForumsController.createForum);
router.get('/:forumId/mention-suggestions', authenticateToken, ForumsController.getMentionSuggestions);
router.post('/:forumId/comments', authenticateToken, ForumsController.createComment);
router.put('/comments/:commentId', authenticateToken, ForumsController.updateComment);
router.delete('/comments/:commentId', authenticateToken, ForumsController.deleteComment);
router.post('/:id/vote', authenticateToken, ForumsController.votePost);
router.post('/:id/bookmark', authenticateToken, ForumsController.toggleBookmark);
router.get('/:id/bookmark/status', authenticateToken, ForumsController.checkBookmarkStatus);

router.patch('/:reportId/status', 
  authenticateToken, 
  requireRole(['admin', 'karyawan']), 
  ForumsController.updateReportStatus
);

module.exports = router;
