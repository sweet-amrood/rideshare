const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const { mapsLimiter } = require('../middlewares/mapsRateLimiter');
const {
  getBootstrap,
  autocomplete,
  details,
  directions,
  distanceMatrix,
  reverse,
  nearbyRides,
  routeSuggestions
} = require('../controllers/mapsController');

const router = express.Router();

router.use(protect);
router.use(mapsLimiter);

router.get('/bootstrap', getBootstrap);
router.get('/places/autocomplete', autocomplete);
router.get('/places/details', details);
router.get('/geocode/reverse', reverse);
router.post('/directions', directions);
router.post('/distance-matrix', distanceMatrix);
router.post('/nearby-rides', nearbyRides);
router.post('/route-suggestions', routeSuggestions);

module.exports = router;
