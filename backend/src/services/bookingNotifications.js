const Notification = require('../models/Notification');
const { sendSMS } = require('./textbee');
const { NOTIFICATION_TYPES } = require('../constants/booking');

const persistNotification = async (userId, type, title, body, data = {}) => {
  try {
    await Notification.create({ userId, type, title, body, data });
  } catch (err) {
    console.error('[notification]', err.message);
  }
};

const notifyUser = async ({ userId, phone, type, title, body, data }) => {
  await persistNotification(userId, type, title, body, data);
  if (phone) {
    try {
      await sendSMS(phone, `${title}: ${body}`);
    } catch (err) {
      console.error('[sms]', err.message);
    }
  }
};

const notifyBookingRequested = async (driver, passenger, booking, ride) => {
  await notifyUser({
    userId: driver._id,
    phone: driver.phoneNumber,
    type: NOTIFICATION_TYPES.BOOKING_REQUESTED,
    title: 'New seat request',
    body: `${passenger.name} requested a ${booking.bookingMode === 'SOLO' ? 'solo (private)' : 'carpool'} booking — ${booking.seatsBooked} seat(s) on ${ride.origin?.address || 'your route'}.`,
    data: { bookingId: booking._id, rideId: ride._id }
  });
};

const notifyBookingConfirmed = async (passenger, driver, booking) => {
  await notifyUser({
    userId: passenger._id,
    phone: passenger.phoneNumber,
    type: NOTIFICATION_TYPES.BOOKING_CONFIRMED,
    title: 'Booking confirmed',
    body: `Driver ${driver.name} confirmed ${booking.seatsBooked} seat(s). Ref: ${booking.bookingRef}.`,
    data: { bookingId: booking._id, rideId: booking.rideId }
  });
};

const notifyBookingRejected = async (passenger, driver, booking) => {
  await notifyUser({
    userId: passenger._id,
    phone: passenger.phoneNumber,
    type: NOTIFICATION_TYPES.BOOKING_REJECTED,
    title: 'Request declined',
    body: `Driver ${driver.name} declined your booking ${booking.bookingRef}.`,
    data: { bookingId: booking._id, rideId: booking.rideId }
  });
};

const notifyBookingCancelled = async (targetUser, actorName, booking, reason) => {
  await notifyUser({
    userId: targetUser._id,
    phone: targetUser.phoneNumber,
    type: NOTIFICATION_TYPES.BOOKING_CANCELLED,
    title: 'Booking cancelled',
    body: `${actorName} cancelled booking ${booking.bookingRef}. ${reason || ''}`.trim(),
    data: { bookingId: booking._id, rideId: booking.rideId }
  });
};

const notifyRefundPrepared = async (passenger, booking, amount) => {
  await notifyUser({
    userId: passenger._id,
    phone: passenger.phoneNumber,
    type: NOTIFICATION_TYPES.REFUND_PREPARED,
    title: 'Refund prepared',
    body: `Rs. ${amount} refund queued for booking ${booking.bookingRef}. Processing may take 3–5 business days.`,
    data: { bookingId: booking._id, rideId: booking.rideId }
  });
};

const notifyRideCompleted = async (users, ride) => {
  const body = `Ride from ${ride.origin?.address} is marked complete. Thank you for carpooling!`;
  await Promise.all(
    users.map((u) =>
      notifyUser({
        userId: u._id,
        phone: u.phoneNumber,
        type: NOTIFICATION_TYPES.RIDE_COMPLETED,
        title: 'Ride completed',
        body,
        data: { rideId: ride._id }
      })
    )
  );
};

module.exports = {
  notifyBookingRequested,
  notifyBookingConfirmed,
  notifyBookingRejected,
  notifyBookingCancelled,
  notifyRefundPrepared,
  notifyRideCompleted,
  persistNotification
};
