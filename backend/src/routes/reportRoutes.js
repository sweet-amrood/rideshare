const express = require('express');
const Report = require('../models/Report');
const { protect } = require('../middlewares/authMiddleware');
const { emitToAdmin } = require('../admin/services/adminRealtime');

const router = express.Router();

router.use(protect);

router.post('/', async (req, res, next) => {
  try {
    const { reportedUserId, rideId, bookingId, category, description, evidenceUrls } = req.body;
    if (!reportedUserId || !category || !description) {
      res.status(400);
      throw new Error('reportedUserId, category, and description are required');
    }
    const report = await Report.create({
      reporterId: req.user._id,
      reportedUserId,
      rideId,
      bookingId,
      category,
      description,
      evidenceUrls: evidenceUrls || []
    });
    emitToAdmin('new-report', { reportId: report._id, category });
    res.status(201).json({ success: true, data: report });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
