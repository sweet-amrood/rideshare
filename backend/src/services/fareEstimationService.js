const FareSettings = require('../models/FareSettings');
const { estimateDistanceKm } = require('../utils/ridePricing');
const { estimateLegMetrics } = require('./tripMetricsService');
const { getVehicleRate, VEHICLE_TYPES, RATE_FIELDS } = require('../utils/fareSettingsHelpers');
const { buildFareFormula, computeFareBreakdown } = require('../utils/fareFormulaDisplay');

const getFareSettings = async () => {
  let doc = await FareSettings.findOne({ key: 'default' }).lean();
  if (!doc) {
    const created = await FareSettings.create({ key: 'default' });
    doc = created.toObject();
  }
  return doc;
};

const updateFareSettings = async (payload) => {
  let doc = await FareSettings.findOne({ key: 'default' });
  if (!doc) {
    doc = await FareSettings.create({ key: 'default' });
  }

  const topLevel = [
    'nightMultiplier',
    'nightStartHour',
    'nightEndHour',
    'peakHours',
    'searchWaveRadiiMeters',
    'driverNotifyRadiusMeters',
    'avgSpeedKmh',
    'acPremiumMultiplier',
    'currency'
  ];
  topLevel.forEach((k) => {
    if (payload[k] !== undefined) doc[k] = payload[k];
  });

  if (payload.vehicleRates) {
    VEHICLE_TYPES.forEach((vt) => {
      const incoming = payload.vehicleRates[vt];
      if (!incoming) return;
      RATE_FIELDS.forEach((field) => {
        const val = incoming[field];
        if (val !== undefined && val !== '' && !Number.isNaN(Number(val))) {
          doc.set(`vehicleRates.${vt}.${field}`, Number(val));
        }
      });
    });
    doc.markModified('vehicleRates');
  }

  await doc.save();
  return doc.toObject();
};

const isNightHour = (hour, settings) => {
  const start = settings.nightStartHour ?? 21;
  const end = settings.nightEndHour ?? 6;
  if (start > end) return hour >= start || hour < end;
  return hour >= start && hour < end;
};

const getPeakMultiplier = (hour, settings) => {
  const peaks = settings.peakHours || [];
  for (const p of peaks) {
    const s = p.startHour ?? 0;
    const e = p.endHour ?? 0;
    if (s <= e) {
      if (hour >= s && hour < e) return p.multiplier ?? 1;
    } else if (hour >= s || hour < e) {
      return p.multiplier ?? 1;
    }
  }
  return 1;
};

const AC_FARE_MULTIPLIER = 1.15;

const estimateTripFare = async ({
  originCoords,
  destCoords,
  vehicleType = 'BIKE',
  hasAC = false,
  at = new Date(),
  distanceKm: distanceOverride,
  /** false = instant haversine estimate (fare modal); true = OSRM when available */
  useRoadRouting = true
}) => {
  const settings = await getFareSettings();
  const vr = getVehicleRate(settings, vehicleType);

  let distanceKm = distanceOverride;
  if (distanceKm == null && originCoords?.length >= 2 && destCoords?.length >= 2) {
    if (useRoadRouting) {
      const leg = await estimateLegMetrics(
        { coordinates: originCoords },
        { coordinates: destCoords },
        vehicleType
      );
      distanceKm = leg.distanceKm;
    } else {
      distanceKm = estimateDistanceKm(originCoords, destCoords) ?? 5;
    }
  }
  if (distanceKm == null) {
    distanceKm = estimateDistanceKm(originCoords, destCoords) ?? 5;
  }

  const hour = at.getHours();
  const nightMult = isNightHour(hour, settings) ? settings.nightMultiplier ?? 1 : 1;
  const peakMult = getPeakMultiplier(hour, settings);

  const distanceKmRounded = Math.round(distanceKm * 10) / 10;
  const ratePerKm = vr.ratePerKm ?? vr.perKmRate ?? 25;
  const minimumFare = vr.minimumFare ?? 0;

  const { subtotal, withSurcharges, raw } = computeFareBreakdown(
    ratePerKm,
    distanceKmRounded,
    nightMult,
    peakMult,
    minimumFare
  );

  let recommendedFare = Math.max(Math.round(raw), minimumFare);
  const minDisc = (vr.passengerMinDiscountPercent ?? 13) / 100;
  const maxInc = (vr.driverMaxIncreasePercent ?? 25) / 100;
  let minFare = Math.max(
    Math.round(recommendedFare * (1 - minDisc)),
    Math.round(minimumFare > 0 ? minimumFare * 0.8 : recommendedFare * 0.87)
  );
  let maxFare = Math.round(recommendedFare * (1 + maxInc));

  if (hasAC) {
    recommendedFare = Math.round(recommendedFare * AC_FARE_MULTIPLIER);
    minFare = Math.round(minFare * AC_FARE_MULTIPLIER);
    maxFare = Math.round(maxFare * AC_FARE_MULTIPLIER);
  }

  const formulaDisplay = buildFareFormula({
    vehicleType,
    ratePerKm,
    distanceKm: distanceKmRounded,
    nightMultiplier: nightMult,
    peakMultiplier: peakMult
  });

  let formulaSteps = `${ratePerKm} × ${distanceKmRounded}${nightMult > 1 || peakMult > 1 ? ` × ${[nightMult > 1 ? nightMult : null, peakMult > 1 ? peakMult : null].filter(Boolean).join(' × ')}` : ''} = ${Math.round(withSurcharges)}`;
  if (hasAC) {
    formulaSteps += ` × ${AC_FARE_MULTIPLIER} (AC) = ${recommendedFare}`;
  }

  return {
    distanceKm: distanceKmRounded,
    recommendedFare,
    minFare,
    maxFare,
    currency: settings.currency || 'PKR',
    formulaDisplay,
    formulaSteps,
    ratePerKm,
    subtotal: Math.round(subtotal),
    factors: {
      vehicleType,
      ratePerKm,
      perKmRate: ratePerKm,
      minimumFare,
      nightMultiplier: nightMult,
      peakMultiplier: peakMult,
      hasAC: !!hasAC,
      acMultiplier: hasAC ? AC_FARE_MULTIPLIER : 1,
      hour,
      subtotal: Math.round(subtotal),
      withSurcharges: Math.round(withSurcharges),
      passengerMinDiscountPercent: vr.passengerMinDiscountPercent,
      driverMaxIncreasePercent: vr.driverMaxIncreasePercent
    },
    waveRadiiMeters: settings.searchWaveRadiiMeters || [1500, 3000, 5000, 8000],
    driverNotifyRadiusMeters: settings.driverNotifyRadiusMeters ?? 5000,
    avgSpeedKmh: settings.avgSpeedKmh ?? 22
  };
};

const clampPassengerFare = (offered, estimate) =>
  Math.min(Math.max(offered, estimate.minFare), estimate.maxFare);

const clampDriverCounterFare = (offered, estimate) =>
  Math.min(Math.max(offered, estimate.recommendedFare), estimate.maxFare);

module.exports = {
  getFareSettings,
  updateFareSettings,
  estimateTripFare,
  clampPassengerFare,
  clampDriverCounterFare
};
