const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/rideRequestController');

const router = express.Router();

router.use(protect);

router.post('/estimate', ctrl.estimateFare);
router.get('/active', ctrl.getActive);
router.get('/history', ctrl.getHistory);
router.get('/current', ctrl.getCurrent);
router.post('/', ctrl.createRequest);
router.get('/incoming', ctrl.listIncoming);
router.get('/:id/chat', ctrl.getChat);
router.post('/:id/chat', ctrl.sendChat);
router.post('/:id/chat/read', ctrl.markChatRead);
router.post('/:id/review', ctrl.submitReview);
router.post('/:id/report', ctrl.submitReport);
router.get('/:id', ctrl.getRequest);
router.post('/:id/expand-wave', ctrl.expandWave);
router.patch('/:id/search-fare', ctrl.updateSearchFare);
router.patch('/:id/location', ctrl.updateLocation);
router.post('/:id/ping-here', ctrl.pingHere);
router.post('/:id/start', ctrl.startRide);
router.post('/:id/complete', ctrl.completeRide);
router.post('/:id/dismiss', ctrl.dismissSession);
router.post('/:id/cancel', ctrl.cancelRide);
router.patch('/:id/fare', ctrl.updateFare);
router.patch('/:id/respond', ctrl.driverRespond);
router.patch('/:id/offers/:offerId/respond', ctrl.passengerRespondOffer);

module.exports = router;
