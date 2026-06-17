const express = require('express');
const { getCommunities, joinCommunity } = require('../controllers/communityController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', getCommunities);
router.post('/join', joinCommunity);

module.exports = router;
