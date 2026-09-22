import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Building2,
  Navigation,
  Phone,
  ExternalLink,
  MapPin,
  RefreshCw,
  Info,
  Flame,
  Shield,
  HeartPulse,
  Share2,
  Check,
} from "lucide-react";
import { NearbyPlace, WeatherData, Theme } from "../types/weather";
import { shareWeatherAlert } from "../utils/shareUtils";

interface NearbyAssistanceProps {
  weatherData: WeatherData;
  onAskAI: (prompt: string) => void;
  theme?: Theme;
}

export const NearbyAssistance: React.FC<NearbyAssistanceProps> = ({
  weatherData,
  onAskAI,
  theme = "dark",
}) => {
  const isDark = theme === "dark";
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const fetchNearby = async () => {
    setLoading(true);
    setError(null);
    try {
      const { latitude, longitude, name } = weatherData.location;
      const res = await fetch(
        `/api/nearby-places?lat=${latitude}&lon=${longitude}&city=${encodeURIComponent(name)}`
      );
      if (!res.ok) throw new Error("Failed to load nearby assistance locations");
      const data = await res.json();
      setPlaces(data.places || []);
    } catch (err: any) {
      console.error("Error fetching nearby places:", err);
      setError("Unable to retrieve nearby assistance locations for these coordinates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNearby();
  }, [weatherData.location.latitude, weatherData.location.longitude]);

  const handleShareAssistance = async (place?: NearbyPlace) => {
    let title = `⚠️ Weather Assistance & Shelter Info: ${weatherData.location.name}`;
    let text = "";

    if (place) {
      text = `🏥 Nearby Emergency / Shelter Facility:\n${place.name} (${place.category})\n📍 Address: ${place.address}\n📏 Distance: ${place.distanceKm} km\n${place.phone ? `📞 Phone: ${place.phone}\n` : ""}🗺️ Map: ${place.mapsUrl}\n\nWeather in ${weatherData.location.name}: ${weatherData.current.tempC}°C, Wind ${weatherData.current.windSpeedKmh} km/h, Rain ${weatherData.current.rainProbability}%.`;
    } else {
      const topPlaces = places.slice(0, 3).map((p, idx) => `${idx + 1}. ${p.name} (${p.category}) - ${p.distanceKm}km away`).join("\n");
      text = `🚨 Emergency assistance & shelter locations near ${weatherData.location.name}:\n\n${topPlaces}\n\nCurrent Weather: ${weatherData.current.tempC}°C, ${weatherData.current.condition}.\nStay safe and seek shelter if needed.`;
    }

    const res = await shareWeatherAlert({
      title,
      text,
      locationName: weatherData.location.name,
      url: place?.mapsUrl || window.location.href,
    });

    if (res.success) {
      setShareFeedback(place ? `Shared ${place.name}` : (res.method === "clipboard" ? "Copied to Clipboard!" : "Shared!"));
      setTimeout(() => setShareFeedback(null), 3000);
    }
  };

  const filteredPlaces =
    filterCategory === "all"
      ? places
      : places.filter((p) => {
          if (filterCategory === "medical") return p.type === "hospital";
          if (filterCategory === "police") return p.type === "police";
          if (filterCategory === "fire") return p.type === "fire_station";
          if (filterCategory === "indoor") return p.type === "indoor" || p.type === "mall" || p.type === "shelter";
          return true;
        });

  return (
    <div id="nearby-assistance-view" className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 ${isDark ? "border-slate-800" : "border-slate-200"}`}>
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-rose-500" />
            <h2 className={`text-xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
              Nearby Assistance & Indoor Safety Locations
            </h2>
          </div>
          <p className={`text-xs font-medium mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Emergency stations, medical facilities, and large sheltered public locations near {weatherData.location.name}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Share Alert & Safe Locations Button */}
          <button
            id="nearby-share-all-btn"
            onClick={() => handleShareAssistance()}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold active:scale-95 transition ${
              isDark
                ? "border-rose-500/40 bg-rose-950/40 text-rose-200 hover:bg-rose-900/50"
                : "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100"
            }`}
            title="Share safety alert and shelter facilities via Web Share"
          >
            {shareFeedback && !shareFeedback.startsWith("Shared ") ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-bold">{shareFeedback}</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5 text-rose-400" />
                <span>Share Safety Info</span>
              </>
            )}
          </button>

          <button
            onClick={fetchNearby}
            disabled={loading}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold active:scale-95 disabled:opacity-60 transition ${
              isDark
                ? "border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Crucial Verification Notice */}
      <div className={`flex items-start gap-3 rounded-xl border p-4 text-xs leading-relaxed shadow-xs ${
        isDark
          ? "border-amber-500/30 bg-amber-950/30 text-amber-200"
          : "border-amber-200/80 bg-amber-50/70 text-amber-900"
      }`}>
        <Info className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
        <div>
          <strong>Important Safety Notice:</strong> The facilities listed below are verified public service, medical, emergency, or indoor public buildings. They are designated as <em>"Nearby assistance locations"</em> or <em>"Nearby indoor public locations"</em> and are not certified storm bunkers unless explicitly identified by civil defense authorities. During severe meteorological hazards, always prioritize immediate personal safety and follow official local disaster directives.
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "all", label: "All Facilities" },
          { id: "medical", label: "Hospitals & Medical" },
          { id: "police", label: "Police Stations" },
          { id: "fire", label: "Fire & Rescue" },
          { id: "indoor", label: "Covered Indoor Malls & Public Halls" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilterCategory(f.id)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              filterCategory === f.id
                ? "bg-sky-600 text-white shadow-xs"
                : isDark
                ? "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Location Cards */}
      {loading ? (
        <div className={`py-12 text-center ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          <RefreshCw className="mx-auto h-6 w-6 animate-spin text-cyan-400 mb-2" />
          <p className="text-sm font-medium">Scanning nearby GPS coordinates for facilities...</p>
        </div>
      ) : error ? (
        <div className={`rounded-xl border p-6 text-center ${
          isDark ? "border-rose-900/50 bg-rose-950/30 text-rose-300" : "border-rose-200 bg-rose-50 text-rose-800"
        }`}>
          <p className="text-sm font-bold">{error}</p>
          <button
            onClick={fetchNearby}
            className="mt-3 rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white"
          >
            Retry
          </button>
        </div>
      ) : filteredPlaces.length === 0 ? (
        <div className={`rounded-xl border p-8 text-center ${
          isDark ? "border-slate-800 bg-[#0c1427]/90 text-slate-400" : "border-slate-200 bg-white text-slate-500"
        }`}>
          <Building2 className="mx-auto h-8 w-8 text-slate-500 mb-2" />
          <p className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-700"}`}>No specific locations in this category</p>
          <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Try selecting "All Facilities" or searching a larger city.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPlaces.map((place) => (
            <div
              key={place.id}
              className={`flex flex-col justify-between rounded-xl border p-4 shadow-2xs transition ${
                isDark
                  ? "border-slate-800 bg-[#0c1427]/90 hover:border-cyan-500/40 text-slate-100"
                  : "border-slate-200 bg-white hover:border-sky-300"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      isDark ? "bg-slate-900 border border-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"
                    }`}>
                      {place.type === "hospital" ? (
                        <HeartPulse className="h-4 w-4 text-rose-500" />
                      ) : place.type === "police" ? (
                        <Shield className="h-4 w-4 text-blue-400" />
                      ) : place.type === "fire_station" ? (
                        <Flame className="h-4 w-4 text-amber-400" />
                      ) : (
                        <Building2 className="h-4 w-4 text-indigo-400" />
                      )}
                    </span>
                    <div>
                      <h4 className={`text-sm font-extrabold leading-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                        {place.name}
                      </h4>
                      <span className={`text-[11px] font-semibold ${isDark ? "text-cyan-400" : "text-sky-700"}`}>
                        {place.category}
                      </span>
                    </div>
                  </div>

                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"
                  }`}>
                    {place.distanceKm} km away
                  </span>
                </div>

                <div className={`mt-3 space-y-1.5 text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{place.address}</span>
                  </div>

                  {place.phone && (
                    <div className={`flex items-center gap-1.5 font-medium ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                      <Phone className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span>{place.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation Action Buttons */}
              <div className={`mt-4 flex items-center justify-between border-t pt-3 ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      onAskAI(
                        `How should I safely reach or seek assistance at ${place.name} located at ${place.address} given current conditions?`
                      )
                    }
                    className={`text-xs font-semibold hover:underline ${isDark ? "text-cyan-400 hover:text-cyan-300" : "text-sky-600 hover:text-sky-700"}`}
                  >
                    Ask AI Route
                  </button>

                  <button
                    onClick={() => handleShareAssistance(place)}
                    className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold border transition ${
                      isDark
                        ? "border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300"
                        : "border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                    title="Share this facility via Web Share"
                  >
                    <Share2 className="h-3 w-3" />
                    <span>Share</span>
                  </button>
                </div>

                <a
                  href={place.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-sky-700 active:scale-95"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  <span>Navigate</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
