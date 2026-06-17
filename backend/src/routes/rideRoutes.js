const express = require('express');
const {
  offerRide,
  estimatePrice,
  searchRides,
  getMyOffers,
  getRideById,
  updateRide,
  cancelRide
} = require('../controllers/rideController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/offer', authorize('DRIVER'), offerRide);
router.post('/estimate-price', estimatePrice);
router.post('/search', searchRides);
router.get('/my-offers', getMyOffers);
router.get('/:id', getRideById);
router.patch('/:id', updateRide);
router.delete('/:id', cancelRide);

module.exports = router;
