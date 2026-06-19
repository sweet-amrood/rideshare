const { sendSMS } = require('./textbee');
const { NOTIFICATION_TYPES } = require('../constants/booking');
const { createNotification } = require('./notificationService');

const notifyUser = async ({ userId, phone, type, title, body, data }) => {
  await createNotification({ userId, type, title, body, data });
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
    body: `${passenger.name} requested ${booking.seatsBooked} seat(s) on your carpool.`,
    data: { bookingId: booking._id, rideId: ride._id }
  });
};

const notifyBookingConfirmed = async (passenger, driver, booking) => {
  await notifyUser({
    userId: passenger._id,
    phone: passenger.phoneNumber,
    type: NOTIFICATION_TYPES.BOOKING_CONFIRMED,
    title: 'Booking confirmed',
    body: `Driver ${driver.name} confirmed your seat. Ref: ${booking.bookingRef}.`,
    data: { bookingId: booking._id, rideId: booking.rideId }
  });
};

const notifyBookingRejected = async (passenger, driver, booking) => {
  await notifyUser({
    userId: passenger._id,
    phone: passenger.phoneNumber,
    type: NOTIFICATION_TYPES.BOOKING_REJECTED,
    title: 'Request declined',
    body: `Driver ${driver.name} declined booking ${booking.bookingRef}.`,
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
    body: `Rs. ${amount} refund queued for booking ${booking.bookingRef}.`,
    data: { bookingId: booking._id, rideId: booking.rideId }
  });
};

const notifyRideStarted = async (passengers, ride, driverName, firstPickupBookingId = null) => {
  await Promise.all(
    passengers.map((passenger) => {
      if (!passenger?._id) return Promise.resolve();
      const isFirst =
        firstPickupBookingId &&
        passenger.bookingId &&
        String(passenger.bookingId) === String(firstPickupBookingId);
      return notifyUser({
        userId: passenger._id,
        phone: passenger.phoneNumber,
        type: NOTIFICATION_TYPES.RIDE_STARTED,
        title: isFirst ? 'Driver is heading to you' : 'Carpool started',
        body: isFirst
          ? `${driverName} started the ride and is coming to pick you up.`
          : `${driverName} started the carpool — you will be picked up in route order.`,
        data: { rideId: ride._id, bookingId: passenger.bookingId }
      });
    })
  );
};

const notifyRideCompleted = async (users, ride) => {
  const body = `Ride from ${ride.origin?.address || 'your route'} is complete.`;
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
  notifyRideStarted,
  notifyRideCompleted,
  notifyUser
};
