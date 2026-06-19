const Chat = require('../models/Chat');
const Ride = require('../models/Ride');
const Booking = require('../models/Booking');
const { BOOKING_STATUS } = require('../constants/booking');

const CHAT_ELIGIBLE_STATUSES = [
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.COMPLETED
];

const formatChatMessage = (doc, viewerId) => {
  const m = doc.toObject ? doc.toObject() : doc;
  return {
    _id: m._id,
    rideId: m.rideId,
    senderId: m.senderId,
    senderName: m.senderName || 'Passenger',
    message: m.message,
    createdAt: m.createdAt,
    isMe: viewerId && String(m.senderId) === String(viewerId)
  };
};

const assertRideChatParticipant = async (rideId, userId) => {
  const ride = await Ride.findById(rideId).select('driverId status');
  if (!ride) {
    const err = new Error('Ride not found');
    err.statusCode = 404;
    throw err;
  }
  if (String(ride.driverId) === String(userId)) {
    return { ride, role: 'DRIVER' };
  }
  const booking = await Booking.findOne({
    rideId,
    passengerId: userId,
    status: { $in: CHAT_ELIGIBLE_STATUSES }
  });
  if (!booking) {
    const err = new Error('You are not a participant on this ride');
    err.statusCode = 403;
    throw err;
  }
  return { ride, role: 'PASSENGER', booking };
};

const getChatMessages = async (rideId, userId) => {
  await assertRideChatParticipant(rideId, userId);
  const messages = await Chat.find({ rideId })
    .sort({ createdAt: 1 })
    .limit(200)
    .lean();
  return messages.map((m) => formatChatMessage(m, userId));
};

const saveChatMessage = async (rideId, senderId, senderName, message) => {
  const text = String(message || '').trim();
  if (!text) {
    const err = new Error('Message is required');
    err.statusCode = 400;
    throw err;
  }
  await assertRideChatParticipant(rideId, senderId);
  const doc = await Chat.create({
    rideId,
    senderId,
    senderName: senderName || '',
    message: text.slice(0, 2000)
  });
  return formatChatMessage(doc, senderId);
};

module.exports = {
  assertRideChatParticipant,
  getChatMessages,
  saveChatMessage,
  formatChatMessage
};
