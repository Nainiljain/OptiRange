import { connectDB } from '@/lib/db';
import { Trip, EvData } from '@/lib/models';

export async function calculateDriverEfficiency(userId: string): Promise<number> {
  await connectDB();

  // 1. Fetch user's past trips
  const pastTrips = await Trip.find({ userId }).lean() as any[];
  if (!pastTrips || pastTrips.length === 0) {
    return 1.0; // Baseline multiplier if no historical data
  }

  // 2. Aggregate actual historical efficiency
  let totalDistanceMiles = 0;
  let totalBatteryUsedKwh = 0;

  for (const trip of pastTrips) {
    if (trip.distance && trip.batteryUsed) {
      totalDistanceMiles += trip.distance;
      totalBatteryUsedKwh += trip.batteryUsed;
    }
  }

  // Failsafe
  if (totalDistanceMiles === 0 || totalBatteryUsedKwh === 0) {
    return 1.0;
  }

  const actualMiPerKwh = totalDistanceMiles / totalBatteryUsedKwh;

  // 3. Get User's Rated EV Stats
  const evs = await EvData.find({ userId }).sort({ createdAt: -1 }).limit(1).lean() as any[];
  let ratedMiPerKwh = 4.0; // Industry standard fallback

  if (evs && evs.length > 0) {
    const primaryCar = evs[0];
    if (primaryCar.rangeAtFull && primaryCar.batteryCapacity) {
      // rangeAtFull is stored in km
      const rangeMiles = primaryCar.rangeAtFull / 1.60934;
      ratedMiPerKwh = rangeMiles / primaryCar.batteryCapacity;
    }
  }

  // 4. Calculate ratio (Driver Multiplier)
  // Example: Actual = 3, Rated = 4, Ratio = 0.75 (driver gets less range)
  let ratio = actualMiPerKwh / ratedMiPerKwh;

  // Cap ratio between 0.6 and 1.3 to prevent wild edge cases (short tests, etc.)
  if (ratio < 0.6) ratio = 0.6;
  if (ratio > 1.3) ratio = 1.3;

  return ratio;
}
