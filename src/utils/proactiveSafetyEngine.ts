import {
  WeatherData,
  ProactiveSafetyRisk,
  NotificationSettings,
  ProactiveNotificationLogItem,
  ProactiveRiskLevel,
  ProactiveRiskType,
} from "../types/weather";

const STORAGE_KEY_SETTINGS = "weathergpt_notification_settings_v1";
const STORAGE_KEY_LOGS = "weathergpt_proactive_notifications_log_v1";
const STORAGE_KEY_COOLDOWN = "weathergpt_alert_cooldown_map_v1";
const COOLDOWN_PERIOD_MS = 45 * 60 * 1000; // 45 minutes

/**
 * Returns default notification settings
 */
export function getDefaultNotificationSettings(): NotificationSettings {
  let browserPermission: NotificationPermission = "default";
  if (typeof window !== "undefined" && "Notification" in window) {
    browserPermission = Notification.permission;
  }

  return {
    enabled: true,
    locationAlerts: true,
    dangerAlerts: true,
    rainAlerts: true,
    heatAlerts: true,
    windAlerts: true,
    sound: true,
    browserPermission,
  };
}

/**
 * Loads notification settings from localStorage
 */
export function getSavedNotificationSettings(): NotificationSettings {
  if (typeof window === "undefined") return getDefaultNotificationSettings();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    const defaults = getDefaultNotificationSettings();
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...defaults,
        ...parsed,
        browserPermission: "Notification" in window ? Notification.permission : "default",
      };
    }
  } catch (err) {
    console.warn("Failed to load notification settings:", err);
  }
  return getDefaultNotificationSettings();
}

/**
 * Persists notification settings to localStorage
 */
export function saveNotificationSettings(settings: NotificationSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.warn("Failed to save notification settings:", err);
  }
}

/**
 * Analyzes live meteorological measurements to detect meaningful, genuine weather risks.
 * Never invents conditions; uses actual API measurements & short-term forecast only.
 */
export function analyzeWeatherRisk(
  weatherData: WeatherData,
  isGpsLocation: boolean = false
): ProactiveSafetyRisk | null {
  if (!weatherData || !weatherData.current) return null;

  const { current, hourly, location } = weatherData;
  const now = new Date().toISOString();
  const locationLabel = location.name || "your area";

  const tempC = current.tempC;
  const feelsLikeC = current.feelsLikeC;
  const rainProb = current.rainProbability;
  const precipMm = current.precipitationMm;
  const code = current.weatherCode;
  const windKmh = current.windSpeedKmh;
  const gustKmh = current.windGustsKmh || windKmh;
  const maxWind = Math.max(windKmh, gustKmh);
  const uvIndex = current.uvIndex;
  const visibilityKm = current.visibilityKm;

  // Check upcoming short-term forecast (next 3-4 hours)
  const next3Hours = (hourly || []).slice(1, 4);
  const maxUpcomingRainProb = next3Hours.length > 0 ? Math.max(...next3Hours.map((h) => h.rainProbability || 0)) : rainProb;
  const maxUpcomingPrecip = next3Hours.length > 0 ? Math.max(...next3Hours.map((h) => h.precipitationMm || 0)) : precipMm;
  const hasUpcomingStormCode = next3Hours.some((h) => [95, 96, 99].includes(h.weatherCode));

  // 1. SEVERE THUNDERSTORM / HAIL / CRITICAL STORM
  if ([96, 99].includes(code) || (code === 95 && maxWind >= 60)) {
    return {
      id: `risk-crit-storm-${Date.now()}`,
      type: "severe",
      level: "critical",
      title: "🚨 Severe Weather Alert",
      whatIsHappening: `Severe thunderstorm with hail and high wind gusts (${maxWind} km/h) active near ${locationLabel}.`,
      howItAffects: "Lightning strikes, falling tree limbs, flying debris, and flash water accumulation pose high outdoor hazard.",
      whatToDo: "Stay indoors in a substantial structure, stay away from glass windows, and follow official disaster directives.",
      needsShelterPlaces: true,
      triggerValue: `WMO Code ${code}, ${maxWind} km/h gusts`,
      timestamp: now,
      locationName: location.name,
    };
  }

  // 2. THUNDERSTORM (WMO 95 or upcoming thunderstorm)
  if (code === 95 || hasUpcomingStormCode) {
    return {
      id: `risk-storm-${Date.now()}`,
      type: "thunderstorm",
      level: "danger",
      title: "⛈️ Thunderstorm nearby",
      whatIsHappening: `A thunderstorm is active or approaching ${locationLabel}.`,
      howItAffects: "Lightning makes open outdoor areas, parks, rooftops, and sports grounds unsafe.",
      whatToDo: "Move indoors to a safe enclosed space and avoid standing under tall or isolated trees.",
      needsShelterPlaces: true,
      triggerValue: `Thunderstorm (${current.condition})`,
      timestamp: now,
      locationName: location.name,
    };
  }

  // 3. HEAVY RAINFALL / FLASH WATERLOGGING (WMO 65, 82 or precip >= 4mm/hr or rainProb >= 85%)
  if (precipMm >= 4.0 || maxUpcomingPrecip >= 5.0 || [65, 82].includes(code)) {
    return {
      id: `risk-heavy-rain-${Date.now()}`,
      type: "heavy_rain",
      level: "danger",
      title: "⚠️ Heavy rain expected",
      whatIsHappening: `Intense downpours (${precipMm > 0 ? precipMm + " mm/hr" : "torrential showers"}) affecting ${locationLabel}.`,
      howItAffects: "Roadways can quickly become waterlogged, visibility drops sharply, and transit will be delayed.",
      whatToDo: "Consider delaying unnecessary road travel and avoid low-lying underpasses.",
      needsShelterPlaces: true,
      triggerValue: `${precipMm > 0 ? precipMm + " mm/hr" : current.condition}`,
      timestamp: now,
      locationName: location.name,
    };
  }

  // 4. STRONG WIND / GALE GUSTS
  if (maxWind >= 60) {
    return {
      id: `risk-gale-wind-${Date.now()}`,
      type: "wind",
      level: "danger",
      title: "💨 Damaging winds near you",
      whatIsHappening: `Severe wind gusts reaching ${maxWind} km/h detected around ${locationLabel}.`,
      howItAffects: "Loose roofing, construction hoardings, and weak branches may fall. Two-wheeler riding is hazardous.",
      whatToDo: "Avoid exposed open areas, secure lightweight outdoor objects, and stay clear of trees.",
      needsShelterPlaces: true,
      triggerValue: `${maxWind} km/h wind gusts`,
      timestamp: now,
      locationName: location.name,
    };
  } else if (maxWind >= 38) {
    return {
      id: `risk-strong-wind-${Date.now()}`,
      type: "wind",
      level: "caution",
      title: "💨 Strong winds expected",
      whatIsHappening: `Wind speeds are increasing to ${maxWind} km/h near ${locationLabel}.`,
      howItAffects: "May buffet cyclists/two-wheelers and displace lightweight outdoor items.",
      whatToDo: "Avoid exposed open spots and be careful around trees and loose objects.",
      needsShelterPlaces: false,
      triggerValue: `${maxWind} km/h winds`,
      timestamp: now,
      locationName: location.name,
    };
  }

  // 5. EXTREME / HIGH HEAT
  if (tempC >= 42 || feelsLikeC >= 45) {
    return {
      id: `risk-extreme-heat-${Date.now()}`,
      type: "heat",
      level: "danger",
      title: "☀️ Dangerous high heat",
      whatIsHappening: `Extreme daytime heat with feels-like index at ${feelsLikeC}°C (${tempC}°C actual) in ${locationLabel}.`,
      howItAffects: "High risk of rapid dehydration, heat cramps, and severe heat exhaustion.",
      whatToDo: "Stay indoors in well-ventilated or air-conditioned rooms, drink electrolytes, and avoid outdoor exertion.",
      needsShelterPlaces: true,
      triggerValue: `${tempC}°C (Feels like ${feelsLikeC}°C)`,
      timestamp: now,
      locationName: location.name,
    };
  } else if (tempC >= 38 || feelsLikeC >= 40) {
    return {
      id: `risk-heat-${Date.now()}`,
      type: "heat",
      level: "caution",
      title: "☀️ High heat",
      whatIsHappening: `It's getting very hot around ${locationLabel} with temperatures reaching ${tempC}°C (feels like ${feelsLikeC}°C).`,
      howItAffects: "Prolonged direct sun exposure can quickly deplete stamina and cause fatigue.",
      whatToDo: "Stay hydrated, avoid prolonged direct sunlight during midday, and take breaks somewhere cool.",
      needsShelterPlaces: false,
      triggerValue: `${tempC}°C`,
      timestamp: now,
      locationName: location.name,
    };
  }

  // 6. RAIN APPROACHING (rainProb >= 55% or upcoming showers)
  if (rainProb >= 55 || maxUpcomingRainProb >= 60 || [51, 53, 55, 61, 63, 80, 81].includes(code)) {
    return {
      id: `risk-rain-app-${Date.now()}`,
      type: "rain",
      level: "caution",
      title: "🌧️ Rain is approaching",
      whatIsHappening: `Rain showers are expected near ${locationLabel} (chance of rain: ${Math.max(rainProb, maxUpcomingRainProb)}%).`,
      howItAffects: "Surfaces will be slippery and sudden showers could catch you unprotected outdoors.",
      whatToDo: "If you're heading out, carrying an umbrella or rain jacket would be a good idea.",
      needsShelterPlaces: false,
      triggerValue: `${Math.max(rainProb, maxUpcomingRainProb)}% rain chance`,
      timestamp: now,
      locationName: location.name,
    };
  }

  // 7. LOW VISIBILITY / DENSE FOG
  if (visibilityKm <= 1.0) {
    return {
      id: `risk-fog-${Date.now()}`,
      type: "visibility",
      level: "caution",
      title: "🌫️ Dense fog & low visibility",
      whatIsHappening: `Visibility has dropped to ${visibilityKm} km around ${locationLabel}.`,
      howItAffects: "Roadway sight distance is heavily compromised for driving and commuting.",
      whatToDo: "Use low-beam fog headlights, slow down, and allow extra space between vehicles.",
      needsShelterPlaces: false,
      triggerValue: `${visibilityKm} km visibility`,
      timestamp: now,
      locationName: location.name,
    };
  }

  return null;
}

interface CooldownEntry {
  level: ProactiveRiskLevel;
  timestamp: number;
}

/**
 * Checks whether this risk should trigger a proactive notification to the user,
 * enforcing cooldowns to avoid spam.
 */
export function shouldNotifyUser(
  risk: ProactiveSafetyRisk,
  settings: NotificationSettings,
  isGpsLocation: boolean = false
): { shouldNotify: boolean; reason: string; isEscalated: boolean } {
  if (!settings.enabled) {
    return { shouldNotify: false, reason: "Notifications disabled by user in settings", isEscalated: false };
  }

  // Check specific category toggles
  if (risk.type === "rain" && !settings.rainAlerts) {
    return { shouldNotify: false, reason: "Rain alerts disabled", isEscalated: false };
  }
  if (risk.type === "heavy_rain" && !settings.dangerAlerts && !settings.rainAlerts) {
    return { shouldNotify: false, reason: "Rain & danger alerts disabled", isEscalated: false };
  }
  if (risk.type === "heat" && !settings.heatAlerts) {
    return { shouldNotify: false, reason: "Heat alerts disabled", isEscalated: false };
  }
  if (risk.type === "wind" && !settings.windAlerts) {
    return { shouldNotify: false, reason: "Wind alerts disabled", isEscalated: false };
  }
  if ((risk.level === "danger" || risk.level === "critical") && !settings.dangerAlerts) {
    return { shouldNotify: false, reason: "Danger alerts disabled", isEscalated: false };
  }

  // Check Cooldown map from localStorage
  const cooldownKey = `${risk.type}_${(risk.locationName || "").toLowerCase().trim()}`;
  let cooldownMap: Record<string, CooldownEntry> = {};

  try {
    const raw = localStorage.getItem(STORAGE_KEY_COOLDOWN);
    if (raw) cooldownMap = JSON.parse(raw);
  } catch (e) {
    console.warn("Error reading cooldown map:", e);
  }

  const existing = cooldownMap[cooldownKey];
  const now = Date.now();

  const levelRank: Record<ProactiveRiskLevel, number> = {
    info: 1,
    caution: 2,
    danger: 3,
    critical: 4,
  };

  if (existing) {
    const timeSinceLast = now - existing.timestamp;
    const isEscalation = levelRank[risk.level] > levelRank[existing.level];

    // If condition escalated (e.g. from caution to danger), allow immediately!
    if (isEscalation) {
      return { shouldNotify: true, reason: "Risk escalated to higher severity", isEscalated: true };
    }

    // If within cooldown period, suppress notification
    if (timeSinceLast < COOLDOWN_PERIOD_MS) {
      const remainingMinutes = Math.round((COOLDOWN_PERIOD_MS - timeSinceLast) / 60000);
      return {
        shouldNotify: false,
        reason: `Suppressed by cooldown (${remainingMinutes}m remaining)`,
        isEscalated: false,
      };
    }
  }

  return { shouldNotify: true, reason: "New risk detected", isEscalated: false };
}

/**
 * Records that a notification was sent for the given risk to update cooldown state
 */
export function recordNotificationSent(risk: ProactiveSafetyRisk, notifiedViaBrowser: boolean = false): void {
  const cooldownKey = `${risk.type}_${(risk.locationName || "").toLowerCase().trim()}`;
  const now = Date.now();

  try {
    let cooldownMap: Record<string, CooldownEntry> = {};
    const raw = localStorage.getItem(STORAGE_KEY_COOLDOWN);
    if (raw) cooldownMap = JSON.parse(raw);

    cooldownMap[cooldownKey] = {
      level: risk.level,
      timestamp: now,
    };
    localStorage.setItem(STORAGE_KEY_COOLDOWN, JSON.stringify(cooldownMap));

    // Also record in Notification Log History
    let log: ProactiveNotificationLogItem[] = [];
    const rawLog = localStorage.getItem(STORAGE_KEY_LOGS);
    if (rawLog) log = JSON.parse(rawLog);

    const newLogItem: ProactiveNotificationLogItem = {
      id: risk.id,
      risk,
      timestamp: new Date().toISOString(),
      notifiedViaBrowser,
      dismissed: false,
      viewed: false,
    };

    // Keep latest 25 notifications
    log = [newLogItem, ...log.slice(0, 24)];
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(log));
  } catch (err) {
    console.warn("Failed to record notification sent:", err);
  }
}

/**
 * Retrieves past proactive safety notifications
 */
export function getNotificationHistory(): ProactiveNotificationLogItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOGS);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn("Failed to get notification history:", err);
  }
  return [];
}

/**
 * Clears past notification logs
 */
export function clearNotificationHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY_LOGS);
  } catch (err) {
    console.warn("Failed to clear notification history:", err);
  }
}

/**
 * Triggers native browser Notification if permission is granted
 */
export async function triggerNativeBrowserNotification(risk: ProactiveSafetyRisk): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission === "granted") {
    try {
      const notif = new Notification(risk.title, {
        body: `${risk.whatIsHappening}\n${risk.whatToDo}`,
        icon: "/favicon.ico",
        tag: `weathergpt-${risk.type}`,
      });
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
      return true;
    } catch (err) {
      console.warn("Browser notification trigger error:", err);
      return false;
    }
  }

  return false;
}

/**
 * Generates an empathetic, natural assistant explanation answering the 4 core questions:
 * 1. What is happening
 * 2. How it affects the user
 * 3. What to do
 * 4. Where to get help
 */
export function generateNaturalRiskAdvisory(risk: ProactiveSafetyRisk): string {
  let text = `${risk.whatIsHappening} ${risk.howItAffects} ${risk.whatToDo}`;
  if (risk.needsShelterPlaces) {
    text += " If you need assistance, verified nearby public safety facilities are available.";
  }
  return text;
}
