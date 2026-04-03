const DEFAULT_ZONE_FEES = {
  zone_a: 700,
  zone_b: 1000,
  zone_c: 1500,
  outside: 2000,
};

const DEFAULT_DISTANCE_BANDS = [
  { maxKm: 3, fee: 700 },
  { maxKm: 6, fee: 1200 },
  { maxKm: 10, fee: 1800 },
  { maxKm: Infinity, fee: 2500 },
];

const parseZoneConfig = () => {
  const raw = process.env.DELIVERY_ZONE_FEES;
  if (!raw) {
    return DEFAULT_ZONE_FEES;
  }

  try {
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_ZONE_FEES, ...parsed };
  } catch (_error) {
    return DEFAULT_ZONE_FEES;
  }
};

const parseDistanceConfig = () => {
  const raw = process.env.DELIVERY_DISTANCE_BANDS;
  if (!raw) {
    return DEFAULT_DISTANCE_BANDS;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return DEFAULT_DISTANCE_BANDS;
    }

    return parsed
      .filter((band) => Number.isFinite(Number(band.maxKm)) || band.maxKm === 'Infinity')
      .map((band) => ({
        maxKm: band.maxKm === 'Infinity' ? Infinity : Number(band.maxKm),
        fee: Number(band.fee),
      }))
      .sort((a, b) => a.maxKm - b.maxKm);
  } catch (_error) {
    return DEFAULT_DISTANCE_BANDS;
  }
};

const calculateDeliveryFee = ({ mode = 'zone', zone = 'outside', distanceKm = 0 }) => {
  if (mode === 'distance') {
    const bands = parseDistanceConfig();
    const matched = bands.find((band) => distanceKm <= band.maxKm);
    return {
      fee: matched ? matched.fee : DEFAULT_DISTANCE_BANDS[DEFAULT_DISTANCE_BANDS.length - 1].fee,
      appliedRule: {
        mode: 'distance',
        distanceKm,
      },
    };
  }

  const zoneFees = parseZoneConfig();
  const normalizedZone = String(zone || 'outside').toLowerCase();
  const fee = zoneFees[normalizedZone] ?? zoneFees.outside;

  return {
    fee,
    appliedRule: {
      mode: 'zone',
      zone: normalizedZone,
    },
  };
};

module.exports = {
  calculateDeliveryFee,
  DEFAULT_ZONE_FEES,
  DEFAULT_DISTANCE_BANDS,
};
