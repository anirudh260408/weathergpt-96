/**
 * Maps WMO weather codes to appropriate Lucide icon names and styles
 */
export function getWeatherIconName(code: number, isDay: boolean = true): string {
  switch (code) {
    case 0:
      return isDay ? "Sun" : "Moon";
    case 1:
      return isDay ? "SunDim" : "CloudMoon";
    case 2:
      return isDay ? "CloudSun" : "CloudMoon";
    case 3:
      return "Cloud";
    case 45:
    case 48:
      return "CloudFog";
    case 51:
    case 53:
    case 55:
    case 56:
    case 57:
      return "CloudDrizzle";
    case 61:
    case 63:
    case 65:
    case 66:
    case 67:
      return "CloudRain";
    case 71:
    case 73:
    case 75:
    case 77:
      return "CloudSnow";
    case 80:
    case 81:
    case 82:
      return "CloudRainWind";
    case 85:
    case 86:
      return "CloudSnow";
    case 95:
      return "CloudLightning";
    case 96:
    case 99:
      return "Zap";
    default:
      return "SunMedium";
  }
}

export function formatTemp(tempC: number, unit: "C" | "F"): string {
  if (unit === "F") {
    const f = Math.round((tempC * 9) / 5 + 32);
    return `${f}°F`;
  }
  return `${Math.round(tempC)}°C`;
}
