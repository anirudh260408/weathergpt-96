import { LocationData } from "../types/weather";

/**
 * Standardized Location Interface across WeatherGPT.
 */
export interface StandardLocation {
  latitude: number;
  longitude: number;
  name: string; // e.g. "Vijayawada", "Manhattan", "Hyderabad"
  district?: string; // e.g. "Krishna District"
  region: string; // e.g. "Andhra Pradesh", "New York"
  country: string; // e.g. "India", "USA"
  formattedName: string; // e.g. "Vijayawada, Andhra Pradesh" or "New York, NY"
  fullAddress?: string; // e.g. "Vijayawada, Andhra Pradesh, India"
  timezone?: string;
}

/**
 * Format a location object or constituent parts into standard human-readable display string.
 * Standard format: "City, State" (or "City, Country" if state is not available)
 * Detailed format: "City, State, Country"
 */
export function formatLocationName(
  loc: {
    name?: string;
    city?: string;
    district?: string;
    region?: string;
    state?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  },
  style: "standard" | "detailed" | "short" = "standard"
): string {
  const city = (loc.name || loc.city || "").trim();
  const region = (loc.region || loc.state || "").trim();
  const country = (loc.country || "").trim();

  // If city is a raw coordinate string like "16.31°, 80.44°" or "16.3067, 80.4365", handle gracefully
  const isRawCoordinateString =
    /^-?\d+(\.\d+)?°?,\s*-?\d+(\.\d+)?°?$/.test(city) ||
    (city.includes(",") && !isNaN(Number(city.split(",")[0])) && !isNaN(Number(city.split(",")[1])));

  if (!city || isRawCoordinateString) {
    if (region && country) {
      return style === "detailed" ? `${region}, ${country}` : region;
    }
    if (region) return region;
    if (country) return country;
    return "Location detected";
  }

  if (style === "short") {
    return city;
  }

  if (style === "detailed") {
    const parts = [city];
    if (region && region.toLowerCase() !== city.toLowerCase()) parts.push(region);
    if (country) parts.push(country);
    return parts.join(", ");
  }

  // Standard style: "City, State" (or "City, Country" if state not available)
  if (region && region.toLowerCase() !== city.toLowerCase()) {
    return `${city}, ${region}`;
  } else if (country && country.toLowerCase() !== city.toLowerCase()) {
    return `${city}, ${country}`;
  }

  return city;
}

/**
 * Parses reverse geocode JSON or Open-Meteo geocode result into a StandardLocation
 */
export function buildStandardLocation(
  data: {
    latitude: number;
    longitude: number;
    name?: string;
    city?: string;
    district?: string;
    region?: string;
    state?: string;
    country?: string;
    timezone?: string;
  }
): StandardLocation {
  const city = data.name || data.city || "Location detected";
  const region = data.region || data.state || "";
  const country = data.country || "";
  const district = data.district || "";

  const standardFormatted = formatLocationName(
    { name: city, region, country },
    "standard"
  );
  const fullFormatted = formatLocationName(
    { name: city, region, country },
    "detailed"
  );

  return {
    latitude: data.latitude,
    longitude: data.longitude,
    name: city,
    district,
    region,
    country,
    formattedName: standardFormatted,
    fullAddress: fullFormatted,
    timezone: data.timezone || "auto",
  };
}

/**
 * Reverse geocode GPS coordinates with multi-tier resilience:
 * 1. Backend `/api/reverse-geocode?lat=X&lon=Y` (OpenStreetMap / BigDataCloud)
 * 2. Client-side BigDataCloud reverse geocode fallback
 * 3. Client-side OpenStreetMap Nominatim fallback
 * 4. Fallback default without displaying raw coordinates
 */
export async function reverseGeocodeCoordinates(
  lat: number,
  lon: number
): Promise<StandardLocation> {
  // 1. Try Backend reverse geocoding API
  try {
    const res = await fetch(`/api/reverse-geocode?lat=${lat}&lon=${lon}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.name && !data.name.includes("°") && !/^-?\d+(\.\d+)?,/.test(data.name)) {
        return buildStandardLocation({
          latitude: lat,
          longitude: lon,
          name: data.name,
          region: data.region || "",
          country: data.country || "",
          district: data.district || "",
        });
      }
    }
  } catch (err) {
    console.warn("Backend reverse geocode request failed, trying client reverse geocoding...", err);
  }

  // 2. Try BigDataCloud Client Free Reverse Geocoding API
  try {
    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const bdcRes = await fetch(bdcUrl, { signal: AbortSignal.timeout(4000) });
    if (bdcRes.ok) {
      const bdcData = await bdcRes.json();
      const city =
        bdcData.city ||
        bdcData.locality ||
        bdcData.principalSubdivision ||
        bdcData.localityInfo?.administrative?.[2]?.name ||
        bdcData.localityInfo?.administrative?.[1]?.name;
      const region = bdcData.principalSubdivision || "";
      const country = bdcData.countryName || "";

      if (city) {
        return buildStandardLocation({
          latitude: lat,
          longitude: lon,
          name: city,
          region,
          country,
        });
      }
    }
  } catch (err) {
    console.warn("BigDataCloud client reverse geocode failed, trying Nominatim...", err);
  }

  // 3. Try OpenStreetMap Nominatim Client Fallback
  try {
    const nomUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=14`;
    const nomRes = await fetch(nomUrl, {
      headers: {
        "Accept-Language": "en",
      },
      signal: AbortSignal.timeout(4000),
    });
    if (nomRes.ok) {
      const nomData = await nomRes.json();
      const addr = nomData.address || {};
      const city =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.municipality ||
        addr.suburb ||
        addr.county ||
        nomData.name;
      const region = addr.state || addr.region || "";
      const country = addr.country || "";

      if (city) {
        return buildStandardLocation({
          latitude: lat,
          longitude: lon,
          name: city,
          region,
          country,
        });
      }
    }
  } catch (err) {
    console.warn("Nominatim client reverse geocode failed...", err);
  }

  // 4. Graceful Fallback (Never show raw coordinates)
  return buildStandardLocation({
    latitude: lat,
    longitude: lon,
    name: "Location detected",
    region: "",
    country: "",
  });
}
