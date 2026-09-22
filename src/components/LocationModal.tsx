import React, { useState } from "react";
import {
  X,
  MapPin,
  Compass,
  Search,
  AlertCircle,
  Check,
  Navigation,
  Loader2,
} from "lucide-react";
import { Theme } from "../types/weather";
import { reverseGeocodeCoordinates, formatLocationName } from "../utils/locationService";

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCoordinates: (lat: number, lon: number, name?: string, region?: string, country?: string) => Promise<void>;
  onSelectCity: (city: string) => Promise<void>;
  currentLocationName: string;
  theme?: Theme;
}

export const LocationModal: React.FC<LocationModalProps> = ({
  isOpen,
  onClose,
  onSelectCoordinates,
  onSelectCity,
  currentLocationName,
  theme = "dark",
}) => {
  const isDark = theme === "dark";
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsStatusText, setGpsStatusText] = useState<string>("📍 Finding your location...");
  const [gpsError, setGpsError] = useState<string | null>(null);

  if (!isOpen) return null;

  // 1. Browser GPS Geolocation with Reverse Geocoding
  const handleUseMyLocation = () => {
    setGpsError(null);

    if (!("geolocation" in navigator)) {
      setGpsError("Your browser or device does not support GPS Geolocation.");
      return;
    }

    setIsDetectingGps(true);
    setGpsStatusText("📍 Finding your location...");

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    };

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setGpsStatusText("📍 Resolving address & weather...");

          const loc = await reverseGeocodeCoordinates(lat, lon);
          const formatted = formatLocationName(
            { name: loc.name, region: loc.region, country: loc.country },
            "standard"
          );

          await onSelectCoordinates(lat, lon, formatted || loc.name, loc.region, loc.country);
          setIsDetectingGps(false);
          onClose();
        } catch (err: any) {
          setIsDetectingGps(false);
          setGpsError("Failed to retrieve weather for your detected coordinates. Please try manual search.");
        }
      },
      (error) => {
        setIsDetectingGps(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGpsError("Location permission was denied. You can search your city manually below.");
            break;
          case error.POSITION_UNAVAILABLE:
            setGpsError("GPS position is currently unavailable. Please search your city manually.");
            break;
          case error.TIMEOUT:
            setGpsError("GPS location request timed out. Please try again or search manually.");
            break;
          default:
            setGpsError("Unable to acquire GPS coordinates. Please search manually.");
            break;
        }
      },
      options
    );
  };

  // 2. City Geocoding Search (Section 3)
  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setGpsError(null);

    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/geocode?query=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch (e) {
      console.error("Geocoding search failed:", e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = async (item: any) => {
    try {
      const formatted = formatLocationName(
        { name: item.name, region: item.region, country: item.country },
        "standard"
      );
      await onSelectCoordinates(
        item.latitude,
        item.longitude,
        formatted || item.name,
        item.region,
        item.country
      );
      onClose();
    } catch (err: any) {
      setGpsError("Failed to load weather for this location.");
    }
  };

  const handleSelectPopularCity = async (cityName: string) => {
    try {
      await onSelectCity(cityName);
      onClose();
    } catch (err: any) {
      setGpsError(`Could not find weather data for ${cityName}.`);
    }
  };

  // Preset popular locations (e.g. Vijayawada, Hyderabad, Bengaluru, New York)
  const popularCities = [
    "Vijayawada, Andhra Pradesh, India",
    "Hyderabad, Telangana, India",
    "Bengaluru, Karnataka, India",
    "New Delhi, India",
    "Mumbai, Maharashtra, India",
    "Chennai, Tamil Nadu, India",
    "London, UK",
    "New York, NY, USA",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-fade-in">
      <div
        className={`relative w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl border transition-colors ${
          isDark
            ? "bg-[#0c1427] border-slate-800 text-slate-100 shadow-cyan-950/20"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between border-b px-6 py-4 ${
            isDark ? "border-slate-800" : "border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                isDark ? "bg-sky-500/20 text-cyan-300" : "bg-sky-100 text-sky-600"
              }`}
            >
              <MapPin className="h-4 w-4" />
            </span>
            <div>
              <h3 className={`text-base font-extrabold ${isDark ? "text-white" : "text-slate-900"}`}>
                Change Weather Location
              </h3>
              <p className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Current: <strong className={isDark ? "text-cyan-300" : "text-slate-700"}>{currentLocationName}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
              isDark
                ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            }`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* GPS Button (Section 2) */}
          <div>
            <button
              id="use-my-gps-btn"
              onClick={handleUseMyLocation}
              disabled={isDetectingGps}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 py-3 px-4 text-sm font-bold text-white shadow-md shadow-sky-500/20 transition hover:from-sky-600 hover:to-blue-700 active:scale-[0.99] disabled:opacity-60"
            >
              {isDetectingGps ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{gpsStatusText}</span>
                </>
              ) : (
                <>
                  <Navigation className="h-4 w-4" />
                  <span>Use My Current GPS Location</span>
                </>
              )}
            </button>

            {gpsError && (
              <div
                className={`mt-2.5 flex items-start gap-2 rounded-xl border p-3 text-xs ${
                  isDark
                    ? "border-amber-500/40 bg-amber-950/40 text-amber-200"
                    : "border-amber-200 bg-amber-50 text-amber-900"
                }`}
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                <span>{gpsError}</span>
              </div>
            )}
          </div>

          <div className="relative flex items-center justify-center">
            <div className={`w-full border-t ${isDark ? "border-slate-800" : "border-slate-200"}`} />
            <span
              className={`absolute px-3 text-[11px] font-bold uppercase tracking-wider ${
                isDark ? "bg-[#0c1427] text-slate-500" : "bg-white text-slate-400"
              }`}
            >
              Or search manually
            </span>
          </div>

          {/* Search Input (Section 3) */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search city, district, or region..."
              className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm transition focus:outline-none ${
                isDark
                  ? "border-slate-750 bg-[#070b14] text-white placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                  : "border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100"
              }`}
            />
            {isSearching && (
              <Loader2 className="absolute right-3.5 top-3 h-4 w-4 animate-spin text-cyan-400" />
            )}
          </div>

          {/* Search Results List */}
          {searchResults.length > 0 && (
            <div
              className={`max-h-48 overflow-y-auto rounded-xl border divide-y shadow-inner ${
                isDark
                  ? "border-slate-800 divide-slate-800/80 bg-[#070b14]"
                  : "border-slate-200 divide-slate-100 bg-white"
              }`}
            >
              {searchResults.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectResult(item)}
                  className={`flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs font-medium transition ${
                    isDark
                      ? "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                      : "text-slate-700 hover:bg-sky-50 hover:text-sky-900"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                    <span>
                      <strong className={isDark ? "text-white" : "text-slate-900"}>{item.name}</strong>
                      {item.region ? `, ${item.region}` : ""} ({item.country})
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Quick Select Popular Cities */}
          <div>
            <span
              className={`text-[11px] font-bold uppercase tracking-wider block mb-2 ${
                isDark ? "text-slate-400" : "text-slate-400"
              }`}
            >
              Popular Locations
            </span>
            <div className="flex flex-wrap gap-1.5">
              {popularCities.map((city) => (
                <button
                  key={city}
                  onClick={() => handleSelectPopularCity(city)}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                    isDark
                      ? "border-slate-750 bg-slate-800/80 text-slate-200 hover:border-cyan-400 hover:text-white"
                      : "border-slate-200 bg-slate-50/80 text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-900"
                  }`}
                >
                  {city.split(",")[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`flex justify-end border-t px-6 py-3 ${
            isDark ? "border-slate-800 bg-[#090f1e]" : "border-slate-200 bg-slate-50"
          }`}
        >
          <button
            onClick={onClose}
            className={`rounded-lg border px-4 py-1.5 text-xs font-bold transition ${
              isDark
                ? "border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
