const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const {
  getNotifications,
  patchRead,
  patchReadAll
} = require('../controllers/notificationController');

const router = express.Router();

router.use(protect);
router.get('/', getNotifications);
router.patch('/read-all', patchReadAll);
router.patch('/:id/read', patchRead);

module.exports = router;
