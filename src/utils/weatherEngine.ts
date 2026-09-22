import {
  WeatherData,
  WeatherAlert,
  WeatherStatus,
  WeatherStatusLevel,
  WeatherDelta,
  SafetyRecommendation,
  RetrospectiveSummary,
  RetrospectiveDay,
} from "../types/weather";
import { reverseGeocodeCoordinates, formatLocationName } from "./locationService";

/**
 * Evaluates real weather measurements against meteorological safety rules
 * and returns active rule-based alerts.
 */
export function evaluateWeatherAlerts(data: WeatherData): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const { current, hourly } = data;
  const now = new Date().toISOString();

  // 1. Storm / Severe Thunderstorm / Hail Alert
  if ([95, 96, 99].includes(current.weatherCode)) {
    alerts.push({
      id: "alert-storm",
      type: "storm",
      level: "danger",
      title: "SEVERE WEATHER ALERT",
      message:
        "Severe thunderstorm with lightning and strong convective gusts is detected in your area.",
      action:
        "Seek sturdy indoor shelter immediately. Disconnect sensitive electronics and avoid open fields or trees.",
      triggerValue: `${current.condition} (WMO Code ${current.weatherCode})`,
      timestamp: now,
    });
  }

  // 2. High Rain / Flash Flooding Risk Alert
  if (current.precipitationMm >= 10 || current.weatherCode === 65 || current.weatherCode === 82) {
    alerts.push({
      id: "alert-rain-danger",
      type: "rain",
      level: "danger",
      title: "TORRENTIAL RAIN & WATERLOGGING ALERT",
      message: `Extremely heavy rainfall (${current.precipitationMm} mm/hr) detected. Significant water accumulation and road hazards expected.`,
      action:
        "Delay non-essential travel. Stay away from low-lying underpasses, swollen waterways, and submerged electrical poles.",
      triggerValue: `${current.precipitationMm} mm/hr`,
      timestamp: now,
    });
  } else if (current.rainProbability >= 70 || current.precipitationMm >= 2.5) {
    alerts.push({
      id: "alert-rain-warning",
      type: "rain",
      level: "warning",
      title: "RAIN ALERT",
      message: `High chance of rain (${current.rainProbability}%) detected for your location.`,
      action:
        "Carry an umbrella or raincoat. Allow extra travel time due to slippery roads and potential transit delays.",
      triggerValue: `${current.rainProbability}% probability`,
      timestamp: now,
    });
  } else if (current.rainProbability >= 40) {
    alerts.push({
      id: "alert-rain-caution",
      type: "rain",
      level: "caution",
      title: "SCATTERED SHOWERS POSSIBLE",
      message: `Moderate rain probability (${current.rainProbability}%) over the next hours.`,
      action: "Keep a portable umbrella handy if heading outdoors for extended periods.",
      triggerValue: `${current.rainProbability}% probability`,
      timestamp: now,
    });
  }

  // 3. Extreme Heat & Heat Wave Alert
  if (current.tempC >= 42 || current.feelsLikeC >= 45) {
    alerts.push({
      id: "alert-heat-danger",
      type: "heat",
      level: "danger",
      title: "EXTREME HEAT EMERGENCY ALERT",
      message: `Dangerous heat index (${current.feelsLikeC}°C / ${current.tempC}°C) detected. High risk of heat stroke and severe dehydration.`,
      action:
        "Stay indoors in air-conditioned or ventilated areas. Avoid direct sun from 11 AM - 4 PM. Drink water continuously.",
      triggerValue: `${current.tempC}°C (Feels like ${current.feelsLikeC}°C)`,
      timestamp: now,
    });
  } else if (current.tempC >= 38 || current.feelsLikeC >= 40) {
    alerts.push({
      id: "alert-heat-warning",
      type: "heat",
      level: "warning",
      title: "HEAT WARNING",
      message: `Very high temperature (${current.tempC}°C, feels like ${current.feelsLikeC}°C). Prolonged sun exposure poses heat exhaustion risk.`,
      action:
        "Stay hydrated with electrolytes and water. Wear loose, light-colored clothing and restrict strenuous outdoor exercise.",
      triggerValue: `${current.tempC}°C`,
      timestamp: now,
    });
  } else if (current.tempC >= 34) {
    alerts.push({
      id: "alert-heat-caution",
      type: "heat",
      level: "caution",
      title: "WARM & HUMID CONDITIONS",
      message: `Elevated temperatures (${current.tempC}°C) with humidity at ${current.humidity}%.`,
      action: "Drink water regularly, protect your eyes with sunglasses, and seek shade during midday.",
      triggerValue: `${current.tempC}°C`,
      timestamp: now,
    });
  }

  // 4. Extreme Cold Alert
  if (current.tempC <= 0) {
    alerts.push({
      id: "alert-cold-warning",
      type: "cold",
      level: "warning",
      title: "FREEZING TEMPERATURE ALERT",
      message: `Sub-zero or freezing temperatures (${current.tempC}°C) detected. Surface ice and hypothermia hazard.`,
      action: "Wear heavy thermal layers, cover extremities, and watch for icy footpaths.",
      triggerValue: `${current.tempC}°C`,
      timestamp: now,
    });
  }

  // 5. Strong Wind & Gusts Alert
  const maxGust = Math.max(current.windSpeedKmh, current.windGustsKmh || 0);
  if (maxGust >= 60) {
    alerts.push({
      id: "alert-wind-danger",
      type: "wind",
      level: "danger",
      title: "GALE FORCE WIND DANGER",
      message: `Damaging winds and gusts reaching ${maxGust} km/h recorded. Risk of falling tree branches and airborne debris.`,
      action:
        "Stay away from temporary hoardings, loose roofing, and weak trees. Drive with extreme caution or postpone trips.",
      triggerValue: `${maxGust} km/h gusts`,
      timestamp: now,
    });
  } else if (maxGust >= 38) {
    alerts.push({
      id: "alert-wind-warning",
      type: "wind",
      level: "warning",
      title: "STRONG WIND ALERT",
      message: `Brisk, gusty winds (${maxGust} km/h) detected. Outdoor gear and two-wheeler balance may be affected.`,
      action: "Secure lightweight outdoor furniture and avoid exposed high-rise balconies.",
      triggerValue: `${maxGust} km/h`,
      timestamp: now,
    });
  }

  // 6. UV Index Alert
  if (current.uvIndex >= 11) {
    alerts.push({
      id: "alert-uv-danger",
      type: "uv",
      level: "danger",
      title: "EXTREME UV RADIATION",
      message: `UV Index is at an extreme reading of ${current.uvIndex}. Unprotected skin can burn within 10 minutes.`,
      action: "Avoid outdoor sun exposure between 10 AM and 4 PM. Use SPF 50+, wide-brim hat, and UV-blocking sunglasses.",
      triggerValue: `UV ${current.uvIndex}`,
      timestamp: now,
    });
  } else if (current.uvIndex >= 8) {
    alerts.push({
      id: "alert-uv-warning",
      type: "uv",
      level: "warning",
      title: "VERY HIGH UV ALERT",
      message: `UV Index is ${current.uvIndex}. High risk of eye damage and rapid sunburn.`,
      action: "Generously apply SPF 30+ sunscreen, wear protective clothing, and seek shade.",
      triggerValue: `UV ${current.uvIndex}`,
      timestamp: now,
    });
  }

  // 7. Low Visibility / Dense Fog Alert
  if (current.visibilityKm <= 1.0) {
    alerts.push({
      id: "alert-visibility-warning",
      type: "visibility",
      level: "warning",
      title: "DENSE FOG & REDUCED VISIBILITY",
      message: `Road visibility dropped to ${current.visibilityKm} km due to dense fog or haze.`,
      action: "Use low-beam fog lights, slow down significantly, and maintain double standard vehicle following distance.",
      triggerValue: `${current.visibilityKm} km`,
      timestamp: now,
    });
  }

  return alerts;
}

/**
 * Computes overall condition safety status: NORMAL, CAUTION, WARNING, DANGER
 */
export function calculateWeatherStatus(alerts: WeatherAlert[], data: WeatherData): WeatherStatus {
  const hasDanger = alerts.some((a) => a.level === "danger");
  const hasWarning = alerts.some((a) => a.level === "warning");
  const hasCaution = alerts.some((a) => a.level === "caution");

  if (hasDanger) {
    const dangerAlert = alerts.find((a) => a.level === "danger")!;
    return {
      level: "DANGER",
      title: dangerAlert.title,
      description: dangerAlert.message,
      dominantFactor: dangerAlert.triggerValue,
      color: "text-rose-700",
      bgLight: "bg-rose-50 border-rose-200",
      borderColor: "border-rose-500",
      isDanger: true,
    };
  }

  if (hasWarning) {
    const warnAlert = alerts.find((a) => a.level === "warning")!;
    return {
      level: "WARNING",
      title: warnAlert.title,
      description: warnAlert.message,
      dominantFactor: warnAlert.triggerValue,
      color: "text-amber-700",
      bgLight: "bg-amber-50 border-amber-200",
      borderColor: "border-amber-500",
      isDanger: false,
    };
  }

  if (hasCaution) {
    const cautionAlert = alerts.find((a) => a.level === "caution")!;
    return {
      level: "CAUTION",
      title: cautionAlert.title,
      description: cautionAlert.message,
      dominantFactor: cautionAlert.triggerValue,
      color: "text-yellow-800",
      bgLight: "bg-yellow-50 border-yellow-200",
      borderColor: "border-yellow-400",
      isDanger: false,
    };
  }

  return {
    level: "NORMAL",
    title: "Conditions Favorable",
    description: `Current atmospheric parameters are stable at ${data.current.tempC}°C with ${data.current.condition.toLowerCase()}.`,
    dominantFactor: `${data.current.tempC}°C, ${data.current.condition}`,
    color: "text-emerald-700",
    bgLight: "bg-emerald-50 border-emerald-200",
    borderColor: "border-emerald-500",
    isDanger: false,
  };
}

/**
 * Generates ONE simple, natural contextual weather sentence from actual meteorological data.
 * Examples:
 * - "Looks like a comfortable evening."
 * - "Rain is likely later today."
 * - "It's getting quite hot this afternoon."
 * - "Strong winds are expected tonight."
 */
export function getSingleContextualStatus(data: WeatherData): string {
  const current = data.current;
  const hourly = data.hourly || [];
  const rainProb = current.rainProbability || 0;
  const temp = current.tempC;
  const wind = current.windSpeedKmh || 0;
  const maxGust = Math.max(wind, current.windGustsKmh || 0);

  const now = new Date();
  const currentHour = now.getHours();
  const isNight = currentHour >= 20 || currentHour < 6;
  const isEvening = currentHour >= 17 && currentHour < 20;
  const isAfternoon = currentHour >= 12 && currentHour < 17;
  const isMorning = currentHour >= 6 && currentHour < 12;

  // Check upcoming hourly rain
  const nextFewHours = hourly.slice(1, 6);
  const maxUpcomingRain = nextFewHours.length > 0 ? Math.max(...nextFewHours.map((h) => h.rainProbability || 0)) : rainProb;

  if (current.weatherCode >= 95 || (current.weatherCode >= 80 && current.precipitationMm >= 5)) {
    return "Severe storm conditions detected. Best to stay indoors.";
  }

  if (current.precipitationMm >= 2 || rainProb >= 70) {
    return "Steady rain is falling right now.";
  }

  if (maxUpcomingRain >= 55) {
    if (isEvening || isAfternoon) {
      return "Rain is likely later today.";
    }
    return "Showers are expected over the next few hours.";
  }

  if (maxGust >= 45) {
    return isNight ? "Strong winds are expected tonight." : "Gusty winds are picking up today.";
  }

  if (temp >= 36 || current.feelsLikeC >= 39) {
    return isAfternoon ? "It's getting quite hot this afternoon." : "High temperatures today. Stay hydrated.";
  }

  if (temp <= 12) {
    return "Chilly conditions today. A warm layer will keep you comfortable.";
  }

  if (isEvening) {
    return "Looks like a comfortable evening.";
  }

  if (isMorning) {
    return "Pleasant morning conditions with clear skies ahead.";
  }

  if (isNight) {
    return "Calm and peaceful night weather.";
  }

  return "Conditions are mild and comfortable today.";
}

export interface HumanAlert {
  type: "rain" | "heat" | "danger" | "wind" | "cold";
  icon: string;
  headline: string;
  message: string;
}

/**
 * Returns a human-friendly, high-relevance alert ONLY when meaningful.
 * Normal conditions return null so no intrusive banner is rendered.
 */
export function getHumanAlertSummary(alerts: WeatherAlert[], data: WeatherData): HumanAlert | null {
  const current = data.current;
  const hourly = data.hourly || [];
  const maxGust = Math.max(current.windSpeedKmh || 0, current.windGustsKmh || 0);

  // 1. Severe / Danger alert
  const hasDanger = alerts.some((a) => a.level === "danger") || [95, 96, 99].includes(current.weatherCode);
  if (hasDanger) {
    return {
      type: "danger",
      icon: "🚨",
      headline: "Dangerous weather alert",
      message: "Strong winds and heavy storm activity are detected. I'd stay indoors if possible and follow official local guidance.",
    };
  }

  // 2. High Heat
  if (current.tempC >= 38 || current.feelsLikeC >= 41) {
    return {
      type: "heat",
      icon: "☀️",
      headline: "High heat warning",
      message: "Temperatures are quite high this afternoon. Stay hydrated and avoid prolonged exposure to direct sunlight.",
    };
  }

  // 3. Rain / Showers
  const upcomingRain = hourly.slice(0, 5).some((h) => (h.rainProbability || 0) >= 50);
  if (current.rainProbability >= 50 || current.precipitationMm >= 1 || upcomingRain) {
    return {
      type: "rain",
      icon: "🌧️",
      headline: "Rain expected",
      message: "Rain chances increase this evening. If you're heading out later, I'd keep an umbrella with you.",
    };
  }

  // 4. Strong winds
  if (maxGust >= 45) {
    return {
      type: "wind",
      icon: "💨",
      headline: "Gusty winds",
      message: "Brisk winds detected. Take caution on two-wheelers and secure light outdoor items.",
    };
  }

  return null;
}

/**
 * Detects dynamic changes between consecutive weather fetches.
 */
export function detectWeatherChanges(prev: WeatherData | null, current: WeatherData): WeatherDelta {
  if (!prev) {
    return {
      hasChange: false,
      message: "Baseline weather telemetry established.",
      tempDiff: 0,
      rainProbDiff: 0,
      windDiff: 0,
      details: [],
    };
  }

  const tempDiff = Math.round((current.current.tempC - prev.current.tempC) * 10) / 10;
  const rainProbDiff = current.current.rainProbability - prev.current.rainProbability;
  const windDiff = current.current.windSpeedKmh - prev.current.windSpeedKmh;

  const details: string[] = [];

  if (Math.abs(tempDiff) >= 2.5) {
    details.push(
      `Temperature shifted ${tempDiff > 0 ? "upward" : "downward"} by ${Math.abs(tempDiff)}°C (${prev.current.tempC}°C → ${current.current.tempC}°C)`
    );
  }

  if (Math.abs(rainProbDiff) >= 15) {
    details.push(
      `Rain probability ${rainProbDiff > 0 ? "surged" : "dropped"} by ${Math.abs(rainProbDiff)}% (${prev.current.rainProbability}% → ${current.current.rainProbability}%)`
    );
  }

  if (Math.abs(windDiff) >= 10) {
    details.push(
      `Wind speed ${windDiff > 0 ? "intensified" : "eased"} by ${Math.abs(windDiff)} km/h (${prev.current.windSpeedKmh} → ${current.current.windSpeedKmh} km/h)`
    );
  }

  if (current.current.condition !== prev.current.condition) {
    details.push(`Weather condition transitioned from "${prev.current.condition}" to "${current.current.condition}"`);
  }

  const hasChange = details.length > 0;
  let message = "Weather parameters have remained consistent.";

  if (hasChange) {
    if (rainProbDiff >= 20) {
      message = "Rain probability has increased significantly. Rain may occur within the forecast period. Consider carrying an umbrella.";
    } else if (tempDiff >= 3) {
      message = "Rapid daytime temperature rise detected. Stay hydrated and monitor sun exposure.";
    } else if (windDiff >= 15) {
      message = "Wind speeds have picked up markedly. Take care with outdoor items and two-wheel transit.";
    } else {
      message = `Atmospheric changes detected across recent telemetry readings.`;
    }
  }

  return {
    hasChange,
    message,
    tempDiff,
    rainProbDiff,
    windDiff,
    previousTime: prev.fetchedAt,
    details,
  };
}

/**
 * Generates personalized activity and lifestyle recommendations grounded in real measurements.
 */
export function generateRecommendations(data: WeatherData): SafetyRecommendation[] {
  const { current } = data;
  const recs: SafetyRecommendation[] = [];

  // 1. Dressing & Attire
  if (current.tempC >= 32) {
    recs.push({
      id: "rec-clothing",
      title: "Breathable Lightweight Attire",
      subtitle: `${current.tempC}°C • High Temperature`,
      category: "clothing",
      status: current.tempC >= 38 ? "warning" : "caution",
      icon: "Shirt",
      advice: "Wear loose-fitting, light-colored cotton or moisture-wicking fabrics to stay cool and ventilate heat.",
    });
  } else if (current.tempC <= 14) {
    recs.push({
      id: "rec-clothing",
      title: "Layered Thermal Attire",
      subtitle: `${current.tempC}°C • Cool Weather`,
      category: "clothing",
      status: current.tempC <= 5 ? "warning" : "good",
      icon: "Shirt",
      advice: "Wear warm layers, a windproof outer jacket, and keep a light scarf or sweater handy.",
    });
  } else {
    recs.push({
      id: "rec-clothing",
      title: "Comfortable Casual Attire",
      subtitle: `${current.tempC}°C • Moderate Climate`,
      category: "clothing",
      status: "good",
      icon: "Shirt",
      advice: "Standard comfortable clothing is ideal for current temperatures.",
    });
  }

  // 2. Commute & Travel Safety
  if (current.rainProbability >= 60 || current.precipitationMm > 0) {
    recs.push({
      id: "rec-travel",
      title: "Rain & Slick Road Precaution",
      subtitle: `${current.rainProbability}% Rain • ${current.visibilityKm}km Visibility`,
      category: "travel",
      status: current.rainProbability >= 75 ? "warning" : "caution",
      icon: "Car",
      advice: "Road surfaces may be slick. Allow an extra 15-20 minutes buffer for travel, reduce vehicular speed, and pack rain gear.",
    });
  } else if (current.windSpeedKmh >= 35) {
    recs.push({
      id: "rec-travel",
      title: "Crosswind Travel Vigilance",
      subtitle: `${current.windSpeedKmh} km/h Winds`,
      category: "travel",
      status: "caution",
      icon: "Car",
      advice: "Strong crosswinds on flyovers and highways can destabilize two-wheelers and high-profile vehicles.",
    });
  } else {
    recs.push({
      id: "rec-travel",
      title: "Smooth Travel Conditions",
      subtitle: `${current.visibilityKm}km Visibility • Dry Roads`,
      category: "travel",
      status: "good",
      icon: "Car",
      advice: "Weather conditions are well-suited for general commuting and travel.",
    });
  }

  // 3. Outdoor Sports & Cricket / Exercise
  if ([95, 96, 99].includes(current.weatherCode)) {
    recs.push({
      id: "rec-sports",
      title: "Outdoor Sports Unsafe (Lightning)",
      subtitle: "Active Thunderstorm Threat",
      category: "sports",
      status: "danger",
      icon: "Activity",
      advice: "Do not play cricket, football, or stay on open grounds. Lightning hazard is severe. Move indoors immediately.",
    });
  } else if (current.rainProbability >= 50 || current.precipitationMm > 1) {
    recs.push({
      id: "rec-sports",
      title: "Wet Pitch / Delayed Play",
      subtitle: `${current.rainProbability}% Rain Likelihood`,
      category: "sports",
      status: "caution",
      icon: "Activity",
      advice: "Turf and pitches will be damp or waterlogged. High slip hazard for running or fast bowling. Consider indoor drills.",
    });
  } else if (current.tempC >= 37) {
    recs.push({
      id: "rec-sports",
      title: "Postpone Midday Sports",
      subtitle: `Feels like ${current.feelsLikeC}°C`,
      category: "sports",
      status: "warning",
      icon: "Activity",
      advice: "Reschedule intense cricket matches or running to early morning (before 9 AM) or dusk to prevent heat exhaustion.",
    });
  } else {
    recs.push({
      id: "rec-sports",
      title: "Excellent for Cricket & Sports",
      subtitle: `${current.tempC}°C • Moderate Breeze`,
      category: "sports",
      status: "good",
      icon: "Activity",
      advice: "Ground and atmospheric conditions are favorable for outdoor sports, walking, or cricket matches.",
    });
  }

  // 4. Hydration & UV Protection
  if (current.uvIndex >= 6 || current.tempC >= 33) {
    recs.push({
      id: "rec-uv",
      title: `Active Sun Protection (UV ${current.uvIndex})`,
      subtitle: "High Solar Radiation",
      category: "uv",
      status: current.uvIndex >= 8 ? "warning" : "caution",
      icon: "Sun",
      advice: `UV index is elevated at ${current.uvIndex}. Apply broad-spectrum SPF 30+, wear sunglasses, and drink at least 2.5–3 liters of water.`,
    });
  } else {
    recs.push({
      id: "rec-uv",
      title: `Low UV Radiation (UV ${current.uvIndex})`,
      subtitle: "Minimal Solar Hazard",
      category: "uv",
      status: "good",
      icon: "Sun",
      advice: "Standard outdoor exposure is safe without intensive sunblock.",
    });
  }

  return recs;
}

/**
 * Interpret WMO code on client side for fallback or direct fetch
 */
export function interpretWmoCodeClient(code: number): { condition: string; description: string; category: "clear" | "cloudy" | "drizzle" | "rain" | "snow" | "thunderstorm" | "fog" | "ice" } {
  switch (code) {
    case 0:
      return { condition: "Clear Sky", description: "Mainly clear and sunny skies", category: "clear" };
    case 1:
      return { condition: "Mainly Clear", description: "Mostly clear with scattered light clouds", category: "clear" };
    case 2:
      return { condition: "Partly Cloudy", description: "Scattered clouds with periodic sunshine", category: "cloudy" };
    case 3:
      return { condition: "Overcast", description: "Dense cloud cover with reduced sunlight", category: "cloudy" };
    case 45:
    case 48:
      return { condition: "Foggy", description: "Fog or depositing rime fog with reduced visibility", category: "fog" };
    case 51:
      return { condition: "Light Drizzle", description: "Light, fine drizzle", category: "drizzle" };
    case 53:
      return { condition: "Moderate Drizzle", description: "Steady moderate drizzle", category: "drizzle" };
    case 55:
      return { condition: "Dense Drizzle", description: "Heavy soaking drizzle", category: "drizzle" };
    case 56:
    case 57:
      return { condition: "Freezing Drizzle", description: "Freezing drizzle causing slick surfaces", category: "ice" };
    case 61:
      return { condition: "Slight Rain", description: "Intermittent light rainfall", category: "rain" };
    case 63:
      return { condition: "Moderate Rain", description: "Continuous moderate rainfall", category: "rain" };
    case 65:
      return { condition: "Heavy Rain", description: "Heavy downpours with water pooling risk", category: "rain" };
    case 66:
    case 67:
      return { condition: "Freezing Rain", description: "Dangerous freezing rain on surfaces", category: "ice" };
    case 71:
      return { condition: "Slight Snow", description: "Light snowfall", category: "snow" };
    case 73:
      return { condition: "Moderate Snow", description: "Steady snowfall", category: "snow" };
    case 75:
      return { condition: "Heavy Snow", description: "Heavy snowfall and low visibility", category: "snow" };
    case 77:
      return { condition: "Snow Grains", description: "Scattered ice crystals and snow grains", category: "snow" };
    case 80:
      return { condition: "Light Showers", description: "Passing brief rain showers", category: "rain" };
    case 81:
      return { condition: "Moderate Showers", description: "Brisk rain showers", category: "rain" };
    case 82:
      return { condition: "Violent Showers", description: "Torrential downpours and rain bursts", category: "rain" };
    case 85:
    case 86:
      return { condition: "Snow Showers", description: "Passing snow showers", category: "snow" };
    case 95:
      return { condition: "Thunderstorm", description: "Thunderstorm with lightning and gusty winds", category: "thunderstorm" };
    case 96:
    case 99:
      return { condition: "Severe Thunderstorm", description: "Severe thunderstorm with hail and dangerous lightning", category: "thunderstorm" };
    default:
      return { condition: "Variable Weather", description: "Mixed atmospheric conditions", category: "cloudy" };
  }
}

/**
 * Parses raw Open-Meteo payload into structured WeatherData
 */
export function parseRawOpenMeteoPayload(
  wData: any,
  location: { name: string; region?: string; country?: string; latitude: number; longitude: number; timezone?: string }
): WeatherData {
  const current = wData.current || {};
  const hourly = wData.hourly || {};
  const daily = wData.daily || {};

  const wmo = interpretWmoCodeClient(current.weather_code ?? 0);

  const nowIso = current.time || new Date().toISOString();
  let currentHourIndex = 0;
  if (hourly.time && Array.isArray(hourly.time)) {
    const idx = hourly.time.findIndex((t: string) => t >= nowIso.slice(0, 13));
    currentHourIndex = idx >= 0 ? idx : 0;
  }

  const currentUv = hourly.uv_index ? hourly.uv_index[currentHourIndex] ?? 0 : 0;
  const currentRainProb = hourly.precipitation_probability ? hourly.precipitation_probability[currentHourIndex] ?? 0 : 0;
  const currentVisibility = hourly.visibility ? Math.round((hourly.visibility[currentHourIndex] || 10000) / 1000) : 10;

  const tempC = Math.round((current.temperature_2m ?? 0) * 10) / 10;
  const tempF = Math.round(((tempC * 9) / 5 + 32) * 10) / 10;
  const feelsLikeC = Math.round((current.apparent_temperature ?? tempC) * 10) / 10;
  const feelsLikeF = Math.round(((feelsLikeC * 9) / 5 + 32) * 10) / 10;

  const hourlyForecast = [];
  const hourlyTimes = hourly.time || [];
  const maxHours = Math.min(24, hourlyTimes.length - currentHourIndex);
  for (let i = 0; i < maxHours; i++) {
    const idx = currentHourIndex + i;
    const hTime = hourlyTimes[idx];
    const hTempC = Math.round(hourly.temperature_2m[idx] ?? tempC);
    const hWmo = interpretWmoCodeClient(hourly.weather_code ? hourly.weather_code[idx] : 0);
    const hRainProb = hourly.precipitation_probability ? hourly.precipitation_probability[idx] ?? 0 : 0;
    const hWind = Math.round(hourly.wind_speed_10m ? hourly.wind_speed_10m[idx] ?? 0 : 0);
    const hUv = Math.round((hourly.uv_index ? hourly.uv_index[idx] : 0) * 10) / 10;

    hourlyForecast.push({
      time: hTime,
      hour: new Date(hTime).toLocaleTimeString("en-US", { hour: "numeric", hour12: true }),
      tempC: hTempC,
      tempF: Math.round((hTempC * 9) / 5 + 32),
      weatherCode: hourly.weather_code ? hourly.weather_code[idx] : 0,
      condition: hWmo.condition,
      category: hWmo.category,
      rainProbability: hRainProb,
      precipitationMm: hourly.precipitation ? hourly.precipitation[idx] : 0,
      windSpeedKmh: hWind,
      uvIndex: hUv,
    });
  }

  const dailyForecast = [];
  const dailyTimes = daily.time || [];
  for (let i = 0; i < dailyTimes.length; i++) {
    const dTime = dailyTimes[i];
    const dWmo = interpretWmoCodeClient(daily.weather_code ? daily.weather_code[i] : 0);
    const maxC = Math.round(daily.temperature_2m_max ? daily.temperature_2m_max[i] : tempC + 4);
    const minC = Math.round(daily.temperature_2m_min ? daily.temperature_2m_min[i] : tempC - 4);
    const dRainProb = daily.precipitation_probability_max ? daily.precipitation_probability_max[i] ?? 0 : 0;
    const dWind = Math.round(daily.wind_speed_10m_max ? daily.wind_speed_10m_max[i] : 15);
    const dUv = Math.round((daily.uv_index_max ? daily.uv_index_max[i] : 5) * 10) / 10;

    const dateObj = new Date(dTime);
    const dayName = i === 0 ? "Today" : i === 1 ? "Tomorrow" : dateObj.toLocaleDateString("en-US", { weekday: "short" });

    dailyForecast.push({
      date: dTime,
      dayName,
      dateFormatted: dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      maxTempC: maxC,
      maxTempF: Math.round((maxC * 9) / 5 + 32),
      minTempC: minC,
      minTempF: Math.round((minC * 9) / 5 + 32),
      weatherCode: daily.weather_code ? daily.weather_code[i] : 0,
      condition: dWmo.condition,
      category: dWmo.category,
      rainProbability: dRainProb,
      precipitationMm: daily.precipitation_sum ? daily.precipitation_sum[i] : 0,
      windSpeedKmh: dWind,
      uvIndex: dUv,
      sunrise: daily.sunrise && daily.sunrise[i] ? daily.sunrise[i] : "",
      sunset: daily.sunset && daily.sunset[i] ? daily.sunset[i] : "",
    });
  }

  return {
    location: {
      name: location.name || "Your Location",
      region: location.region || "",
      country: location.country || "",
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: wData.timezone || location.timezone || "auto",
    },
    current: {
      tempC,
      tempF,
      feelsLikeC,
      feelsLikeF,
      weatherCode: current.weather_code ?? 0,
      condition: wmo.condition,
      description: wmo.description,
      category: wmo.category,
      humidity: current.relative_humidity_2m ?? 65,
      windSpeedKmh: Math.round(current.wind_speed_10m ?? 12),
      windDirectionDeg: current.wind_direction_10m ?? 180,
      windGustsKmh: Math.round(current.wind_gusts_10m ?? 18),
      rainProbability: currentRainProb,
      precipitationMm: current.precipitation ?? 0,
      cloudCoverPct: current.cloud_cover ?? 20,
      visibilityKm: currentVisibility,
      uvIndex: Math.round(currentUv * 10) / 10,
      pressureHpa: Math.round(current.pressure_msl || current.surface_pressure || 1013),
      isDay: current.is_day !== undefined ? current.is_day === 1 : true,
      time: current.time || new Date().toISOString(),
      sunrise: daily.sunrise && daily.sunrise[0] ? daily.sunrise[0] : "",
      sunset: daily.sunset && daily.sunset[0] ? daily.sunset[0] : "",
    },
    hourly: hourlyForecast,
    daily: dailyForecast,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Creates high-quality fallback baseline weather data for when network is unavailable
 */
export function generateFallbackWeatherData(
  location: { name: string; region?: string; country?: string; latitude: number; longitude: number }
): WeatherData {
  const now = new Date();
  const tempC = 29;
  const tempF = 84;
  const feelsLikeC = 32;
  const feelsLikeF = 90;

  const hourlyForecast = [];
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getTime() + i * 3600000);
    const hourTemp = Math.round(tempC + Math.sin((i / 24) * Math.PI * 2) * 4);
    hourlyForecast.push({
      time: d.toISOString(),
      hour: d.toLocaleTimeString("en-US", { hour: "numeric", hour12: true }),
      tempC: hourTemp,
      tempF: Math.round((hourTemp * 9) / 5 + 32),
      weatherCode: 2,
      condition: "Partly Cloudy",
      category: "cloudy",
      rainProbability: 15,
      precipitationMm: 0,
      windSpeedKmh: 14,
      uvIndex: i >= 4 && i <= 10 ? 6.2 : 0.5,
    });
  }

  const dailyForecast = [];
  const days = ["Today", "Tomorrow", "Wed", "Thu", "Fri", "Sat", "Sun"];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getTime() + i * 86400000);
    dailyForecast.push({
      date: d.toISOString().slice(0, 10),
      dayName: days[i] || d.toLocaleDateString("en-US", { weekday: "short" }),
      dateFormatted: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      maxTempC: 33,
      maxTempF: 91,
      minTempC: 24,
      minTempF: 75,
      weatherCode: 2,
      condition: "Partly Cloudy",
      category: "cloudy",
      rainProbability: 20,
      precipitationMm: 0,
      windSpeedKmh: 16,
      uvIndex: 7.5,
      sunrise: "06:05 AM",
      sunset: "06:22 PM",
    });
  }

  return {
    location: {
      name: location.name || "Your Location",
      region: location.region || "",
      country: location.country || "",
      latitude: location.latitude || 0,
      longitude: location.longitude || 0,
      timezone: "auto",
    },
    current: {
      tempC,
      tempF,
      feelsLikeC,
      feelsLikeF,
      weatherCode: 2,
      condition: "Partly Cloudy",
      description: "Scattered clouds with periodic sunshine",
      category: "cloudy",
      humidity: 68,
      windSpeedKmh: 14,
      windDirectionDeg: 160,
      windGustsKmh: 20,
      rainProbability: 15,
      precipitationMm: 0,
      cloudCoverPct: 35,
      visibilityKm: 10,
      uvIndex: 6.8,
      pressureHpa: 1012,
      isDay: true,
      time: now.toISOString(),
      sunrise: "06:05 AM",
      sunset: "06:22 PM",
    },
    hourly: hourlyForecast,
    daily: dailyForecast,
    fetchedAt: now.toISOString(),
  };
}

/**
 * Resilient weather loader:
 * 1. Tries internal backend `/api/weather`
 * 2. If it fails, calls Open-Meteo directly from browser
 * 3. If that fails (offline), produces realistic fallback data so the app remains 100% functional!
 */
export async function fetchWeatherWithResilience(params: {
  lat?: number;
  lon?: number;
  city?: string;
  name?: string;
  region?: string;
  country?: string;
}): Promise<{ data: WeatherData; source: "server" | "direct_api" | "offline_fallback"; warning?: string }> {
  let lat = params.lat;
  let lon = params.lon;
  let locationName = params.name || params.city || "";
  let regionName = params.region || "";
  let countryName = params.country || "";

  // If we have GPS coordinates but no valid city/name, do a reverse geocode
  if (lat !== undefined && lon !== undefined && (!locationName || locationName.includes("°") || /^-?\d+(\.\d+)?,/.test(locationName))) {
    try {
      const rev = await reverseGeocodeCoordinates(lat, lon);
      locationName = rev.name;
      if (!regionName) regionName = rev.region;
      if (!countryName) countryName = rev.country;
    } catch {
      // ignore
    }
  }

  // 1. Try internal backend API first
  try {
    let url = "/api/weather?";
    if (params.city) {
      url += `city=${encodeURIComponent(params.city)}`;
    } else if (lat !== undefined && lon !== undefined) {
      url += `lat=${lat}&lon=${lon}`;
      if (locationName) url += `&name=${encodeURIComponent(locationName)}`;
      if (regionName) url += `&region=${encodeURIComponent(regionName)}`;
      if (countryName) url += `&country=${encodeURIComponent(countryName)}`;
    } else {
      throw new Error("No location provided to fetch weather");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data: WeatherData = await res.json();
      return { data, source: "server" };
    }
  } catch (err) {
    console.warn("Internal /api/weather endpoint failed, trying direct Open-Meteo API fallback...", err);
  }

  // 2. Direct client-side fetch from Open-Meteo
  try {
    if (params.city && (lat === undefined || lon === undefined)) {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        params.city.trim()
      )}&count=1&language=en&format=json`;
      const geoRes = await fetch(geoUrl, { signal: AbortSignal.timeout(5000) });
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData.results && geoData.results.length > 0) {
          const top = geoData.results[0];
          lat = top.latitude;
          lon = top.longitude;
          locationName = top.name;
          regionName = top.admin1 || "";
          countryName = top.country || "";
        }
      }
    }

    if (lat === undefined || lon === undefined) {
      throw new Error("No coordinates available to query weather");
    }

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,surface_pressure,wind_speed_10m,uv_index,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=7`;

    const weatherRes = await fetch(weatherUrl, { signal: AbortSignal.timeout(6000) });
    if (weatherRes.ok) {
      const wData = await weatherRes.json();
      const parsed = parseRawOpenMeteoPayload(wData, {
        name: locationName || "Your Location",
        region: regionName,
        country: countryName,
        latitude: lat,
        longitude: lon,
      });
      return { data: parsed, source: "direct_api" };
    }
  } catch (directErr) {
    console.warn("Direct Open-Meteo fetch error, generating baseline fallback...", directErr);
  }

  // 3. Fallback baseline if network is totally offline
  const fallback = generateFallbackWeatherData({
    name: locationName || "Your Location",
    region: regionName || "",
    country: countryName || "",
    latitude: lat || 0,
    longitude: lon || 0,
  });

  return {
    data: fallback,
    source: "offline_fallback",
    warning: "Using local meteorological baseline (network temporarily offline).",
  };
}

/**
 * Generates high-quality fallback 7-day retrospective data
 */
export function generateFallbackRetrospectiveData(location: {
  name: string;
  region?: string;
  country?: string;
  latitude: number;
  longitude: number;
}): RetrospectiveSummary {
  const now = new Date();
  const days: RetrospectiveDay[] = [];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  let totalMaxC = 0;
  let totalMinC = 0;
  let highestMaxC = -999;
  let highestDayName = "";
  let lowestMinC = 999;
  let lowestDayName = "";
  let totalPrecipMm = 0;
  let rainyDaysCount = 0;

  for (let i = 7; i >= 1; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dayName = dayNames[d.getDay()];
    const dateFormatted = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const maxC = 30 + Math.round(Math.sin((7 - i) * 0.9) * 3);
    const minC = 22 + Math.round(Math.cos((7 - i) * 0.9) * 2);
    const avgC = Math.round(((maxC + minC) / 2) * 10) / 10;
    const precipMm = i === 3 ? 5.4 : i === 6 ? 1.2 : 0;
    const rainProb = i === 3 ? 65 : i === 6 ? 35 : 10;
    const wCode = i === 3 ? 61 : i === 6 ? 80 : 1;
    const wmo = interpretWmoCodeClient(wCode);

    totalMaxC += maxC;
    totalMinC += minC;
    totalPrecipMm += precipMm;
    if (precipMm > 0.5 || rainProb > 40) rainyDaysCount++;

    if (maxC > highestMaxC) {
      highestMaxC = maxC;
      highestDayName = `${dayName} (${dateFormatted})`;
    }
    if (minC < lowestMinC) {
      lowestMinC = minC;
      lowestDayName = `${dayName} (${dateFormatted})`;
    }

    days.push({
      date: d.toISOString().slice(0, 10),
      dayName,
      dateFormatted,
      maxTempC: maxC,
      maxTempF: Math.round((maxC * 9) / 5 + 32),
      minTempC: minC,
      minTempF: Math.round((minC * 9) / 5 + 32),
      avgTempC: avgC,
      avgTempF: Math.round(((avgC * 9) / 5 + 32) * 10) / 10,
      weatherCode: wCode,
      condition: wmo.condition,
      description: wmo.description,
      category: wmo.category,
      precipitationMm: precipMm,
      precipitationProbMax: rainProb,
      windSpeedKmh: 14,
      humidityAvgPct: 65,
    });
  }

  const count = days.length || 1;
  const averageMaxTempC = Math.round((totalMaxC / count) * 10) / 10;
  const averageMinTempC = Math.round((totalMinC / count) * 10) / 10;
  const averageTempC = Math.round(((averageMaxTempC + averageMinTempC) / 2) * 10) / 10;
  const averageTempF = Math.round(((averageTempC * 9) / 5 + 32) * 10) / 10;

  const firstAvg = (days[0].avgTempC + days[1].avgTempC) / 2;
  const lastAvg = (days[days.length - 1].avgTempC + days[days.length - 2].avgTempC) / 2;
  const tempChangeDeltaC = Math.round((lastAvg - firstAvg) * 10) / 10;

  let tempTrend: "warming" | "cooling" | "stable" | "fluctuating" = "stable";
  if (tempChangeDeltaC >= 1.5) tempTrend = "warming";
  else if (tempChangeDeltaC <= -1.5) tempTrend = "cooling";
  else {
    const variance = highestMaxC - lowestMinC;
    if (variance >= 8) tempTrend = "fluctuating";
    else tempTrend = "stable";
  }

  return {
    location: {
      name: location.name || "Your Location",
      region: location.region || "",
      country: location.country || "",
      latitude: location.latitude || 0,
      longitude: location.longitude || 0,
    },
    days,
    stats: {
      highestMaxTempC: highestMaxC,
      highestMaxTempF: Math.round((highestMaxC * 9) / 5 + 32),
      highestDayName,
      lowestMinTempC: lowestMinC,
      lowestMinTempF: Math.round((lowestMinC * 9) / 5 + 32),
      lowestDayName,
      averageTempC,
      averageTempF,
      averageMaxTempC,
      averageMinTempC,
      totalPrecipitationMm: Math.round(totalPrecipMm * 10) / 10,
      rainyDaysCount,
      tempTrend,
      tempChangeDeltaC,
      todayVsAverageDiffC: 1.2,
      trendDescription: `Temperatures averaged ${averageTempC}°C over the past 7 days with ${rainyDaysCount} rainy day(s) recorded.`,
    },
    generatedAt: now.toISOString(),
    isGpsLocation: true,
  };
}

/**
 * Resilient 7-Day Retrospective Weather Loader:
 * 1. Tries /api/weather/retrospective
 * 2. If it fails, calls Open-Meteo direct API with past_days=7
 * 3. If offline, generates baseline retrospective data
 */
export async function fetchRetrospectiveWeather(params: {
  lat?: number;
  lon?: number;
  city?: string;
  name?: string;
}): Promise<{ data: RetrospectiveSummary; source: "server" | "direct_api" | "offline_fallback" }> {
  let lat = params.lat;
  let lon = params.lon;
  let locationName = params.name || params.city || "";

  // 1. Try server endpoint
  try {
    let url = "/api/weather/retrospective?";
    if (params.city) {
      url += `city=${encodeURIComponent(params.city)}`;
    } else if (params.lat !== undefined && params.lon !== undefined) {
      url += `lat=${params.lat}&lon=${params.lon}`;
      if (params.name) url += `&name=${encodeURIComponent(params.name)}`;
    } else {
      throw new Error("No location provided for retrospective weather");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data: RetrospectiveSummary = await res.json();
      return { data, source: "server" };
    }
  } catch (err) {
    console.warn("Internal /api/weather/retrospective failed, trying direct Open-Meteo fallback...", err);
  }

  // 2. Direct Open-Meteo fetch
  try {
    if (params.city && (lat === undefined || lon === undefined)) {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        params.city.trim()
      )}&count=1&language=en&format=json`;
      const geoRes = await fetch(geoUrl, { signal: AbortSignal.timeout(5000) });
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData.results && geoData.results.length > 0) {
          const top = geoData.results[0];
          lat = top.latitude;
          lon = top.longitude;
          locationName = top.name;
        }
      }
    }

    if (lat === undefined || lon === undefined) {
      throw new Error("Unable to resolve coordinates for retrospective weather");
    }

    const retroUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&past_days=7&forecast_days=1&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto`;

    const retroRes = await fetch(retroUrl, { signal: AbortSignal.timeout(6000) });
    if (retroRes.ok) {
      const rData = await retroRes.json();
      const daily = rData.daily || {};
      const times: string[] = daily.time || [];
      const retroCount = Math.min(7, times.length > 1 ? times.length - 1 : times.length);
      const days: RetrospectiveDay[] = [];

      let totalMaxC = 0;
      let totalMinC = 0;
      let highestMaxC = -999;
      let highestDayName = "";
      let lowestMinC = 999;
      let lowestDayName = "";
      let totalPrecipMm = 0;
      let rainyDaysCount = 0;

      for (let i = 0; i < retroCount; i++) {
        const dTime = times[i];
        const dateObj = new Date(dTime);
        const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
        const dateFormatted = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });

        const wCode = daily.weather_code ? daily.weather_code[i] : 0;
        const wmo = interpretWmoCodeClient(wCode);

        const maxC = Math.round(daily.temperature_2m_max ? daily.temperature_2m_max[i] : 30);
        const maxF = Math.round((maxC * 9) / 5 + 32);
        const minC = Math.round(daily.temperature_2m_min ? daily.temperature_2m_min[i] : 22);
        const minF = Math.round((minC * 9) / 5 + 32);
        const avgC = Math.round(((maxC + minC) / 2) * 10) / 10;
        const avgF = Math.round(((avgC * 9) / 5 + 32) * 10) / 10;

        const precipMm = daily.precipitation_sum ? Math.round((daily.precipitation_sum[i] || 0) * 10) / 10 : 0;
        const rainProb = daily.precipitation_probability_max ? daily.precipitation_probability_max[i] || 0 : 0;
        const windSpeed = daily.wind_speed_10m_max ? Math.round(daily.wind_speed_10m_max[i] || 10) : 12;

        totalMaxC += maxC;
        totalMinC += minC;
        totalPrecipMm += precipMm;
        if (precipMm > 0.5 || rainProb > 40) rainyDaysCount++;

        if (maxC > highestMaxC) {
          highestMaxC = maxC;
          highestDayName = `${dayName} (${dateFormatted})`;
        }
        if (minC < lowestMinC) {
          lowestMinC = minC;
          lowestDayName = `${dayName} (${dateFormatted})`;
        }

        days.push({
          date: dTime,
          dayName,
          dateFormatted,
          maxTempC: maxC,
          maxTempF: maxF,
          minTempC: minC,
          minTempF: minF,
          avgTempC: avgC,
          avgTempF: avgF,
          weatherCode: wCode,
          condition: wmo.condition,
          description: wmo.description,
          category: wmo.category,
          precipitationMm: precipMm,
          precipitationProbMax: rainProb,
          windSpeedKmh: windSpeed,
          humidityAvgPct: 65,
        });
      }

      const count = days.length || 1;
      const averageMaxTempC = Math.round((totalMaxC / count) * 10) / 10;
      const averageMinTempC = Math.round((totalMinC / count) * 10) / 10;
      const averageTempC = Math.round(((averageMaxTempC + averageMinTempC) / 2) * 10) / 10;
      const averageTempF = Math.round(((averageTempC * 9) / 5 + 32) * 10) / 10;

      let tempTrend: "warming" | "cooling" | "stable" | "fluctuating" = "stable";
      let tempChangeDeltaC = 0;
      if (days.length >= 4) {
        const firstAvg = (days[0].avgTempC + days[1].avgTempC) / 2;
        const lastAvg = (days[days.length - 1].avgTempC + days[days.length - 2].avgTempC) / 2;
        tempChangeDeltaC = Math.round((lastAvg - firstAvg) * 10) / 10;
        if (tempChangeDeltaC >= 1.5) tempTrend = "warming";
        else if (tempChangeDeltaC <= -1.5) tempTrend = "cooling";
        else {
          const variance = Math.max(...days.map(d => d.maxTempC)) - Math.min(...days.map(d => d.maxTempC));
          if (variance >= 6) tempTrend = "fluctuating";
          else tempTrend = "stable";
        }
      }

      return {
        data: {
          location: {
            name: locationName || "Your Location",
            latitude: lat,
            longitude: lon,
            timezone: rData.timezone || "auto",
          },
          days,
          stats: {
            highestMaxTempC: highestMaxC,
            highestMaxTempF: Math.round((highestMaxC * 9) / 5 + 32),
            highestDayName,
            lowestMinTempC: lowestMinC,
            lowestMinTempF: Math.round((lowestMinC * 9) / 5 + 32),
            lowestDayName,
            averageTempC,
            averageTempF,
            averageMaxTempC,
            averageMinTempC,
            totalPrecipitationMm: Math.round(totalPrecipMm * 10) / 10,
            rainyDaysCount,
            tempTrend,
            tempChangeDeltaC,
            todayVsAverageDiffC: 1.0,
            trendDescription: `Observed temperatures over the past 7 days averaged ${averageTempC}°C, reaching a high of ${highestMaxC}°C.`,
          },
          generatedAt: new Date().toISOString(),
          isGpsLocation: true,
        },
        source: "direct_api",
      };
    }
  } catch (directErr) {
    console.warn("Direct Open-Meteo retrospective fetch error, returning fallback...", directErr);
  }

  // 3. Fallback
  const fallback = generateFallbackRetrospectiveData({
    name: locationName || "Your Location",
    latitude: lat || 0,
    longitude: lon || 0,
  });

  return {
    data: fallback,
    source: "offline_fallback",
  };
}
