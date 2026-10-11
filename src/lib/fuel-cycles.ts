export type FuelCycleInput = {
  id: string;
  date: Date | string;
  createdAt: Date | string;
  currentOdometerKm: number | null;
  distanceMode?: string;
  actualDistanceKm?: number | null;
  liters: number | { toString(): string };
  isFullTank: boolean | null;
};

export type FuelCycleResult = {
  previousFullRefuelId: string;
  cycleDistanceKm: number;
  cycleFuelLiters: number;
  cycleKmPerLiter: number;
};

export class FuelOdometerError extends Error {
  constructor() {
    super('הקילומטראז׳ לא יכול להיות נמוך מהתדלוק הקודם.');
  }
}

export function calculateFuelCycles(input: FuelCycleInput[]) {
  const rows = [...input].sort((left, right) =>
    new Date(left.date).getTime() - new Date(right.date).getTime() ||
    new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime() ||
    left.id.localeCompare(right.id));
  const cycles = new Map<string, FuelCycleResult>();
  let previousOdometer: number | null = null;
  let baseline: FuelCycleInput | null = null;
  let fuelSinceBaseline = 0;
  let hasUnclassifiedRefuel = false;

  for (const row of rows) {
    const odometer = row.currentOdometerKm;
    if (odometer !== null) {
      if (previousOdometer !== null && odometer < previousOdometer) throw new FuelOdometerError();
      previousOdometer = odometer;
    }

    if (!baseline) {
      if (row.isFullTank === true) baseline = row;
      continue;
    }

    fuelSinceBaseline += Number(row.liters);
    if (row.isFullTank === null) hasUnclassifiedRefuel = true;
    if (row.isFullTank !== true) continue;

    const distance = row.distanceMode==='trip'?Number(row.actualDistanceKm??0):odometer!==null&&baseline.currentOdometerKm!==null?odometer-baseline.currentOdometerKm:0;
    if (!hasUnclassifiedRefuel && distance > 0 && fuelSinceBaseline > 0) {
      cycles.set(row.id, {
        previousFullRefuelId: baseline.id,
        cycleDistanceKm: distance,
        cycleFuelLiters: Number(fuelSinceBaseline.toFixed(2)),
        cycleKmPerLiter: Number((distance / fuelSinceBaseline).toFixed(2))
      });
    }
    baseline = row;
    fuelSinceBaseline = 0;
    hasUnclassifiedRefuel = false;
  }

  return cycles;
}
