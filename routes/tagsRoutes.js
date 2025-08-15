const express = require('express');
const TagsController = require('../controllers/TagsController');

const router = express.Router();

router.get('/search', TagsController.searchTags);

router.get('/popular', TagsController.getPopularTags);

router.post('/', TagsController.getOrCreateTag);

module.exports = router;
