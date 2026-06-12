// Constants (adjust as needed)
const BASE_TEMP_C = 0; // Melting threshold in °C
const MELT_RATE = 3; // mm/°C/day (typical range: 1–4)[1]

// Calculate daily melt depth in mm
function calculateSnowMeltDepth(
  airTempC: number,
  meltRate = MELT_RATE,
  baseTempC = BASE_TEMP_C,
): number {
  if (airTempC <= baseTempC) return 0;
  return meltRate * (airTempC - baseTempC); // mm/day
}

export class SnowPile {
  public currentVolume: number; // m³
  public height: number; // m
  private meltWaterProduced: number; // m³
  private currentMeltWaterProduced: number; // m³
  private initialVolume: number; // m³

  constructor(
    public area: number, // m²
    initialHeight: number, // m
  ) {
    this.height = initialHeight;
    this.currentVolume = area * initialHeight;
    this.initialVolume = this.currentVolume;
    this.meltWaterProduced = 0;
    this.currentMeltWaterProduced = 0;
  }

  // Calculate daily melt and update volume and height
  /**
   * @param airTempC Air temperature in °C
   * @param rainMM Rainfall in mm
   * @param sunshineHours Sunshine duration in hours (0-24)
   */
  calculateDailyMelt(
    airTempC: number,
    rainMM: number,
    sunshineHours: number,
  ): number {
    let meltRate = MELT_RATE;
    let rainWater = 0;
    const sunPct = Math.max(0, Math.min(sunshineHours / 24, 1));
    const rainPct = 1 - sunPct;
    // Weighted melt rate: sun increases by 50%, rain by 100%
    meltRate =
      MELT_RATE * (1 + sunPct * 0.5 + rainPct * (rainMM > 0 ? 1.0 : 0));
    if (rainMM > 0) {
      rainWater = (rainMM / 1000) * this.area; // mm to m³
    }
    const meltDepthMM = calculateSnowMeltDepth(airTempC, meltRate);
    const meltVolume = (meltDepthMM / 1000) * this.area; // mm to m³
    const actualMelt = Math.min(meltVolume, this.currentVolume);
    this.currentVolume -= actualMelt;
    this.height = this.currentVolume / this.area;
    this.meltWaterProduced += actualMelt + rainWater;
    this.currentMeltWaterProduced = actualMelt + rainWater;
    return actualMelt + rainWater;
  }

  get remainingSnow(): number {
    return this.currentVolume;
  }
  get remainingHeight(): number {
    return this.height;
  }
  get totalMeltWater(): number {
    return this.meltWaterProduced;
  }
  get currentMeltWater(): number {
    return this.currentMeltWaterProduced;
  }
  get scaleFactor(): number {
    return this.currentVolume / this.initialVolume;
  }
}
