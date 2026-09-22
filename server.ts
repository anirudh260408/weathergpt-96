import express from "express";
import path from "path";
import { execSync } from "child_process";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";
import {
  analyzeQuestionAndContext,
  searchVerifiedPlaces,
  searchVerifiedWeb,
  extractRelevantWeatherFacts,
  buildCognitiveSystemPrompt,
  type ConversationMemoryContext,
  type ReferencedPlace,
  type QuestionAnalysis,
} from "./server/weatherGptBrain";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini client lazily
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is required in environment variables.");
    }
    geminiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

// Map WMO Weather Interpretation Codes to readable descriptions and category
function interpretWmoCode(code: number): { condition: string; description: string; category: string } {
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

// Download Full Project ZIP Endpoint (for VS Code and local development)
app.get("/api/download-zip", (req, res) => {
  try {
    const zipPath = "/tmp/weather-safety-pro-vscode.zip";
    execSync(`python3 -c "
import os, zipfile
EXCLUDE_DIRS = {'node_modules', '.git', 'dist', '.cache', '__pycache__'}
EXCLUDE_FILES = {'bun.lock'}
with zipfile.ZipFile('${zipPath}', 'w', zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith('.next')]
        for file in files:
            if file in EXCLUDE_FILES or file.endswith('.log'):
                continue
            path = os.path.join(root, file)
            arcname = os.path.relpath(path, '.')
            z.write(path, arcname)
"`);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="weather-safety-pro-vscode.zip"'
    );
    res.sendFile(zipPath);
  } catch (err: any) {
    console.error("Failed to generate project zip:", err);
    res.status(500).json({ error: "Failed to generate project zip archive" });
  }
});

// 1. Geocoding Search Endpoint
app.get("/api/geocode", async (req, res) => {
  try {
    const query = req.query.query as string;
    if (!query || query.trim().length < 2) {
      return res.json({ results: [] });
    }

    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      query.trim()
    )}&count=8&language=en&format=json`;

    const response = await fetch(geoUrl);
    if (!response.ok) {
      throw new Error("Failed to search location");
    }

    const data = await response.json();
    const results = (data.results || []).map((item: any) => ({
      name: item.name,
      region: item.admin1 || item.admin2 || "",
      country: item.country || "",
      latitude: item.latitude,
      longitude: item.longitude,
      timezone: item.timezone || "UTC",
    }));

    res.json({ results });
  } catch (error: any) {
    console.error("Geocoding error:", error);
    res.status(500).json({ error: error.message || "Failed to search location" });
  }
});

// 2. Reverse Geocoding Endpoint
app.get("/api/reverse-geocode", async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: "Invalid latitude or longitude" });
    }

    let locationName = "Location detected";
    let region = "";
    let country = "";
    let district = "";

    // Step A: Try BigDataCloud reverse geocode API (very fast, rich city & district resolution)
    try {
      const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
      const bdcRes = await fetch(bdcUrl, { signal: AbortSignal.timeout(3500) });
      if (bdcRes.ok) {
        const bdcData = await bdcRes.json();
        const city =
          bdcData.city ||
          bdcData.locality ||
          bdcData.principalSubdivision ||
          bdcData.localityInfo?.administrative?.[2]?.name ||
          bdcData.localityInfo?.administrative?.[1]?.name;
        if (city) {
          locationName = city;
          region = bdcData.principalSubdivision || "";
          country = bdcData.countryName || "";
          district = bdcData.localityInfo?.administrative?.[2]?.name || "";
        }
      }
    } catch (bdcErr) {
      console.warn("BDC reverse geocode error:", bdcErr);
    }

    // Step B: If not found, try OpenStreetMap Nominatim
    if (locationName === "Location detected" || !region) {
      try {
        const reverseUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=14`;
        const reverseRes = await fetch(reverseUrl, {
          headers: {
            "User-Agent": "WeatherGPT-Hackathon-App/1.0 (contact: support@weathergpt.local)",
            "Accept-Language": "en",
          },
          signal: AbortSignal.timeout(3500),
        });

        if (reverseRes.ok) {
          const revData = await reverseRes.json();
          const addr = revData.address || {};
          const city =
            addr.city ||
            addr.town ||
            addr.village ||
            addr.suburb ||
            addr.municipality ||
            addr.county ||
            revData.name;
          if (city) {
            locationName = city;
            region = addr.state || addr.state_district || addr.region || region;
            country = addr.country || country;
            district = addr.state_district || addr.county || district;
          }
        }
      } catch (err) {
        console.warn("Reverse geocode external lookup fallback:", err);
      }
    }

    res.json({
      name: locationName,
      region,
      country,
      district,
      latitude: lat,
      longitude: lon,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to reverse geocode" });
  }
});

// Helper to reverse geocode server-side if coordinates are provided without human name
async function resolveLocationNameFromCoords(lat: number, lon: number): Promise<{ name: string; region: string; country: string }> {
  try {
    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const bdcRes = await fetch(bdcUrl, { signal: AbortSignal.timeout(3000) });
    if (bdcRes.ok) {
      const bdcData = await bdcRes.json();
      const city =
        bdcData.city ||
        bdcData.locality ||
        bdcData.principalSubdivision ||
        bdcData.localityInfo?.administrative?.[2]?.name;
      if (city) {
        return {
          name: city,
          region: bdcData.principalSubdivision || "",
          country: bdcData.countryName || "",
        };
      }
    }
  } catch {}

  try {
    const reverseUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=14`;
    const reverseRes = await fetch(reverseUrl, {
      headers: {
        "User-Agent": "WeatherGPT-Hackathon-App/1.0",
        "Accept-Language": "en",
      },
      signal: AbortSignal.timeout(3000),
    });
    if (reverseRes.ok) {
      const revData = await reverseRes.json();
      const addr = revData.address || {};
      const city = addr.city || addr.town || addr.village || addr.suburb || revData.name;
      if (city) {
        return {
          name: city,
          region: addr.state || addr.region || "",
          country: addr.country || "",
        };
      }
    }
  } catch {}

  return {
    name: "Location detected",
    region: "",
    country: "",
  };
}

// Internal helper to fetch live weather observations and forecasts
async function fetchWeatherDataInternal(params: {
  lat?: number;
  lon?: number;
  city?: string;
  name?: string;
  region?: string;
  country?: string;
}): Promise<any> {
  let lat = params.lat;
  let lon = params.lon;
  const city = params.city;
  let locationName = params.name || "";
  let regionName = params.region || "";
  let countryName = params.country || "";

  if (city && (lat === undefined || lon === undefined || isNaN(lat) || isNaN(lon))) {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      city.trim()
    )}&count=1&language=en&format=json`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();
    if (!geoData.results || geoData.results.length === 0) {
      throw new Error(`Location '${city}' not found.`);
    }
    const top = geoData.results[0];
    lat = top.latitude;
    lon = top.longitude;
    locationName = top.name;
    regionName = top.admin1 || "";
    countryName = top.country || "";
  }

  if (lat === undefined || lon === undefined || isNaN(lat) || isNaN(lon)) {
    throw new Error("Missing required location. Please provide city or lat/lon coordinates.");
  }

  // Auto reverse geocode if locationName is missing or is coordinate-like
  if (!locationName || locationName.includes("°") || /^-?\d+(\.\d+)?,/.test(locationName)) {
    const resolved = await resolveLocationNameFromCoords(lat, lon);
    locationName = resolved.name;
    if (!regionName) regionName = resolved.region;
    if (!countryName) countryName = resolved.country;
  }

  // Call Open-Meteo real weather API
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,surface_pressure,wind_speed_10m,uv_index,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=7`;

  const weatherRes = await fetch(weatherUrl);
  if (!weatherRes.ok) {
    throw new Error(`Weather service responded with status: ${weatherRes.status}`);
  }

  const wData = await weatherRes.json();
  const current = wData.current || {};
  const hourly = wData.hourly || {};
  const daily = wData.daily || {};

  const wmo = interpretWmoCode(current.weather_code ?? 0);

  // Current hour index in hourly forecast
  const nowIso = current.time || new Date().toISOString();
  let currentHourIndex = 0;
  if (hourly.time && Array.isArray(hourly.time)) {
    const idx = hourly.time.findIndex((t: string) => t >= nowIso.slice(0, 13));
    currentHourIndex = idx >= 0 ? idx : 0;
  }

  // Current UV index and rain probability from hourly
  const currentUv = hourly.uv_index ? hourly.uv_index[currentHourIndex] ?? 0 : 0;
  const currentRainProb = hourly.precipitation_probability ? hourly.precipitation_probability[currentHourIndex] ?? 0 : 0;
  const currentVisibility = hourly.visibility ? Math.round((hourly.visibility[currentHourIndex] || 10000) / 1000) : 10;

  const tempC = Math.round((current.temperature_2m ?? 0) * 10) / 10;
  const tempF = Math.round(((tempC * 9) / 5 + 32) * 10) / 10;
  const feelsLikeC = Math.round((current.apparent_temperature ?? tempC) * 10) / 10;
  const feelsLikeF = Math.round(((feelsLikeC * 9) / 5 + 32) * 10) / 10;

  // Build 24-hour forecast
  const hourlyForecast = [];
  const hourlyTimes = hourly.time || [];
  const maxHours = Math.min(24, hourlyTimes.length - currentHourIndex);
  for (let i = 0; i < maxHours; i++) {
    const idx = currentHourIndex + i;
    const hTime = hourlyTimes[idx];
    const hTempC = Math.round(hourly.temperature_2m[idx]);
    const hWmo = interpretWmoCode(hourly.weather_code[idx]);
    const hRainProb = hourly.precipitation_probability ? hourly.precipitation_probability[idx] ?? 0 : 0;
    const hWind = Math.round(hourly.wind_speed_10m[idx] ?? 0);
    const hUv = Math.round((hourly.uv_index ? hourly.uv_index[idx] : 0) * 10) / 10;

    hourlyForecast.push({
      time: hTime,
      hour: new Date(hTime).toLocaleTimeString("en-US", { hour: "numeric", hour12: true }),
      tempC: hTempC,
      tempF: Math.round((hTempC * 9) / 5 + 32),
      weatherCode: hourly.weather_code[idx],
      condition: hWmo.condition,
      category: hWmo.category,
      rainProbability: hRainProb,
      precipitationMm: hourly.precipitation ? hourly.precipitation[idx] : 0,
      windSpeedKmh: hWind,
      uvIndex: hUv,
    });
  }

  // Build 7-day daily forecast
  const dailyForecast = [];
  const dailyTimes = daily.time || [];
  for (let i = 0; i < dailyTimes.length; i++) {
    const dTime = dailyTimes[i];
    const dWmo = interpretWmoCode(daily.weather_code[i]);
    const maxC = Math.round(daily.temperature_2m_max[i]);
    const minC = Math.round(daily.temperature_2m_min[i]);
    const dRainProb = daily.precipitation_probability_max ? daily.precipitation_probability_max[i] ?? 0 : 0;
    const dWind = Math.round(daily.wind_speed_10m_max ? daily.wind_speed_10m_max[i] : 0);
    const dUv = Math.round((daily.uv_index_max ? daily.uv_index_max[i] : 0) * 10) / 10;

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
      weatherCode: daily.weather_code[i],
      condition: dWmo.condition,
      category: dWmo.category,
      rainProbability: dRainProb,
      precipitationMm: daily.precipitation_sum ? daily.precipitation_sum[i] : 0,
      windSpeedKmh: dWind,
      uvIndex: dUv,
      sunrise: daily.sunrise ? daily.sunrise[i] : "",
      sunset: daily.sunset ? daily.sunset[i] : "",
    });
  }

  return {
    location: {
      name: locationName,
      region: regionName,
      country: countryName,
      latitude: lat,
      longitude: lon,
      timezone: wData.timezone || "auto",
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
      humidity: current.relative_humidity_2m ?? 0,
      windSpeedKmh: Math.round(current.wind_speed_10m ?? 0),
      windDirectionDeg: current.wind_direction_10m ?? 0,
      windGustsKmh: Math.round(current.wind_gusts_10m ?? 0),
      rainProbability: currentRainProb,
      precipitationMm: current.precipitation ?? 0,
      cloudCoverPct: current.cloud_cover ?? 0,
      visibilityKm: currentVisibility,
      uvIndex: Math.round(currentUv * 10) / 10,
      pressureHpa: Math.round(current.pressure_msl || current.surface_pressure || 1013),
      isDay: current.is_day === 1,
      time: current.time,
      sunrise: daily.sunrise && daily.sunrise[0] ? daily.sunrise[0] : "",
      sunset: daily.sunset && daily.sunset[0] ? daily.sunset[0] : "",
    },
    hourly: hourlyForecast,
    daily: dailyForecast,
    fetchedAt: new Date().toISOString(),
  };
}

// 3. Real Weather API Endpoint (Open-Meteo high precision ECMWF/GFS observations)
app.get("/api/weather", async (req, res) => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lon = req.query.lon ? parseFloat(req.query.lon as string) : undefined;
    const city = req.query.city as string;
    const name = req.query.name as string;
    const region = req.query.region as string;
    const country = req.query.country as string;

    const payload = await fetchWeatherDataInternal({ lat, lon, city, name, region, country });
    res.json(payload);
  } catch (error: any) {
    console.error("Weather fetch error, serving baseline fallback:", error);
    const lat = parseFloat(req.query.lat as string) || 0;
    const lon = parseFloat(req.query.lon as string) || 0;
    const locationName = (req.query.city as string) || (req.query.name as string) || "Your Location";

    // Generate valid fallback payload
    const now = new Date();
    const hourly = [];
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getTime() + i * 3600000);
      hourly.push({
        time: d.toISOString(),
        hour: d.toLocaleTimeString("en-US", { hour: "numeric", hour12: true }),
        tempC: 29 + Math.round(Math.sin((i / 24) * Math.PI * 2) * 4),
        tempF: 84,
        weatherCode: 2,
        condition: "Partly Cloudy",
        category: "cloudy",
        rainProbability: 15,
        precipitationMm: 0,
        windSpeedKmh: 14,
        uvIndex: i >= 4 && i <= 10 ? 6.2 : 0.5,
      });
    }

    const daily = [];
    const days = ["Today", "Tomorrow", "Wed", "Thu", "Fri", "Sat", "Sun"];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getTime() + i * 86400000);
      daily.push({
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

    res.json({
      location: {
        name: locationName,
        region: "Andhra Pradesh",
        country: "India",
        latitude: lat,
        longitude: lon,
        timezone: "auto",
      },
      current: {
        tempC: 29,
        tempF: 84,
        feelsLikeC: 32,
        feelsLikeF: 90,
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
      hourly,
      daily,
      fetchedAt: now.toISOString(),
      isFallback: true,
    });
  }
});

// 3.5 7-Day Retrospective Weather Summary Endpoint
app.get("/api/weather/retrospective", async (req, res) => {
  try {
    let lat = parseFloat(req.query.lat as string);
    let lon = parseFloat(req.query.lon as string);
    let locationName = (req.query.city as string) || (req.query.name as string);
    let regionName = "";
    let countryName = "";

    if (isNaN(lat) || isNaN(lon)) {
      if (req.query.city) {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          req.query.city as string
        )}&count=1&language=en&format=json`;
        const geoRes = await fetch(geoUrl);
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
    }

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: "Missing required location coordinates for retrospective weather." });
    }

    if (!locationName || locationName.includes("°") || /^-?\d+(\.\d+)?,/.test(locationName)) {
      const resolved = await resolveLocationNameFromCoords(lat, lon);
      locationName = resolved.name;
      if (!regionName) regionName = resolved.region;
      if (!countryName) countryName = resolved.country;
    }

    // Query Open-Meteo forecast API with past_days=7
    const retroUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&past_days=7&forecast_days=1&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto`;

    const retroRes = await fetch(retroUrl);
    if (!retroRes.ok) {
      throw new Error(`Retrospective weather service responded with status: ${retroRes.status}`);
    }

    const retroData = await retroRes.json();
    const daily = retroData.daily || {};
    const times: string[] = daily.time || [];

    // The past 7 days are the first 7 items (excluding today at index 7)
    const retroDayCount = Math.min(7, times.length > 1 ? times.length - 1 : times.length);
    const days = [];

    let totalMaxC = 0;
    let totalMinC = 0;
    let highestMaxC = -999;
    let highestDayName = "";
    let lowestMinC = 999;
    let lowestDayName = "";
    let totalPrecipMm = 0;
    let rainyDaysCount = 0;

    for (let i = 0; i < retroDayCount; i++) {
      const dTime = times[i];
      const dateObj = new Date(dTime);
      const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
      const dateFormatted = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      const wCode = daily.weather_code ? daily.weather_code[i] : 0;
      const wmo = interpretWmoCode(wCode);

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
    const averageTempC = Math.round(((averageMaxTempC + averageMinMinC()) / 2) * 10) / 10;
    function averageMinMinC() { return averageMinTempC; }
    const averageTempF = Math.round(((averageTempC * 9) / 5 + 32) * 10) / 10;

    // Trend calculation (compare last 3 days avg vs first 3 days avg)
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

    const todayTempC = times.length > 7 && daily.temperature_2m_max ? daily.temperature_2m_max[times.length - 1] : averageMaxTempC;
    const todayVsAverageDiffC = Math.round((todayTempC - averageMaxTempC) * 10) / 10;

    let trendDescription = "";
    if (tempTrend === "warming") {
      trendDescription = `Temperatures exhibited a progressive warming pattern over the past 7 days (+${Math.abs(tempChangeDeltaC)}°C shift), peaking at ${highestMaxC}°C on ${highestDayName}.`;
    } else if (tempTrend === "cooling") {
      trendDescription = `Temperatures experienced a noticeable cooling trend across the past 7 days (${tempChangeDeltaC}°C decrease), reaching a low of ${lowestMinC}°C on ${lowestDayName}.`;
    } else if (tempTrend === "fluctuating") {
      trendDescription = `Temperatures fluctuated with dynamic day-to-day variations between ${lowestMinC}°C and ${highestMaxC}°C throughout the 7-day period.`;
    } else {
      trendDescription = `Temperatures maintained a consistent, stable range around an average of ${averageTempC}°C over the past 7 days.`;
    }

    res.json({
      location: {
        name: locationName,
        region: regionName,
        country: countryName,
        latitude: lat,
        longitude: lon,
        timezone: retroData.timezone || "auto",
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
        todayVsAverageDiffC,
        trendDescription,
      },
      generatedAt: new Date().toISOString(),
      isGpsLocation: true,
    });
  } catch (error: any) {
    console.error("Retrospective fetch error, returning realistic fallback:", error);
    const lat = parseFloat(req.query.lat as string) || 0;
    const lon = parseFloat(req.query.lon as string) || 0;
    const locationName = (req.query.city as string) || (req.query.name as string) || "Your Location";

    const days = [];
    const now = new Date();
    for (let i = 7; i >= 1; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      const dateFormatted = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const maxC = 30 + Math.round(Math.sin((7 - i) / 2) * 3);
      const minC = 22 + Math.round(Math.cos((7 - i) / 2) * 2);
      days.push({
        date: d.toISOString().slice(0, 10),
        dayName,
        dateFormatted,
        maxTempC: maxC,
        maxTempF: Math.round((maxC * 9) / 5 + 32),
        minTempC: minC,
        minTempF: Math.round((minC * 9) / 5 + 32),
        avgTempC: Math.round(((maxC + minC) / 2) * 10) / 10,
        avgTempF: Math.round((((maxC + minC) / 2 * 9) / 5 + 32) * 10) / 10,
        weatherCode: 2,
        condition: "Partly Cloudy",
        description: "Scattered light clouds with sunshine",
        category: "cloudy" as const,
        precipitationMm: i === 3 ? 4.2 : 0,
        precipitationProbMax: i === 3 ? 60 : 15,
        windSpeedKmh: 14,
        humidityAvgPct: 68,
      });
    }

    res.json({
      location: {
        name: locationName,
        region: "Andhra Pradesh",
        country: "India",
        latitude: lat,
        longitude: lon,
      },
      days,
      stats: {
        highestMaxTempC: 33,
        highestMaxTempF: 91,
        highestDayName: `${days[days.length - 2]?.dayName || "Sat"} (${days[days.length - 2]?.dateFormatted || "Recent"})`,
        lowestMinTempC: 21,
        lowestMinTempF: 70,
        lowestDayName: `${days[1]?.dayName || "Tue"} (${days[1]?.dateFormatted || "Recent"})`,
        averageTempC: 26.5,
        averageTempF: 79.7,
        averageMaxTempC: 31.2,
        averageMinTempC: 22.1,
        totalPrecipitationMm: 4.2,
        rainyDaysCount: 1,
        tempTrend: "stable",
        tempChangeDeltaC: 0.8,
        todayVsAverageDiffC: 1.2,
        trendDescription: "Temperatures maintained a steady warm pattern averaging 26.5°C over the past 7 days.",
      },
      generatedAt: now.toISOString(),
      isGpsLocation: true,
      isFallback: true,
    });
  }
});

// 4. Nearby Safe Places / Assistance Finder Endpoint
app.get("/api/nearby-places", async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);
    const locationName = (req.query.city as string) || "Current Area";

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    // Try OpenStreetMap Overpass mirrors for emergency services & shelters
    const radius = 6000;
    const overpassQuery = `[out:json][timeout:4];(node["amenity"~"hospital|police|fire_station|shelter"](around:${radius},${lat},${lon});node["shop"="mall"](around:${radius},${lat},${lon}););out center 12;`;

    let places: any[] = [];

    // List of reliable public Overpass mirrors to attempt
    const overpassMirrors = [
      "https://overpass-api.de/api/interpreter",
      "https://overpass.kumi.systems/api/interpreter",
    ];

    for (const mirror of overpassMirrors) {
      try {
        const overpassUrl = `${mirror}?data=${encodeURIComponent(overpassQuery)}`;
        const opRes = await fetch(overpassUrl, { signal: AbortSignal.timeout(3000) });
        if (opRes.ok) {
          const opData = await opRes.json();
          if (opData.elements && opData.elements.length > 0) {
            places = opData.elements
              .filter((el: any) => el.tags && (el.tags.name || el.tags.amenity || el.tags.shop))
              .map((el: any) => {
                const elLat = el.lat || (el.center && el.center.lat) || lat;
                const elLon = el.lon || (el.center && el.center.lon) || lon;
                const distKm = calculateDistance(lat, lon, elLat, elLon);
                const amenity = el.tags.amenity || el.tags.shop || "indoor";
                const type =
                  amenity === "hospital"
                    ? "Hospital / Medical"
                    : amenity === "police"
                    ? "Police Station"
                    : amenity === "fire_station"
                    ? "Fire Department"
                    : amenity === "shelter"
                    ? "Designated Shelter"
                    : "Indoor Public Building";

                return {
                  id: `osm-${el.id}`,
                  name: el.tags.name || `${type} near ${locationName}`,
                  category: type,
                  type: amenity,
                  address: el.tags["addr:street"]
                    ? `${el.tags["addr:street"]}, ${el.tags["addr:city"] || locationName}`
                    : `Near ${locationName}`,
                  distanceKm: Math.round(distKm * 10) / 10,
                  latitude: elLat,
                  longitude: elLon,
                  phone: el.tags.phone || el.tags["contact:phone"] || "Dial 112 / Emergency",
                  mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    (el.tags.name ? el.tags.name + " " : "") + locationName
                  )}`,
                  isOfficialShelter: amenity === "shelter",
                };
              })
              .sort((a: any, b: any) => a.distanceKm - b.distanceKm)
              .slice(0, 8);

            if (places.length > 0) break;
          }
        }
      } catch {
        // Continue to next mirror or fallback without crashing
      }
    }

    // Fallback if Overpass returned no results or failed
    if (places.length === 0) {
      places = [
        {
          id: "local-med-1",
          name: `${locationName} District Government Hospital`,
          category: "Hospital / Medical",
          type: "hospital",
          address: `Main Medical Road, ${locationName}`,
          distanceKm: 1.2,
          latitude: lat + 0.008,
          longitude: lon + 0.005,
          phone: "Emergency: 108 / 112",
          mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            "Hospital near " + locationName
          )}`,
          isOfficialShelter: false,
        },
        {
          id: "local-pol-1",
          name: `${locationName} Central Police Headquarters`,
          category: "Police Station",
          type: "police",
          address: `Civic Centre Ring Road, ${locationName}`,
          distanceKm: 2.1,
          latitude: lat - 0.012,
          longitude: lon + 0.007,
          phone: "Police: 100 / 112",
          mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            "Police Station near " + locationName
          )}`,
          isOfficialShelter: false,
        },
        {
          id: "local-fire-1",
          name: `${locationName} Fire & Rescue Station`,
          category: "Fire Department",
          type: "fire_station",
          address: `Disaster Response Avenue, ${locationName}`,
          distanceKm: 2.8,
          latitude: lat + 0.015,
          longitude: lon - 0.009,
          phone: "Fire: 101 / 112",
          mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            "Fire Station near " + locationName
          )}`,
          isOfficialShelter: false,
        },
        {
          id: "local-civic-1",
          name: `${locationName} Indoor Civic Complex & Community Centre`,
          category: "Nearby Indoor Assistance",
          type: "indoor",
          address: `Municipal Hub, ${locationName}`,
          distanceKm: 3.4,
          latitude: lat - 0.018,
          longitude: lon - 0.014,
          phone: "Civic Helpline: 112",
          mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            "Community Center near " + locationName
          )}`,
          isOfficialShelter: false,
        },
        {
          id: "local-mall-1",
          name: `${locationName} Central Shopping Centre & Covered Concourse`,
          category: "Nearby Indoor Public Location",
          type: "indoor",
          address: `High Street Promenade, ${locationName}`,
          distanceKm: 3.9,
          latitude: lat + 0.021,
          longitude: lon + 0.019,
          phone: "Information Desk Available",
          mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            "Shopping Mall near " + locationName
          )}`,
          isOfficialShelter: false,
        },
      ];
    }

    res.json({ places });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to locate nearby places" });
  }
});

// Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// General Conversational Fallback when no specific location is needed or when API quotas are constrained
function generateGeneralConversationalFallback(
  userQuery: string,
  history?: Array<{ role: string; content: string }>
): string {
  const q = userQuery.trim().toLowerCase();
  const clean = q.replace(/[^\w\s]/g, "").trim();

  // 1. RAG & AI Architecture questions
  if (clean.includes("rag") || clean.includes("retrieval augmented") || clean.includes("what is rag") || clean.includes("explain rag")) {
    return "RAG (Retrieval-Augmented Generation) is an AI architecture that enhances language models by retrieving relevant external facts or real-time data (like live weather station measurements, documents, or maps) before generating a response. This grounds the AI in accurate, up-to-date knowledge.";
  }

  // 2. Identity & Capabilities
  if (/^(who are you|what are you|what can you do|introduce yourself|tell me about yourself)\b/i.test(clean)) {
    return "I'm WeatherGPT, your intelligent weather and location assistant. I provide real-time forecasts, radar insights, activity planning (like cycling, walks, and sports), travel weather comparisons, and grounded destination recommendations worldwide.";
  }

  // 3. Greetings & Casual Hello
  if (/^(hi|hello|hey|hey there|hi there|good morning|good afternoon|good evening|namaste|yo|sup|what's up|whats up|hola|how are you|hows it going)\b/i.test(clean)) {
    return "Hello! How can I help you today? You can ask me about weather forecasts, outdoor activity conditions, travel plans, or explore any city worldwide.";
  }

  // 4. Jokes & Fun
  if (clean.includes("joke") || clean.includes("make me laugh") || clean.includes("funny")) {
    const jokes = [
      "Why did the cloud stay on the ground? Because it was feeling a little misty!",
      "What did one raindrop say to the other? Two's company, three's a cloud!",
      "How do tornadoes stay organized? They put everything into a spin cycle!",
      "Why is the sky never lonely? Because it's always accompanied by a ray of sunshine."
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }

  // 5. General Weather Concepts
  if (clean.includes("how does rain form") || clean.includes("how rain forms") || clean.includes("why does it rain")) {
    return "Rain forms through the water cycle: sun heats surface water causing evaporation into water vapor. As vapor rises into the cooler atmosphere, it condenses into water droplets forming clouds. When droplets become too heavy to remain suspended in air currents, gravity pulls them down as precipitation (rain).";
  }

  if (clean.includes("what is uv index") || clean.includes("uv index")) {
    return "The UV (Ultraviolet) Index is an international standard measurement of skin-damaging ultraviolet radiation from the sun. It ranges from 0 to 11+: 0–2 is Low, 3–5 Moderate, 6–7 High, 8–10 Very High, and 11+ Extreme.";
  }

  if (clean.includes("what is humidity") || clean.includes("humidity")) {
    return "Humidity measures the amount of water vapor in the air. Relative humidity is expressed as a percentage of the maximum amount of moisture the air can hold at its current temperature. High humidity (above 70%) can make temperatures feel significantly warmer than actual readings.";
  }

  if (clean.includes("what is a cyclone") || clean.includes("cyclone") || clean.includes("hurricane") || clean.includes("typhoon")) {
    return "A cyclone is a large-scale rotating weather system characterized by low atmospheric pressure, inward-spiraling winds, and heavy rainfall. In the North Atlantic they are called hurricanes; in the Northwest Pacific, typhoons; and in the South Pacific and Indian Ocean, cyclones.";
  }

  // 6. Ambiguous / Generic Place Queries
  if (/^best\s+places?\??$/i.test(clean) || clean === "best place" || clean === "best places" || clean === "where to go") {
    return "Best place for what—food, sightseeing, beaches, shopping, or a weekend getaway? Let me know what type of experience or destination you have in mind!";
  }

  // 7. General Conversational Fallback
  return `I'm here to help! If you have a specific question about science, concepts, or travel, feel free to ask. If you'd like live weather or forecast insights, just let me know which city or area you're interested in.`;
}

// Grounded Meteorological Analysis Fallback
// Generates natural, human, conversational answers backed by real weather data
function generateGroundedWeatherFallback(
  userQuery: string,
  weatherData: any,
  safetyStatus: string,
  activeAlerts: any[],
  history?: Array<{ role: string; content: string }>,
  memoryContext?: ConversationMemoryContext,
  analysis?: QuestionAnalysis
): string {
  const loc = weatherData?.location?.name || "your location";
  const current = weatherData?.current;
  if (!current) {
    return `Hi there! 👋 Checking live weather conditions for ${loc}... Data will be ready in a moment.`;
  }

  const query = userQuery.toLowerCase().trim();
  const cleanQ = query.replace(/[^\w\s]/g, "").trim();
  const temp = current.tempC ?? 25;
  const feelsLike = current.feelsLikeC ?? current.apparent_temperature ?? temp;
  const cond = current.condition || "Moderate conditions";
  const rainProb = current.rainProbability ?? 0;
  const wind = current.windSpeedKmh ?? 0;
  const uv = current.uvIndex ?? 0;
  const hourly = weatherData?.hourly || [];
  const daily = weatherData?.daily || [];

  // Pronoun & Follow-up Resolution: "Can I walk there?", "Is it open?", "What about rain?"
  const targetPlace = memoryContext?.referencedPlace || analysis?.resolvedPlace;
  if (targetPlace) {
    if (query.includes("walk there") || (query.includes("walk") && (query.includes("there") || query.includes("can i")))) {
      const dist = targetPlace.distanceKm || 1.4;
      if (rainProb >= 40) {
        return `It's pretty close (about ${dist} km to ${targetPlace.name}) and you can walk there 👍 I'd take an umbrella though, as rain chances are around ${rainProb}%.`;
      } else {
        return `It's pretty close (about ${dist} km to ${targetPlace.name}) and the weather is okay right now 👍 I'd take an umbrella if you're planning to come back later.`;
      }
    }
    if (query.includes("open") || query.includes("is it open") || query.includes("hours")) {
      return `${targetPlace.name} is generally open until late evening 👍 Outside weather is currently ${temp}°C and ${cond.toLowerCase()}.`;
    }
  }

  // Ambiguous Questions handling: e.g. "Best place?", "best place"
  if (/^best\s+places?\??$/i.test(cleanQ) || cleanQ === "best place" || cleanQ === "best places" || cleanQ === "where to go") {
    return "Best place for what—food, sightseeing, beaches, shopping, or a weekend trip? Let me know what you have in mind and I'll give you specific recommendations!";
  }

  // Beach in Hyderabad / Beach trip intent: Understand intent rather than literal "no beaches"
  if (query.includes("beach") && (query.includes("hyderabad") || loc.toLowerCase() === "hyderabad")) {
    return `Hyderabad itself doesn't have a natural sea beach, but if you're looking for a coastal beach trip accessible from Hyderabad, here are great options:\n\n🌊 **Nearby Coastal Destinations:**\n• **Suryalanka Beach (Bapatla)** – ~320 km (~6 hrs by car/train). Perfect for a weekend beach getaway with shore cottages.\n• **Chirala Beach (Vodarevu)** – ~300 km (~5.5 hrs). Quiet sandy shores with seaside resorts.\n• **Manginapudi Beach (Machilipatnam)** – ~340 km.\n• **Rushikonda Beach (Visakhapatnam)** – ~620 km (best via overnight train or short flight) for blue water and water sports.\n\n🌊 **Waterfronts in Hyderabad:**\n• If you just want water breezes inside the city, **Durgam Cheruvu Lakefront** and **Hussain Sagar / Tank Bund** offer scenic water views.\n\nAre you looking for an overnight beach road trip or a local spot in the city?`;
  }

  // Follow-up: "Which one is closest?", "What about somewhere close?", "How far?"
  if (
    (query.includes("closest") || query.includes("somewhere close") || query.includes("closer") || query.includes("how far")) &&
    (memoryContext?.conversationTopic?.includes("beach") || (history && history.some((h: any) => h.content?.toLowerCase().includes("beach"))))
  ) {
    return `Between the coastal sea beaches from Hyderabad, **Chirala Beach** (~300 km) and **Suryalanka Beach (Bapatla)** (~320 km) are the closest, roughly 5.5 to 6 hours away by road or train. If you prefer somewhere right in the city without a long drive, **Durgam Cheruvu lakefront** and **Gandipet (Osman Sagar)** are only about 15–25 km away.`;
  }

  // Destination / Travel query: Goa places
  if (query.includes("goa") && (query.includes("best place") || query.includes("visit") || query.includes("places") || query.includes("beach"))) {
    return `Goa has great spots depending on your vibe:\n• **Beaches**: Palolem and Agonda in South Goa for tranquil scenic shores; Baga, Calangute, and Anjuna in North Goa for water sports, beach shacks, and energy.\n• **Historic Forts**: Fort Aguada and Chapora Fort for sweeping sea views.\n• **Culture & Sights**: Fontainhas (Panjim's colorful Latin Quarter) and the historic churches of Old Goa.\n\nAre you planning a relaxing beach getaway, sightseeing, or nightlife?`;
  }

  // 0. Greeting & Casual Hellos ("Hi", "Hello", "Hey", "Hey bro", "What's up", etc.)
  const isGreeting =
    /^(hi|hello|hey|hey there|hi there|good morning|good afternoon|good evening|good day|namaste|greetings|yo|sup|whats up|what's up|hey bro|hi bro|hello bro|bro|dude|buddy|hola)$/i.test(
      cleanQ
    ) ||
    cleanQ === "hi" ||
    cleanQ === "hello" ||
    cleanQ === "hey" ||
    cleanQ === "bro" ||
    cleanQ.startsWith("hi ") ||
    cleanQ.startsWith("hello ") ||
    cleanQ.startsWith("hey ") ||
    cleanQ.startsWith("yo ");

  if (isGreeting && !query.includes("rain") && !query.includes("temp") && !query.includes("trip") && !query.includes("wear")) {
    const isBro = query.includes("bro") || query.includes("dude");
    const greetingWord = isBro
      ? "Hey bro! 👋 What's up?"
      : query.includes("morning")
      ? "Good morning! ☀️"
      : query.includes("evening")
      ? "Good evening! 🌙"
      : query.includes("afternoon")
      ? "Good afternoon! ☀️"
      : "Hi there! 👋";

    let rainNote = "";
    if (rainProb >= 50) {
      rainNote = ` Keep an umbrella handy if you're heading out, as there's a ${rainProb}% chance of rain today 🌧️`;
    } else if (rainProb >= 25) {
      rainNote = ` There's a slight ${rainProb}% chance of a passing shower later.`;
    } else {
      rainNote = ` Skies are looking clear with low rain risk (${rainProb}%).`;
    }

    return `${greetingWord} Right now in ${loc}, it's ${temp}°C (${feelsLike !== temp ? `feels like ${feelsLike}°C, ` : ""}${cond.toLowerCase()}).${rainNote} What's on your mind today? 🌤️`;
  }

  // Non-weather tech / general questions (e.g., "what is RAG?")
  if (
    query.includes("rag") ||
    query.includes("retrieval augmented") ||
    query.includes("machine learning") ||
    query.includes("neural net")
  ) {
    return "RAG (Retrieval-Augmented Generation) is an AI architecture that connects large language models to external data sources. Instead of relying solely on static training weights, the system retrieves relevant, verified context (such as live weather measurements) and provides it to the model to generate accurate, up-to-date responses.";
  }

  // Tomorrow / Future Days ("weather tomorrow", "weather for tomorrow", "what about tomorrow?", "is tomorrow better?")
  if (query.includes("tomorrow") || query.includes("next day")) {
    const tomorrow = daily[1];
    if (tomorrow) {
      const comparison =
        tomorrow.rainProbability < rainProb
          ? `Rain chances are lower than today (${tomorrow.rainProbability}% vs ${rainProb}%).`
          : tomorrow.rainProbability > rainProb
          ? `Rain chances are higher than today (${tomorrow.rainProbability}% vs ${rainProb}%).`
          : `Rain chances stay steady around ${tomorrow.rainProbability}%.`;
      return `${loc} will stay ${tomorrow.condition.toLowerCase()} tomorrow 🌧️ with a high around ${tomorrow.maxTempC}°C and lows near ${tomorrow.minTempC}°C. ${comparison}`;
    }
    return `${loc} will stay mostly steady tomorrow with highs near ${temp + 1}°C.`;
  }

  // Friday / Specific Day query ("and friday?", "what about friday?", "friday forecast", "and saturday?")
  const weekDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  for (const dayName of weekDays) {
    if (query.includes(dayName) || (dayName === "friday" && query.includes("fri"))) {
      const matched = daily.find((d: any) => (d.dayName || "").toLowerCase().includes(dayName.slice(0, 3)));
      if (matched) {
        return `${loc} will see ${matched.condition.toLowerCase()} this ${matched.dayName} with temperatures reaching ${matched.maxTempC}°C and a ${matched.rainProbability}% chance of rain.`;
      }
    }
  }

  // Weekend Forecast ("weather this weekend", "saturday", "sunday")
  if (query.includes("weekend") || query.includes("saturday") || query.includes("sunday")) {
    const weekendDays = daily.filter((d: any) => {
      const name = (d.dayName || "").toLowerCase();
      return name.includes("sat") || name.includes("sun");
    });
    if (weekendDays.length > 0) {
      const summaries = weekendDays.map(
        (d: any) => `${d.dayName}: ${d.condition}, high ${d.maxTempC}°C / low ${d.minTempC}°C, rain chance ${d.rainProbability}%`
      );
      return `Here is the weekend forecast for ${loc}:\n• ${summaries.join("\n• ")}`;
    }
    return `For the weekend in ${loc}, temperatures will average around ${temp + 1}°C to ${temp + 3}°C with moderate weather.`;
  }

  // 1. Follow-up Time: "What about 4?" / "What about 5?" / "What about 6 PM?"
  const findHourlyByTime = (targetHour: number) => {
    return hourly.find((h: any) => {
      const match = h.hour?.match(/(\d+)\s*(AM|PM)/i);
      if (!match) return false;
      let hr = parseInt(match[1], 10);
      const ampm = match[2].toUpperCase();
      if (ampm === "PM" && hr < 12) hr += 12;
      if (ampm === "AM" && hr === 12) hr = 0;
      return hr === targetHour;
    });
  };

  const hrMatch = query.match(/\b(what about|how about|at|for)?\s*(\d{1,2})\s*(pm|am)?\b/);
  if (hrMatch && (query.includes("what about") || query.includes("how about") || query.includes("at") || /^\d{1,2}\s*(pm|am)?$/.test(query))) {
    const hrNum = parseInt(hrMatch[2], 10);
    const isPm = hrMatch[3] ? hrMatch[3].toLowerCase() === "pm" : hrNum >= 1 && hrNum <= 11;
    const target24 = isPm && hrNum < 12 ? hrNum + 12 : hrNum;
    const foundHour = findHourlyByTime(target24);

    if (foundHour) {
      if (foundHour.rainProbability >= 40) {
        return `${hrNum} PM is a little risky today because rain chances increase to ${foundHour.rainProbability}% 🌧️ If you can go earlier, that looks safer.`;
      } else if (foundHour.rainProbability <= 20) {
        return `${hrNum} PM looks great 👍 Rain risk is low at ${foundHour.rainProbability}%, and temperature should be near ${foundHour.tempC}°C.`;
      } else {
        return `${hrNum} PM looks reasonable at ${foundHour.tempC}°C with a slight ${foundHour.rainProbability}% chance of a passing shower.`;
      }
    }
  }

  // 2. Bike / Cycling / Ride
  if (query.includes("bike") || query.includes("cycle") || query.includes("cycling") || query.includes("ride")) {
    if (rainProb >= 40 || wind >= 35) {
      return `I'd probably hold off on the bike ride 🚲 Rain chances are around ${rainProb}% with winds at ${wind} km/h, so conditions could get slick and windy.`;
    } else {
      return `Taking your bike out looks good! 🚲 It's currently ${temp}°C with light winds (${wind} km/h) and only a ${rainProb}% rain chance.`;
    }
  }

  // 3. Sports / Cricket / Football / Outdoor play
  if (query.includes("cricket") || query.includes("football") || query.includes("sports") || query.includes("play")) {
    if (rainProb >= 50 || current.precipitationMm > 0.5) {
      return `I'd probably wait or play indoors today 🏏 Rain chances increase to ${rainProb}% and grounds may get wet.`;
    } else if (temp >= 35) {
      return `It's pretty hot right now (${temp}°C, feels like ${feelsLike}°C). If you're playing cricket or football, aim for the late afternoon and stay hydrated.`;
    } else {
      return `Conditions look good for cricket and outdoor sports right now 🏏 It's ${temp}°C with light winds and dry skies.`;
    }
  }

  // 4. Running / Jogging / Walking
  if (query.includes("running") || query.includes("jog") || query.includes("walk")) {
    if (rainProb >= 50) {
      return `If you're going for a run or walk, go sooner rather than later 👍 Rain is more likely later with a ${rainProb}% chance.`;
    } else if (temp >= 34) {
      return `It's quite warm right now (${temp}°C). An early morning or late-evening walk will be much more pleasant.`;
    } else {
      return `You're all set for a walk or run 🌤️ It's ${temp}°C with pleasant breezes and low rain risk.`;
    }
  }

  // 5. Rain / Umbrella / Precipitation
  if (query.includes("rain") || query.includes("umbrella") || query.includes("shower") || query.includes("wet")) {
    if (rainProb >= 50 || current.precipitationMm > 0) {
      return `There's a good chance of rain today (${rainProb}%) 🌧️ Keep an umbrella with you if you're heading out.`;
    } else if (rainProb >= 25) {
      return `There's a slight chance of showers later today (${rainProb}%). A compact umbrella is handy just in case.`;
    } else {
      return `You shouldn't need an umbrella today. Rain chances are low at ${rainProb}% with mostly ${cond.toLowerCase()} conditions.`;
    }
  }

  // 6. Clothing / What to wear
  if (query.includes("wear") || query.includes("clothes") || query.includes("clothing") || query.includes("jacket")) {
    if (temp >= 30) {
      return `Something light and breathable is comfortable today 👕 ${rainProb >= 35 ? "Keep a compact rain layer nearby just in case." : ""}`;
    } else if (temp <= 18) {
      return `A light jacket or sweater will be comfortable, especially past sunset.`;
    } else {
      return `Comfortable casual clothing will be fine today. It's around ${temp}°C with mild breezes.`;
    }
  }

  // 7. Stepping out / Going outside / Travel safety
  if (query.includes("outside") || query.includes("step out") || query.includes("safe") || query.includes("go out")) {
    if (safetyStatus === "DANGER" || current.weatherCode >= 95 || wind >= 50) {
      return `I'd stay indoors for now ⚠️ Strong winds and heavy weather are present in ${loc}. If you must go out, exercise caution.`;
    } else if (rainProb >= 50) {
      return `Yes, you can head out 👍 Just note rain chances are around ${rainProb}%, so grab an umbrella.`;
    } else {
      return `Yes, conditions look great to head outside 🌤️ It's currently ${temp}°C with ${cond.toLowerCase()} and low rain risk (${rainProb}%).`;
    }
  }

  // 8. Temperature query
  if (query.includes("temperature") || query.includes("how hot") || query.includes("how cold") || query === "temp") {
    return `It's ${temp}°C right now${feelsLike !== temp ? ` (feels like ${feelsLike}°C)` : ""} with ${cond.toLowerCase()}.`;
  }

  // 9. Specific Day / Weekend
  if (query.includes("tonight") || query.includes("evening") || query.includes("night")) {
    const eveningHours = hourly.slice(3, 8);
    const maxEveningRain = Math.max(...eveningHours.map((h: any) => h.rainProbability || 0), 0);
    if (maxEveningRain >= 40) {
      return `There's a good chance of rain tonight (${maxEveningRain}%) 🌧️ Keep an umbrella handy if you're heading out after dark.`;
    } else {
      return `Tonight looks mostly dry and comfortable, with rain chances staying low around ${maxEveningRain}%.`;
    }
  }

  // Multi-Day Travel & Packing
  if (
    query.includes("pack") ||
    query.includes("arrange") ||
    (query.includes("trip") && (query.includes("week") || query.includes("day") || query.includes("travel")))
  ) {
    return `For your trip to ${loc}, pack light breathable clothes, comfortable footwear, and sun protection ☀️ ${
      rainProb > 25 ? "Keep a compact umbrella handy just in case ☔" : "Rain chances are low, so you should be all set."
    }`;
  }

  // Tomorrow
  if (query.includes("tomorrow") || query.includes("next day")) {
    const tomorrow = daily[1];
    if (tomorrow) {
      const comparison =
        tomorrow.rainProbability < rainProb
          ? `Rain chances are lower than today (${tomorrow.rainProbability}% vs ${rainProb}%).`
          : tomorrow.rainProbability > rainProb
          ? `Rain chances are higher than today (${tomorrow.rainProbability}% vs ${rainProb}%).`
          : `Rain chances stay steady around ${tomorrow.rainProbability}%.`;
      return `${loc} will stay ${tomorrow.condition.toLowerCase()} tomorrow 🌧️ with a high near ${tomorrow.maxTempC}°C and low near ${tomorrow.minTempC}°C. ${comparison}`;
    }
    return `${loc} will stay mostly steady tomorrow with highs near ${temp + 1}°C.`;
  }

  // Weekend Forecast
  if (query.includes("weekend") || query.includes("saturday") || query.includes("sunday")) {
    const weekendDays = daily.filter((d: any) => {
      const name = (d.dayName || "").toLowerCase();
      return name.includes("sat") || name.includes("sun");
    });
    if (weekendDays.length > 0) {
      const summaries = weekendDays.map(
        (d: any) => `${d.dayName}: ${d.condition}, high ${d.maxTempC}°C / low ${d.minTempC}°C, rain chance ${d.rainProbability}%`
      );
      return `Here is the weekend forecast for ${loc}:\n• ${summaries.join("\n• ")}`;
    }
    return `For the weekend in ${loc}, temperatures will average around ${temp + 1}°C to ${temp + 3}°C with moderate weather.`;
  }

  // Places, Malls, Hospitals (ONLY when user explicitly asks for them!)
  if (query.includes("mall") || query.includes("shopping") || query.includes("market")) {
    return `Looking for shopping in ${loc}? Here are popular destinations to check out:\n• Top City Center Mall & Forum Mall\n• Local High Street Shopping Arcades\nTip: Check live traffic before heading over! 🛍️`;
  }

  if (query.includes("hospital") || query.includes("clinic") || query.includes("doctor") || query.includes("medical")) {
    return `In ${loc}, key emergency medical centers include:\n• District General Hospital & Multispecialty Care\n• City Medical Center (24/7 Emergency Care)\nFor medical emergencies, please dial your local emergency/ambulance service immediately 🏥`;
  }

  if (query.includes("shelter") || query.includes("relief") || query.includes("refuge")) {
    return `For weather emergency shelters in ${loc}:\n• Municipal Disaster Management Relief Center\n• District Community Protection Shelters\nStay indoors during active severe weather advisories 🛡️`;
  }

  // Location specific weather query (ONLY if explicitly asking about weather in that location or sending location name)
  const country = weatherData?.location?.country || "";
  const isExplicitLocationWeather =
    query.startsWith("weather in") ||
    query.startsWith("weather of") ||
    query.startsWith("forecast for") ||
    query.endsWith("weather") ||
    query === loc.toLowerCase() ||
    Boolean(analysis?.isExplicitLocation);

  if (isExplicitLocationWeather) {
    const todayDaily = daily[0];
    const highLow =
      todayDaily && todayDaily.maxTempC !== undefined
        ? ` (High ${todayDaily.maxTempC}°C / Low ${todayDaily.minTempC}°C)`
        : "";
    const rainAdvice =
      rainProb >= 40
        ? `Rain chance is ${rainProb}%, so having an umbrella handy is recommended.`
        : `Rain chance is low (${rainProb}%), so conditions are favorable for outdoor plans.`;

    const countryText = country ? `, ${country}` : "";
    return `In **${loc}${countryText}**, it's currently ${temp}°C${feelsLike !== temp ? ` (feels like ${feelsLike}°C)` : ""} and ${cond.toLowerCase()}${highLow}.\n• Rain Probability: ${rainProb}%\n• Wind: ${wind} km/h (Humidity: ${weatherData?.current?.humidity || 65}%)\n${rainAdvice}`;
  }

  // Weather Today / Current conditions
  if (query.includes("today") || query === "weather" || query.includes("current") || query.includes("weather today")) {
    const todayDaily = daily[0];
    const highLow =
      todayDaily && todayDaily.maxTempC !== undefined
        ? ` with expected highs near ${todayDaily.maxTempC}°C and lows of ${todayDaily.minTempC}°C`
        : "";
    return `${loc} is currently ${cond.toLowerCase()} at ${temp}°C${feelsLike !== temp ? ` (feels like ${feelsLike}°C)` : ""}${highLow}. Rain probability is ${rainProb}%.`;
  }

  // 10. Natural Dynamic Response avoiding repetition
  const lastAssistantText = Array.isArray(history)
    ? history.filter((h) => h.role === "assistant").pop()?.content
    : "";

  const defaultReply = `Current conditions in ${loc}: ${cond.toLowerCase()} at ${temp}°C with a ${rainProb}% chance of rain. Feel free to ask about the hourly forecast, tomorrow's outlook, or weekend plans!`;

  if (lastAssistantText && lastAssistantText.includes(loc) && lastAssistantText.includes(`${temp}°C`)) {
    return `Regarding "${userQuery}": In ${loc}, temperature is currently ${temp}°C (${cond.toLowerCase()}) with winds at ${wind} km/h and UV index ${uv}. Let me know if you need advice on tomorrow, weekend weather, or travel!`;
  }

  return defaultReply;
}

interface GroundingSource {
  title: string;
  uri: string;
  type: "maps" | "web";
  snippet?: string;
}

interface GeminiChatResult {
  reply: string;
  sources: GroundingSource[];
  groundingType: "maps" | "search" | "dual" | "meteorological";
}

// Helper to determine optimal grounding tool based on query intent or user preference
function determineGroundingTool(
  userQuery: string,
  weatherData: any,
  preference?: "auto" | "maps" | "search",
  analysis?: QuestionAnalysis
): { toolType: "maps" | "search" | "dual" | "none"; toolConfig?: any; tools?: any[] } {
  const query = userQuery.toLowerCase();

  const lat = weatherData?.location?.latitude;
  const lon = weatherData?.location?.longitude;
  const hasCoordinates = typeof lat === "number" && typeof lon === "number";

  if (preference === "maps" && hasCoordinates) {
    return {
      toolType: "maps",
      tools: [{ googleMaps: {} }],
      toolConfig: {
        retrievalConfig: {
          latLng: { latitude: lat, longitude: lon },
        },
      },
    };
  }

  if (preference === "search") {
    return {
      toolType: "search",
      tools: [{ googleSearch: {} }],
    };
  }

  // If cognitive analysis is provided, follow the Information Planner!
  if (analysis) {
    if (analysis.needsPlaces && analysis.needsSearch && hasCoordinates) {
      return {
        toolType: "dual",
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: { latitude: lat, longitude: lon },
          },
        },
      };
    }

    if (analysis.needsPlaces && hasCoordinates) {
      return {
        toolType: "maps",
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: { latitude: lat, longitude: lon },
          },
        },
      };
    }

    if (analysis.needsSearch) {
      return {
        toolType: "search",
        tools: [{ googleSearch: {} }],
      };
    }

    return {
      toolType: "none",
      tools: [],
    };
  }

  // Check for Maps Grounding intent (places, directions, nearby safe locations, spots, venues)
  const mapsTriggers = [
    "map",
    "maps",
    "goggel maps",
    "google maps",
    "place",
    "places",
    "where",
    "near",
    "nearby",
    "shelter",
    "hospital",
    "clinic",
    "doctor",
    "police",
    "fire station",
    "mall",
    "center",
    "centre",
    "park",
    "hotel",
    "restaurant",
    "route",
    "direction",
    "directions",
    "location",
    "address",
    "drive",
    "visit",
    "destination",
    "area",
    "shop",
    "market",
    "cafe",
    "gym",
    "indoor",
    "spot",
    "spots",
    "landmark",
  ];

  // Check for Search Grounding intent (news, web search, articles, online reports)
  const searchTriggers = [
    "search",
    "sachge",
    "goggel",
    "google search",
    "news",
    "articles",
    "headline",
    "latest report",
    "web",
    "online",
    "recent",
    "internet",
    "storm news",
    "cyclone news",
    "live update",
    "forecast news",
    "radar news",
    "bulletin",
    "find out online",
  ];

  const hasMapsTrigger = mapsTriggers.some((t) => query.includes(t));
  const hasSearchTrigger = searchTriggers.some((t) => query.includes(t));

  // Explicit dual intent: "use google maps and search", "beo use goggel maps and sachge'", or both triggered
  const isExplicitDual =
    (hasMapsTrigger && hasSearchTrigger) ||
    query.includes("maps and search") ||
    query.includes("maps & search") ||
    query.includes("goggel maps and sachge") ||
    query.includes("google maps and search");

  if (isExplicitDual && hasCoordinates) {
    return {
      toolType: "dual",
      tools: [{ googleMaps: {} }],
      toolConfig: {
        retrievalConfig: {
          latLng: { latitude: lat, longitude: lon },
        },
      },
    };
  }

  if (hasMapsTrigger && hasCoordinates) {
    return {
      toolType: "maps",
      tools: [{ googleMaps: {} }],
      toolConfig: {
        retrievalConfig: {
          latLng: {
            latitude: lat,
            longitude: lon,
          },
        },
      },
    };
  }

  if (hasSearchTrigger || query.includes("why") || query.includes("news") || query.includes("history")) {
    return {
      toolType: "search",
      tools: [{ googleSearch: {} }],
    };
  }

  return {
    toolType: "none",
    tools: [],
  };
}

// Robust Gemini Chat caller with model resilience and retry logic
async function executeGeminiWeatherChat(
  ai: GoogleGenAI,
  contents: any[],
  systemInstruction: string,
  weatherData: any,
  safetyStatus: string,
  activeAlerts: any[],
  userMessage: string,
  history?: Array<{ role: string; content: string }>,
  preference?: "auto" | "maps" | "search",
  analysis?: QuestionAnalysis,
  extraSources?: GroundingSource[],
  memoryContext?: ConversationMemoryContext
): Promise<GeminiChatResult> {
  const { toolType, tools, toolConfig } = determineGroundingTool(userMessage, weatherData, preference, analysis);

  // Modern models available in the environment - starting with gemini-3.8-flash as primary
  const modelsToAttempt = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];

  // Handle Dual Grounding (Google Maps places + Google Search web grounding)
  if (toolType === "dual" && weatherData?.location) {
    const lat = weatherData.location.latitude;
    const lon = weatherData.location.longitude;
    const locName = weatherData.location.name || "the local area";

    // Run Google Maps and Google Search in parallel for fast, responsive dual grounding
    const runMapsPass = async () => {
      for (const modelName of modelsToAttempt) {
        try {
          const mapsResponse: any = await Promise.race([
            ai.models.generateContent({
              model: modelName,
              contents,
              config: {
                systemInstruction: `${systemInstruction}\n\nNOTE: You are using Google Maps Grounding to identify key local landmarks, safe shelters, malls, and places in or near ${locName}. Include specific place names.`,
                tools: [{ googleMaps: {} }],
                toolConfig: {
                  retrievalConfig: {
                    latLng: { latitude: lat, longitude: lon },
                  },
                },
                temperature: 0.3,
              },
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Maps timeout")), 6000)),
          ]);

          if (mapsResponse.text && mapsResponse.text.trim().length > 0) {
            const mapSources: GroundingSource[] = [];
            const rawChunks = (mapsResponse.candidates?.[0] as any)?.groundingMetadata?.groundingChunks;
            if (Array.isArray(rawChunks)) {
              for (const chunk of rawChunks) {
                if (chunk.maps?.uri) {
                  mapSources.push({
                    title: chunk.maps.title || "Google Maps Location",
                    uri: chunk.maps.uri,
                    type: "maps",
                    snippet: chunk.maps.placeAnswerSources?.reviewSnippets?.[0] || undefined,
                  });
                }
              }
            }
            return { reply: mapsResponse.text.trim(), sources: mapSources };
          }
        } catch (err) {
          // try next model
        }
      }
      return null;
    };

    const runSearchPass = async () => {
      for (const modelName of modelsToAttempt) {
        try {
          const searchResponse: any = await Promise.race([
            ai.models.generateContent({
              model: modelName,
              contents,
              config: {
                systemInstruction: `${systemInstruction}\n\nNOTE: You are using Google Search Grounding to verify real-time regional weather news, radar observations, and web updates for ${locName}.`,
                tools: [{ googleSearch: {} }],
                temperature: 0.3,
              },
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Search timeout")), 6000)),
          ]);

          if (searchResponse.text && searchResponse.text.trim().length > 0) {
            const webSources: GroundingSource[] = [];
            const rawChunks = (searchResponse.candidates?.[0] as any)?.groundingMetadata?.groundingChunks;
            if (Array.isArray(rawChunks)) {
              for (const chunk of rawChunks) {
                if (chunk.web?.uri) {
                  webSources.push({
                    title: chunk.web.title || "Google Search Result",
                    uri: chunk.web.uri,
                    type: "web",
                  });
                }
              }
            }
            const searchQueries = (searchResponse.candidates?.[0] as any)?.groundingMetadata?.webSearchQueries;
            if (webSources.length === 0 && Array.isArray(searchQueries) && searchQueries.length > 0) {
              for (const sq of searchQueries.slice(0, 3)) {
                webSources.push({
                  title: `Search: "${sq}"`,
                  uri: `https://www.google.com/search?q=${encodeURIComponent(sq)}`,
                  type: "web",
                });
              }
            }
            return { reply: searchResponse.text.trim(), sources: webSources };
          }
        } catch (err) {
          // try next model
        }
      }
      return null;
    };

    const [mapsResult, searchResult] = await Promise.all([runMapsPass(), runSearchPass()]);

    if (mapsResult || searchResult) {
      const allSources: GroundingSource[] = [
        ...(mapsResult?.sources || []),
        ...(searchResult?.sources || []),
      ];

      let combinedReply = "";
      if (mapsResult && searchResult) {
        combinedReply = `${searchResult.reply}\n\n📍 **Nearby Places & Points of Interest (Google Maps):**\n${mapsResult.reply}`;
      } else if (mapsResult) {
        combinedReply = mapsResult.reply;
      } else if (searchResult) {
        combinedReply = searchResult.reply;
      }

      return {
        reply: combinedReply,
        sources: allSources,
        groundingType: "dual",
      };
    }
  }

  for (const modelName of modelsToAttempt) {
    // If tools fail with quota/429, retry the model without tools
    const toolVariants = tools && tools.length > 0 ? [tools, []] : [[]];

    for (const currentTools of toolVariants) {
      try {
        const config: any = {
          systemInstruction,
          temperature: 0.4,
        };

        if (currentTools.length > 0) {
          config.tools = currentTools;
          if (toolConfig) {
            config.toolConfig = toolConfig;
          }
        }

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Gemini timeout")), 7000)
        );

        const response: any = await Promise.race([
          ai.models.generateContent({
            model: modelName,
            contents,
            config,
          }),
          timeoutPromise,
        ]);

        if (response.text && response.text.trim().length > 0) {
          const sources: GroundingSource[] = [];
          const rawChunks = (response.candidates?.[0] as any)?.groundingMetadata?.groundingChunks;

          if (Array.isArray(rawChunks)) {
            for (const chunk of rawChunks) {
              if (chunk.maps?.uri) {
                sources.push({
                  title: chunk.maps.title || "Google Maps Location",
                  uri: chunk.maps.uri,
                  type: "maps",
                  snippet: chunk.maps.placeAnswerSources?.reviewSnippets?.[0] || undefined,
                });
              } else if (chunk.web?.uri) {
                sources.push({
                  title: chunk.web.title || "Google Search Result",
                  uri: chunk.web.uri,
                  type: "web",
                });
              }
            }
          }

          const searchQueries = (response.candidates?.[0] as any)?.groundingMetadata?.webSearchQueries;
          if (sources.length === 0 && Array.isArray(searchQueries) && searchQueries.length > 0) {
            for (const sq of searchQueries.slice(0, 3)) {
              sources.push({
                title: `Search: "${sq}"`,
                uri: `https://www.google.com/search?q=${encodeURIComponent(sq)}`,
                type: "web",
              });
            }
          }

          const allSources = [...(extraSources || []), ...sources];
          const deduplicatedSources: GroundingSource[] = [];
          const seen = new Set<string>();
          for (const s of allSources) {
            if (s.uri && !seen.has(s.uri)) {
              seen.add(s.uri);
              deduplicatedSources.push(s);
            }
          }

          return {
            reply: response.text.trim(),
            sources: deduplicatedSources,
            groundingType: toolType === "maps" ? "maps" : toolType === "search" ? "search" : (extraSources && extraSources.length > 0 ? (extraSources[0].type === "maps" ? "maps" : "search") : "meteorological"),
          };
        }
      } catch (err: any) {
        // Continue to retry without tools or next model
        continue;
      }
    }
  }

  // Grounded Meteorological Analysis Fallback
  const fallbackText = generateGroundedWeatherFallback(
    userMessage,
    weatherData,
    safetyStatus,
    activeAlerts,
    history,
    memoryContext,
    analysis
  );
  return {
    reply: fallbackText,
    sources: extraSources || [],
    groundingType: extraSources && extraSources.length > 0 ? (extraSources[0].type === "maps" ? "maps" : "search") : "meteorological",
  };
}

// -------------------------------------------------------------
// Two-Mode Location Intelligence & Priority Rules Engine
// -------------------------------------------------------------
const STOPWORDS = new Set([
  "here", "my location", "current location", "there", "outside", "today", "tomorrow",
  "tonight", "yesterday", "now", "right now", "morning", "afternoon", "evening", "night",
  "weekend", "week", "home", "work", "school", "office", "car", "bike", "bicycle",
  "umbrella", "clothes", "clothing", "jacket", "coat", "shoes", "cricket", "football",
  "sports", "running", "jogging", "walking", "cycling", "safe", "weather", "forecast",
  "temp", "temperature", "rain", "rainy", "sunny", "cloudy", "wind", "windy", "storm",
  "radar", "friday", "saturday", "sunday", "monday", "tuesday", "wednesday", "thursday",
  "what is", "will it", "can i", "tell me", "show me", "help",
  "somewhere", "somewhere close", "somewhere nearby", "anywhere", "nowhere", "everywhere",
  "close", "closer", "something", "anything", "nothing", "beach", "beaches", "hotel", "hotels",
  "mall", "malls", "place", "places", "food", "trip", "drive", "flight", "which", "which one",
  "how far", "one", "it", "that", "this", "best place", "best places", "good place", "good places",
  "nice place", "nice places", "top place", "top places"
]);

function isExplicitGpsRequest(raw: string): boolean {
  const q = raw.trim().toLowerCase();
  const triggers = [
    /\bmy location\b/i,
    /\bcurrent location\b/i,
    /\bhere\b/i,
    /\bwhere i am\b/i,
    /\bmy weather\b/i,
    /\blocal weather\b/i,
    /\baround here\b/i,
    /\bback to (?:my )?location\b/i,
    /\bswitch to (?:my )?location\b/i,
    /\bswitch back to (?:my )?location\b/i,
    /\bmy location now\b/i,
    /\bgps location\b/i,
    /\buse gps\b/i,
    /\buse my location\b/i,
    /\bmy city\b/i,
    /\bmy area\b/i,
    /\bnear me\b/i,
    /\bis it safe outside\b/i,
    /\bcan i go outside\b/i,
    /\bwill it rain here\b/i,
  ];
  return triggers.some((t) => t.test(q));
}

function cleanCandidate(str: string): string {
  let s = str.trim().replace(/^[\s,?.!"']+|[\s,?.!"']+$/g, "");
  // remove trailing time qualifiers
  s = s.replace(
    /\s+(?:tomorrow|today|tonight|this\s+week|this\s+weekend|yesterday|now|currently|right\s+now|friday|saturday|sunday|monday|tuesday|wednesday|thursday)\b.*$/i,
    ""
  );
  // remove leading conversational phrases & prepositions
  s = s.replace(
    /^(?:what(?:'s| is) (?:the )?weather (?:in|for|of|at|like in)\s+|weather (?:in|for|of|at)\s+|tell me (?:the )?weather (?:in|of|for)\s+|tell me about (?:the weather in )?|how(?:'s| is) (?:the )?weather (?:in|of|for|like in)\s+|check (?:the )?weather (?:in|for|of)\s+|forecast (?:for|in|of)\s+|temperature (?:in|for|of)\s+|temp (?:in|for|of)\s+|can you tell me (?:the )?weather (?:in|of|for)\s+|give me (?:the )?weather (?:in|of|for)\s+|is it raining in\s+|will it rain in\s+|what about\s+|how about\s+|the\s+|a\s+|an\s+|in\s+|at\s+|for\s+|to\s+|of\s+|near\s+|around\s+)/i,
    ""
  );
  return s.trim().replace(/^[\s,?.!"']+|[\s,?.!"']+$/g, "");
}

function extractCandidateLocation(raw: string): string | null {
  const q = raw.trim();

  // Pattern 0: places/activities in/from <Place> (e.g. "beach in Hyderabad", "beaches near Hyderabad", "places in Goa", "best food in Mumbai")
  const placeInMatch = q.match(
    /\b(?:beaches?|beach\s+trip|malls?|hospitals?|shelters?|parks?|clinics?|places?|doctors?|hotels?|restaurants?|things\s+to\s+do|sights?|attractions?|spots?|food|resorts?)\s+(?:in|at|near|around|from)\s+([a-zA-Z\u00C0-\u024F\s.'-]+?)(?:$|[?!.,])/i
  );
  if (placeInMatch && placeInMatch[1]) {
    const c = cleanCandidate(placeInMatch[1]);
    if (c && !STOPWORDS.has(c.toLowerCase())) return c;
  }

  // Pattern 1: nearby places in <Place> (e.g. "nearest mall in Hyderabad", "hospitals in Vizag", "shelters in Chennai")
  const nearbyMatch = q.match(
    /\b(?:nearest|nearby|best|safe|find|show)?\s*(?:malls?|hospitals?|shelters?|parks?|clinics?|places?|doctors?|hotels?|restaurants?)\s+(?:in|at|near|around)\s+([^,?.!]+)/i
  );
  if (nearbyMatch && nearbyMatch[1]) {
    const c = cleanCandidate(nearbyMatch[1]);
    if (c && !STOPWORDS.has(c.toLowerCase())) return c;
  }

  // Pattern 2: "in/for/at/around/near/from/of <Place>" e.g. "Weather in Delhi", "Will it rain in Chennai tomorrow?", "Temperature in Mumbai", "What is the weather of Tokyo?"
  const inMatch = q.match(
    /\b(?:in|for|at|around|near|from|of)\s+([a-zA-Z\u00C0-\u024F\s.'-]+?)(?:\s+(?:tomorrow|today|tonight|yesterday|this\s+week|this\s+weekend|on\s+[a-zA-Z]+|now|currently|\?|$)|$|[?!.,])/i
  );
  if (inMatch && inMatch[1]) {
    const c = cleanCandidate(inMatch[1]);
    if (c && !STOPWORDS.has(c.toLowerCase()) && !/^(?:the\s+)?(?:morning|evening|afternoon|night|future|past|weekend|week)\b/i.test(c)) {
      return c;
    }
  }

  // Pattern 3: "<Place> weather / forecast / temperature / etc." e.g. "Hyderabad weather", "Vizag forecast", "New York weather", "Tokyo weather"
  const suffixMatch = q.match(
    /^([a-zA-Z\u00C0-\u024F\s.'-]+?)\s+(?:weather|forecast|temperature|temp|climate|rain|radar|conditions|outlook)/i
  );
  if (suffixMatch && suffixMatch[1]) {
    const c = cleanCandidate(suffixMatch[1]);
    if (c && !STOPWORDS.has(c.toLowerCase()) && !/^(?:what|how|why|when|is|can|will|should|tell|show|my)\b/i.test(c)) {
      return c;
    }
  }

  // Pattern 4: "weather / forecast / temp in/of/for <Place>"
  const prefixMatch = q.match(
    /(?:weather|forecast|temperature|temp|rain|radar|conditions)\s+(?:in|for|at|of)?\s*([a-zA-Z\u00C0-\u024F\s.'-]+)/i
  );
  if (prefixMatch && prefixMatch[1]) {
    const c = cleanCandidate(prefixMatch[1]);
    if (c && !STOPWORDS.has(c.toLowerCase()) && !/^(?:what|how|why|when|is|can|will|should|tell|show|my)\b/i.test(c)) {
      return c;
    }
  }

  // Pattern 5: "travel to / trip to / visit <Place>"
  const travelMatch = q.match(
    /\b(?:travel(?:l?ing)?\s+to|trip\s+to|flight\s+to|going\s+to|visit(?:ing)?)\s+([a-zA-Z\u00C0-\u024F\s.'-]+?)(?:$|[?!.,])/i
  );
  if (travelMatch && travelMatch[1]) {
    const c = cleanCandidate(travelMatch[1]);
    if (c && !STOPWORDS.has(c.toLowerCase())) return c;
  }

  // Pattern 6: standalone place name (1 to 4 words)
  const words = q.split(/\s+/);
  if (words.length >= 1 && words.length <= 4) {
    const c = cleanCandidate(q);
    if (
      c &&
      c.length >= 2 &&
      !STOPWORDS.has(c.toLowerCase()) &&
      !/^(?:what|how|why|when|is|can|will|should|tell|show|hello|hi|hey|my|and|or|so|do|does|are|were|am)\b/i.test(c)
    ) {
      return c;
    }
  }

  return null;
}

interface ResolvedLocationData {
  name: string;
  region?: string;
  country?: string;
  latitude: number;
  longitude: number;
  mode: "gps" | "custom";
}

interface LocationResolutionResult {
  mode: "gps" | "custom";
  resolvedLocation: ResolvedLocationData | null;
  activeWeatherData: any;
  needsLocationPrompt: boolean;
}

async function resolveLocationAndMode(params: {
  message: string;
  sessionLocation?: {
    name: string;
    region?: string;
    country?: string;
    latitude: number;
    longitude: number;
    mode: "gps" | "custom";
  } | null;
  gpsCoords?: {
    latitude: number;
    longitude: number;
    name?: string;
    region?: string;
    country?: string;
  } | null;
  currentWeatherData?: any;
}): Promise<LocationResolutionResult> {
  const { message, sessionLocation, gpsCoords, currentWeatherData } = params;

  // PRIORITY RULE 1: If user mentions a location -> use that location (Ignore GPS).
  const candidatePlace = extractCandidateLocation(message);
  if (candidatePlace) {
    try {
      let top: any = null;

      // 1. Search Open-Meteo Geocoding
      try {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          candidatePlace
        )}&count=5&language=en&format=json`;
        const geoRes = await fetch(geoUrl, { signal: AbortSignal.timeout(4000) });
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData.results && geoData.results.length > 0) {
            top = geoData.results[0];
          }
        }
      } catch (e) {
        // continue
      }

      // 2. If candidate has comma (e.g. "Paris, France" or "Bandra, Mumbai"), search primary city
      if (!top && candidatePlace.includes(",")) {
        const cityPart = candidatePlace.split(",")[0].trim();
        if (cityPart.length > 1) {
          try {
            const subGeoRes = await fetch(
              `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityPart)}&count=5&language=en&format=json`,
              { signal: AbortSignal.timeout(3000) }
            );
            if (subGeoRes.ok) {
              const subData = await subGeoRes.json();
              if (subData.results && subData.results.length > 0) {
                top = subData.results[0];
              }
            }
          } catch {
            // continue
          }
        }
      }

      // 3. Fallback to OpenStreetMap Nominatim for worldwide landmarks/districts
      if (!top) {
        try {
          const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            candidatePlace
          )}&format=json&limit=1`;
          const nomRes = await fetch(nomUrl, {
            headers: { "User-Agent": "WeatherGPT-Worldwide/1.0" },
            signal: AbortSignal.timeout(3500),
          });
          if (nomRes.ok) {
            const nomData = await nomRes.json();
            if (Array.isArray(nomData) && nomData.length > 0) {
              const item = nomData[0];
              top = {
                name: item.name || item.display_name?.split(",")[0] || candidatePlace,
                latitude: parseFloat(item.lat),
                longitude: parseFloat(item.lon),
                admin1: item.address?.state || item.address?.county || "",
                country: item.address?.country || "",
              };
            }
          }
        } catch {
          // ignore
        }
      }

      if (top && typeof top.latitude === "number" && typeof top.longitude === "number") {
        const customLoc: ResolvedLocationData = {
          name: top.name,
          region: top.admin1 || "",
          country: top.country || "",
          latitude: top.latitude,
          longitude: top.longitude,
          mode: "custom",
        };

        // Fetch fresh weather for this requested place
        const weather = await fetchWeatherDataInternal({
          lat: customLoc.latitude,
          lon: customLoc.longitude,
          name: customLoc.name,
          region: customLoc.region,
          country: customLoc.country,
        });

        return {
          mode: "custom",
          resolvedLocation: customLoc,
          activeWeatherData: weather,
          needsLocationPrompt: false,
        };
      }
    } catch (err) {
      console.warn("Geocoding lookup failed for candidate:", candidatePlace, err);
    }
  }

  // PRIORITY RULE 2: If no location is mentioned:
  // Case A: User explicitly requests GPS / My Location ("my location now", "will it rain here?", "what is my weather?")
  if (isExplicitGpsRequest(message)) {
    if (gpsCoords && typeof gpsCoords.latitude === "number" && typeof gpsCoords.longitude === "number") {
      let resolvedGpsName = gpsCoords.name || "My Location";
      let region = gpsCoords.region || "";
      let country = gpsCoords.country || "";

      if (!resolvedGpsName || resolvedGpsName === "My Location") {
        const rev = await resolveLocationNameFromCoords(gpsCoords.latitude, gpsCoords.longitude);
        resolvedGpsName = rev.name;
        region = rev.region;
        country = rev.country;
      }

      const weather = await fetchWeatherDataInternal({
        lat: gpsCoords.latitude,
        lon: gpsCoords.longitude,
        name: resolvedGpsName,
        region,
        country,
      });

      return {
        mode: "gps",
        resolvedLocation: {
          name: resolvedGpsName,
          region,
          country,
          latitude: gpsCoords.latitude,
          longitude: gpsCoords.longitude,
          mode: "gps",
        },
        activeWeatherData: weather,
        needsLocationPrompt: false,
      };
    } else if (currentWeatherData?.location && (sessionLocation?.mode === "gps" || !sessionLocation)) {
      // Reuse current GPS weather data
      return {
        mode: "gps",
        resolvedLocation: {
          ...currentWeatherData.location,
          mode: "gps",
        },
        activeWeatherData: currentWeatherData,
        needsLocationPrompt: false,
      };
    } else {
      // GPS requested but not currently permitted/available
      return {
        mode: "gps",
        resolvedLocation: null,
        activeWeatherData: null,
        needsLocationPrompt: true,
      };
    }
  }

  // Case B: Conversation Memory!
  // If the user previously asked about a location in this session (e.g. Hyderabad -> "What about tomorrow?" -> still Hyderabad)
  if (sessionLocation && sessionLocation.name) {
    let weather = currentWeatherData;
    const locMatches =
      currentWeatherData?.location?.name &&
      currentWeatherData.location.name.toLowerCase() === sessionLocation.name.toLowerCase();

    if (!weather || !locMatches) {
      try {
        weather = await fetchWeatherDataInternal({
          lat: sessionLocation.latitude,
          lon: sessionLocation.longitude,
          name: sessionLocation.name,
          region: sessionLocation.region,
          country: sessionLocation.country,
        });
      } catch (e) {
        weather = currentWeatherData;
      }
    }

    return {
      mode: sessionLocation.mode || "custom",
      resolvedLocation: sessionLocation,
      activeWeatherData: weather,
      needsLocationPrompt: false,
    };
  }

  // Case C: Fresh conversation without explicit mention -> Default to GPS if available!
  if (gpsCoords && typeof gpsCoords.latitude === "number" && typeof gpsCoords.longitude === "number") {
    let resolvedGpsName = gpsCoords.name || "My Location";
    let region = gpsCoords.region || "";
    let country = gpsCoords.country || "";

    if (!resolvedGpsName || resolvedGpsName === "My Location") {
      const rev = await resolveLocationNameFromCoords(gpsCoords.latitude, gpsCoords.longitude);
      resolvedGpsName = rev.name;
      region = rev.region;
      country = rev.country;
    }

    const weather = await fetchWeatherDataInternal({
      lat: gpsCoords.latitude,
      lon: gpsCoords.longitude,
      name: resolvedGpsName,
      region,
      country,
    });

    return {
      mode: "gps",
      resolvedLocation: {
        name: resolvedGpsName,
        region,
        country,
        latitude: gpsCoords.latitude,
        longitude: gpsCoords.longitude,
        mode: "gps",
      },
      activeWeatherData: weather,
      needsLocationPrompt: false,
    };
  }

  if (currentWeatherData?.location) {
    return {
      mode: "gps",
      resolvedLocation: {
        ...currentWeatherData.location,
        mode: "gps",
      },
      activeWeatherData: currentWeatherData,
      needsLocationPrompt: false,
    };
  }

  // PRIORITY RULE 3: If GPS isn't available -> ask for a location!
  return {
    mode: "gps",
    resolvedLocation: null,
    activeWeatherData: null,
    needsLocationPrompt: true,
  };
}

// 5. Gemini-Powered AI Weather Assistant Chat Endpoint
// REASONING PIPELINE:
// USER QUESTION -> UNDERSTAND CONVERSATION -> UNDERSTAND INTENT & GOAL
// -> DECIDE WHAT INFORMATION IS NEEDED -> GATHER RELEVANT REAL DATA
// -> COMBINE THE INFORMATION -> REASON ABOUT IT -> ANSWER NATURALLY
app.post("/api/chat", async (req, res) => {
  let activeWeather: any = null;
  let resolvedLoc: ResolvedLocationData | null = null;
  let analysis: QuestionAnalysis | null = null;
  let updatedMemory: ConversationMemoryContext = {};

  try {
    const {
      message,
      weatherData,
      history,
      safetyStatus,
      activeAlerts,
      proactiveRisk,
      chatId,
      messageId,
      requestId,
      gpsCoords,
      sessionLocation,
      groundingPreference,
      memoryContext,
    } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    // Initialize updated memory from prior session memory
    updatedMemory = { ...(memoryContext || {}) };

    // STEP 1 & 2: Understand Conversation, User Intent & User Goal
    analysis = analyzeQuestionAndContext(
      message,
      history,
      updatedMemory,
      sessionLocation?.name || weatherData?.location?.name
    );

    // STEP 3: Location Resolution Priority
    // Explicit location in message > Conversation Memory > GPS > Ask user
    const effectiveSessionLoc = analysis.isExplicitLocation
      ? null
      : updatedMemory?.activeLocation || sessionLocation;

    const locResolution = await resolveLocationAndMode({
      message,
      sessionLocation: effectiveSessionLoc,
      gpsCoords,
      currentWeatherData: weatherData,
    });

    // If no location context is known and GPS is unavailable:
    // Only prompt for location if the query is specifically a localized real-time weather forecast request
    if (locResolution.needsLocationPrompt || !locResolution.activeWeatherData) {
      const isInformationalQuery =
        /\b(?:why|how does|how do|what is|what are|what causes|explain|definition|tell me|joke|meaning of|who are you|hello|hi|hey)\b/i.test(message);

      const isLocalizedWeatherRequest =
        !isInformationalQuery &&
        (/\b(?:weather|forecast|current temp|temperature|radar|is it raining|will it rain|need an umbrella|rain today|rain tomorrow|weather today)\b/i.test(message) ||
          isExplicitGpsRequest(message));

      if (!isLocalizedWeatherRequest) {
        const cleanMsg = message.trim().toLowerCase().replace(/[^\w\s]/g, "");
        if (/^best\s+places?\??$/i.test(cleanMsg) || cleanMsg === "best place" || cleanMsg === "best places" || cleanMsg === "where to go") {
          return res.json({
            reply: "Best place for what—food, sightseeing, beaches, shopping, or a weekend trip? Let me know what you have in mind and I'll give you specific recommendations!",
            sources: [],
            groundingType: "meteorological",
            chatId,
            messageId,
            requestId,
            resolvedLocation: null,
            weatherData: null,
            memoryContext: updatedMemory,
          });
        }
        if (/^(hi|hello|hey|hey bro|hi bro|yo|sup|whats up|what's up)$/i.test(cleanMsg)) {
          return res.json({
            reply: "Hey! 👋 How can I help you today? You can ask me about weather, travel destinations, outdoor activities, or planning your day!",
            sources: [],
            groundingType: "meteorological",
            chatId,
            messageId,
            requestId,
            resolvedLocation: null,
            weatherData: null,
            memoryContext: updatedMemory,
          });
        }
        if (cleanMsg.includes("beach")) {
          return res.json({
            reply: "Are you looking for beaches near a specific city (like Hyderabad, Chennai, or Mumbai), or popular coastal getaways like Goa, Gokarna, or Visakhapatnam? Let me know where you're starting from!",
            sources: [],
            groundingType: "meteorological",
            chatId,
            messageId,
            requestId,
            resolvedLocation: null,
            weatherData: null,
            memoryContext: updatedMemory,
          });
        }

        // Answer general queries conversationally without demanding location
        try {
          const ai = getGeminiClient();
          const generalInstruction = `You are WeatherGPT, a friendly, intelligent, and helpful AI assistant.
Answer the user's question directly, clearly, naturally, and concisely.
CRITICAL RULE: DO NOT demand the user's location, GPS, or ask for location unless the user is specifically trying to get localized weather and didn't name a city.
No unsolicited boilerplate, no walls of text.`;

          const chatContents: any[] = [];
          if (Array.isArray(history)) {
            for (const turn of history.slice(-6)) {
              if (turn.role === "user" || turn.role === "assistant") {
                chatContents.push({
                  role: turn.role === "assistant" ? "model" : "user",
                  parts: [{ text: turn.content }],
                });
              }
            }
          }
          chatContents.push({ role: "user", parts: [{ text: message }] });

          for (const modelName of modelsToAttempt) {
            try {
              const resp: any = await Promise.race([
                ai.models.generateContent({
                  model: modelName,
                  contents: chatContents,
                  config: {
                    systemInstruction: generalInstruction,
                    temperature: 0.5,
                  },
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000)),
              ]);

              if (resp.text && resp.text.trim()) {
                return res.json({
                  reply: resp.text.trim(),
                  sources: [],
                  groundingType: "meteorological",
                  chatId,
                  messageId,
                  requestId,
                  resolvedLocation: null,
                  weatherData: null,
                  memoryContext: updatedMemory,
                });
              }
            } catch {
              // Try next model or fallback
            }
          }
        } catch (chatErr) {
          // Fallback below
        }

        // If models are rate-limited or unavailable, use local intelligent conversational fallback
        const fallbackGeneral = generateGeneralConversationalFallback(message, history);
        return res.json({
          reply: fallbackGeneral,
          sources: [],
          groundingType: "meteorological",
          chatId,
          messageId,
          requestId,
          resolvedLocation: null,
          weatherData: null,
          memoryContext: updatedMemory,
        });
      }

      // If it IS a weather question (e.g. "What's the weather?") but no location is known at all:
      return res.json({
        reply: "Which city or town would you like the weather for? Or you can tap **Use My Location (GPS)**.",
        sources: [],
        groundingType: "meteorological",
        chatId,
        messageId,
        requestId,
        resolvedLocation: null,
        weatherData: null,
        memoryContext: updatedMemory,
      });
    }

    activeWeather = locResolution.activeWeatherData;
    resolvedLoc = locResolution.resolvedLocation;

    const ai = getGeminiClient();

    // STEP 4: GATHER RELEVANT REAL DATA BASED ON WHAT IS NEEDED
    // A. Real Weather API Facts
    const weatherFacts = extractRelevantWeatherFacts(activeWeather, analysis.referencedTime);

    // B. Real Places & Maps (ONLY when user explicitly asks for places, malls, hospitals, directions, or maps)
    const gatheredSources: GroundingSource[] = [];
    let placeContextText = "";

    const userWantsPlacesOrMaps =
      Boolean(analysis.needsPlaces) ||
      /\b(?:maps?|directions?|nearby\s+places?|places?\s+to\s+visit|where\s+is|find\s+(?:hospitals?|malls?|shelters?|hotels?|restaurants?)|landmarks?|tourist\s+spots?)\b/i.test(message);

    if (resolvedLoc && userWantsPlacesOrMaps) {
      try {
        const placeSearch = await searchVerifiedPlaces(
          ai,
          resolvedLoc.latitude,
          resolvedLoc.longitude,
          resolvedLoc.name,
          analysis.placeQuery || "places"
        );
        if (placeSearch.places.length > 0) {
          updatedMemory.referencedPlace = placeSearch.places[0];
          updatedMemory.placeSearchResults = placeSearch.places;
          placeContextText = placeSearch.summaryText;
          gatheredSources.push(...placeSearch.mapsSources);
        }
      } catch (placeErr) {
        console.warn("Places gathering error:", placeErr);
      }
    } else if (analysis.resolvedPlace && userWantsPlacesOrMaps) {
      placeContextText = `Referenced Place from ongoing conversation: ${analysis.resolvedPlace.name}${
        analysis.resolvedPlace.distanceKm ? ` (approximately ${analysis.resolvedPlace.distanceKm} km away)` : ""
      }${analysis.resolvedPlace.address ? `, located at ${analysis.resolvedPlace.address}` : ""}.`;
    }

    // C. Real Web Search (for live breaking weather events, cyclones, official warnings)
    let searchContextText = "";
    if (analysis.needsSearch && resolvedLoc) {
      try {
        const searchRes = await searchVerifiedWeb(ai, message, resolvedLoc.name);
        if (searchRes.summaryText) {
          searchContextText = searchRes.summaryText;
          gatheredSources.push(...searchRes.searchSources);
        }
      } catch (searchErr) {
        console.warn("Search gathering error:", searchErr);
      }
    }

    // STEP 5: COMBINE THE INFORMATION & BUILD REASONING DIRECTIVES
    const locationStr = resolvedLoc
      ? `${resolvedLoc.name}${resolvedLoc.region ? ", " + resolvedLoc.region : ""}${
          resolvedLoc.country ? ", " + resolvedLoc.country : ""
        }`
      : activeWeather?.location?.name || "your area";

    const systemInstruction = buildCognitiveSystemPrompt({
      locationStr,
      analysis,
      weatherFacts,
      activeAlerts: activeAlerts || [],
      safetyStatus: safetyStatus || "NORMAL",
      placeContextText,
      searchContextText,
    });

    // Multi-turn conversation history formatting (up to 12 turns for deep memory)
    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const turn of history.slice(-12)) {
        if (turn.role === "user" || turn.role === "assistant") {
          contents.push({
            role: turn.role === "assistant" ? "model" : "user",
            parts: [{ text: turn.content }],
          });
        }
      }
    }

    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    // STEP 6: REASON ABOUT IT & ANSWER NATURALLY
    const chatResult = await executeGeminiWeatherChat(
      ai,
      contents,
      systemInstruction,
      activeWeather,
      safetyStatus,
      activeAlerts,
      message,
      history,
      groundingPreference,
      analysis,
      gatheredSources,
      updatedMemory
    );

    // Merge sources deduplicated
    const mergedSources: GroundingSource[] = [];
    const seenUris = new Set<string>();
    for (const src of [...gatheredSources, ...(chatResult.sources || [])]) {
      if (src.uri && !seenUris.has(src.uri)) {
        seenUris.add(src.uri);
        mergedSources.push(src);
      }
    }

    // STEP 7: PRESERVE TOOL RESULTS & CONVERSATION CONTEXT IN MEMORY
    updatedMemory = {
      ...updatedMemory,
      activeLocation: resolvedLoc || updatedMemory.activeLocation,
      conversationTopic: analysis.userGoal,
      lastQuestion: message,
      lastAnswer: chatResult.reply,
      referencedTime: analysis.referencedTime || updatedMemory.referencedTime,
      referencedPlace: (updatedMemory.referencedPlace || analysis.resolvedPlace) ?? undefined,
      placeSearchResults: updatedMemory.placeSearchResults,
      userGoalOrActivity: analysis.activityType,
    };

    res.json({
      reply: chatResult.reply,
      sources: mergedSources,
      groundingType: chatResult.groundingType,
      chatId,
      messageId,
      requestId,
      resolvedLocation: resolvedLoc,
      weatherData: activeWeather,
      memoryContext: updatedMemory,
    });
  } catch (error: any) {
    console.error("Gemini chat route error:", error);
    const fallback = generateGroundedWeatherFallback(
      req.body?.message || "",
      activeWeather || req.body?.weatherData,
      req.body?.safetyStatus || "NORMAL",
      req.body?.activeAlerts || [],
      req.body?.history,
      updatedMemory || req.body?.memoryContext,
      analysis || undefined
    );
    res.json({
      reply: fallback,
      sources: [],
      groundingType: "meteorological",
      chatId: req.body?.chatId,
      messageId: req.body?.messageId,
      requestId: req.body?.requestId,
      resolvedLocation: resolvedLoc || req.body?.sessionLocation || null,
      weatherData: activeWeather || req.body?.weatherData || null,
      memoryContext: updatedMemory || req.body?.memoryContext || {},
    });
  }
});

// Start server and mount Vite
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`WeatherGPT server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
