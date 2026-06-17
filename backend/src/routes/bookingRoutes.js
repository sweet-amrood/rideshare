const express = require('express');
const {
  createBooking,
  updateBookingStatus,
  cancelBooking,
  prepareRefund,
  completeRide,
  getBookingHistory,
  getBookingById,
  getLiveSeats,
  getMyTrips,
  getIncomingBookings,
  getActiveCommitment,
  getFareQuote,
  getCarpoolLiveMap
} = require('../controllers/bookingController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/book', createBooking);
router.get('/active-commitment', getActiveCommitment);
router.get('/history', getBookingHistory);
router.get('/incoming', getIncomingBookings);
router.get('/my-trips', getMyTrips);
router.post('/ride/:rideId/fare-quote', getFareQuote);
router.get('/ride/:rideId/seats', getLiveSeats);
router.get('/ride/:rideId/live-map', getCarpoolLiveMap);
router.post('/ride/:rideId/complete', completeRide);
router.get('/:id', getBookingById);
router.patch('/:id/status', updateBookingStatus);
router.patch('/:id/cancel', cancelBooking);
router.post('/:id/refund/prepare', prepareRefund);

module.exports = router;
