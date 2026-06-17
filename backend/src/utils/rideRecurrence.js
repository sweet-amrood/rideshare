const MAX_RECURRING_INSTANCES = 24;
const DEFAULT_WEEKS_AHEAD = 4;

/**
 * Build departure Date objects for recurring rides.
 * @param {Date|string} startDate - anchor date
 * @param {number[]} daysOfWeek - 0=Sun .. 6=Sat
 * @param {string} departureTime - HH:mm
 * @param {number} weeksAhead
 */
const generateOccurrenceDates = (
  startDate,
  daysOfWeek = [],
  departureTime = '08:00',
  weeksAhead = DEFAULT_WEEKS_AHEAD
) => {
  if (!daysOfWeek.length) return [];

  const [hours, minutes] = departureTime.split(':').map((n) => parseInt(n, 10) || 0);
  const anchor = new Date(startDate);
  anchor.setHours(0, 0, 0, 0);

  const end = new Date(anchor);
  end.setDate(end.getDate() + weeksAhead * 7);

  const uniqueDays = [...new Set(daysOfWeek.map((d) => parseInt(d, 10)))].filter(
    (d) => d >= 0 && d <= 6
  );

  const dates = [];
  const cursor = new Date(anchor);

  while (cursor <= end && dates.length < MAX_RECURRING_INSTANCES) {
    if (uniqueDays.includes(cursor.getDay())) {
      const occurrence = new Date(cursor);
      occurrence.setHours(hours, minutes, 0, 0);
      if (occurrence >= anchor) {
        dates.push(occurrence);
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates.sort((a, b) => a - b);
};

const matchesRecurrenceDay = (ride, searchDate) => {
  if (!ride.isRecurring && ride.rideType !== 'RECURRING') return true;
  const days = ride.recurrence?.daysOfWeek || [];
  if (!days.length) return true;
  const d = new Date(searchDate);
  return days.includes(d.getDay());
};

module.exports = {
  generateOccurrenceDates,
  matchesRecurrenceDay,
  MAX_RECURRING_INSTANCES,
  DEFAULT_WEEKS_AHEAD
};
