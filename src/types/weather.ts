export type TemperatureUnit = "C" | "F";

export interface LocationData {
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

export interface CurrentWeather {
  tempC: number;
  tempF: number;
  feelsLikeC: number;
  feelsLikeF: number;
  weatherCode: number;
  condition: string;
  description: string;
  category: "clear" | "cloudy" | "drizzle" | "rain" | "snow" | "thunderstorm" | "fog" | "ice";
  humidity: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  windGustsKmh: number;
  rainProbability: number;
  precipitationMm: number;
  cloudCoverPct: number;
  visibilityKm: number;
  uvIndex: number;
  pressureHpa: number;
  isDay: boolean;
  time: string;
  sunrise: string;
  sunset: string;
}

export interface HourlyForecastItem {
  time: string;
  hour: string;
  tempC: number;
  tempF: number;
  weatherCode: number;
  condition: string;
  category: string;
  rainProbability: number;
  precipitationMm: number;
  windSpeedKmh: number;
  uvIndex: number;
}

export interface DailyForecastItem {
  date: string;
  dayName: string;
  dateFormatted: string;
  maxTempC: number;
  maxTempF: number;
  minTempC: number;
  minTempF: number;
  weatherCode: number;
  condition: string;
  category: string;
  rainProbability: number;
  precipitationMm: number;
  windSpeedKmh: number;
  uvIndex: number;
  sunrise: string;
  sunset: string;
}

export interface WeatherData {
  location: LocationData;
  current: CurrentWeather;
  hourly: HourlyForecastItem[];
  daily: DailyForecastItem[];
  fetchedAt: string;
}

export type AlertLevel = "info" | "caution" | "warning" | "danger";

export interface WeatherAlert {
  id: string;
  type: "rain" | "heat" | "cold" | "wind" | "storm" | "uv" | "visibility";
  level: AlertLevel;
  title: string;
  message: string;
  action: string;
  triggerValue: string;
  timestamp: string;
}

export type WeatherStatusLevel = "NORMAL" | "CAUTION" | "WARNING" | "DANGER";

export interface WeatherStatus {
  level: WeatherStatusLevel;
  title: string;
  description: string;
  dominantFactor: string;
  color: string;
  bgLight: string;
  borderColor: string;
  isDanger: boolean;
}

export interface WeatherDelta {
  hasChange: boolean;
  message: string;
  tempDiff: number;
  rainProbDiff: number;
  windDiff: number;
  previousTime?: string;
  details: string[];
}

export interface NearbyPlace {
  id: string;
  name: string;
  category: string;
  type: string;
  address: string;
  distanceKm: number;
  latitude: number;
  longitude: number;
  phone: string;
  mapsUrl: string;
  isOfficialShelter: boolean;
}

export interface GroundingSource {
  title: string;
  uri: string;
  type: "maps" | "web";
  snippet?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  groundingMetrics?: {
    location: string;
    temp: string;
    rainProb: string;
    wind: string;
  };
  sources?: GroundingSource[];
  groundingType?: "maps" | "search" | "dual" | "meteorological";
}

export interface ChatHistoryItem {
  id: string;
  title: string;
  query: string;
  timestamp: string;
  emoji: string;
  category?: "rain" | "sun" | "travel" | "shelter" | "sports" | "going_out" | "general";
}

export interface ActiveSessionLocation {
  name: string;
  region?: string;
  country?: string;
  latitude: number;
  longitude: number;
  mode: "gps" | "custom";
}

export interface ReferencedPlace {
  name: string;
  category?: string;
  distanceKm?: number;
  address?: string;
  mapsUrl?: string;
}

export interface ConversationMemoryContext {
  activeLocation?: ActiveSessionLocation;
  conversationTopic?: string;
  lastQuestion?: string;
  lastAnswer?: string;
  referencedTime?: string;
  referencedPlace?: ReferencedPlace;
  placeSearchResults?: ReferencedPlace[];
  userGoalOrActivity?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  emoji: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  activeRequestId?: string;
  activeMessageId?: string;
  isGenerating?: boolean;
  activeLocation?: ActiveSessionLocation;
  weatherData?: WeatherData;
  memoryContext?: ConversationMemoryContext;
}

export interface SafetyRecommendation {
  id: string;
  title: string;
  subtitle: string;
  category: "hydration" | "clothing" | "travel" | "sports" | "uv";
  status: "good" | "caution" | "warning" | "danger";
  icon: string;
  advice: string;
}

export type Theme = "dark" | "light";

export interface SecurityLog {
  id: string;
  action: string;
  device: string;
  location: string;
  timestamp: string;
  ip?: string;
}

export interface SavedUserLocation {
  name: string;
  region?: string;
  country?: string;
  latitude: number;
  longitude: number;
  isDefault?: boolean;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  provider: "email" | "google" | "github";
  twoFactorEnabled: boolean;
  twoFactorMethod?: "authenticator" | "sms";
  createdAt: string;
  lastLogin: string;
  savedLocations: SavedUserLocation[];
  preferences: {
    unit: TemperatureUnit;
    weatherAlerts: boolean;
    rainWarnings: boolean;
    aiStyle: "simple" | "detailed";
  };
  securityLogs: SecurityLog[];
}

export type GPSStatus = "active" | "denied" | "unavailable" | "timeout" | "idle";

export type LocationStatus =
  | "UNKNOWN"
  | "SCANNING"
  | "GPS_DETECTED"
  | "MANUAL_SELECTED"
  | "GPS_DENIED"
  | "GPS_UNAVAILABLE";

export interface GPSState {
  status: GPSStatus;
  coords: { latitude: number; longitude: number } | null;
  locationName: string;
  lastUpdated: string | null;
  accuracyMeters?: number;
}

export type ProactiveRiskType =
  | "rain"
  | "heavy_rain"
  | "wind"
  | "heat"
  | "thunderstorm"
  | "severe"
  | "visibility"
  | "cold";

export type ProactiveRiskLevel = "info" | "caution" | "danger" | "critical";

export interface ProactiveSafetyRisk {
  id: string;
  type: ProactiveRiskType;
  level: ProactiveRiskLevel;
  title: string;
  whatIsHappening: string;
  howItAffects: string;
  whatToDo: string;
  needsShelterPlaces: boolean;
  triggerValue: string;
  timestamp: string;
  locationName: string;
  escalated?: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  locationAlerts: boolean;
  dangerAlerts: boolean;
  rainAlerts: boolean;
  heatAlerts: boolean;
  windAlerts: boolean;
  sound: boolean;
  browserPermission: NotificationPermission;
}

export interface ProactiveNotificationLogItem {
  id: string;
  risk: ProactiveSafetyRisk;
  timestamp: string;
  notifiedViaBrowser: boolean;
  dismissed: boolean;
  viewed: boolean;
}

export type AppTab =
  | "chat"
  | "dashboard"
  | "forecast"
  | "retrospective"
  | "nearby"
  | "recommendations"
  | "alerts";

export interface RetrospectiveDay {
  date: string; // ISO date format "YYYY-MM-DD"
  dayName: string; // "Mon", "Tue", etc.
  dateFormatted: string; // "Sep 14"
  maxTempC: number;
  maxTempF: number;
  minTempC: number;
  minTempF: number;
  avgTempC: number;
  avgTempF: number;
  weatherCode: number;
  condition: string;
  description: string;
  category: "clear" | "cloudy" | "drizzle" | "rain" | "snow" | "thunderstorm" | "fog" | "ice";
  precipitationMm: number;
  precipitationProbMax: number;
  windSpeedKmh: number;
  humidityAvgPct: number;
}

export interface RetrospectiveStats {
  highestMaxTempC: number;
  highestMaxTempF: number;
  highestDayName: string;
  lowestMinTempC: number;
  lowestMinTempF: number;
  lowestDayName: string;
  averageTempC: number;
  averageTempF: number;
  averageMaxTempC: number;
  averageMinTempC: number;
  totalPrecipitationMm: number;
  rainyDaysCount: number;
  tempTrend: "warming" | "cooling" | "stable" | "fluctuating";
  tempChangeDeltaC: number;
  todayVsAverageDiffC: number;
  trendDescription: string;
}

export interface RetrospectiveSummary {
  location: {
    name: string;
    region?: string;
    country?: string;
    latitude: number;
    longitude: number;
    timezone?: string;
  };
  days: RetrospectiveDay[];
  stats: RetrospectiveStats;
  generatedAt: string;
  isGpsLocation: boolean;
}
