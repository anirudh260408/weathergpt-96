import React from "react";
import {
  TrendingUp,
  Sparkles,
  History,
  ArrowRight,
} from "lucide-react";
import {
  WeatherData,
  WeatherStatus,
  WeatherDelta,
  TemperatureUnit,
  WeatherAlert,
  Theme,
} from "../types/weather";
import { HeroWeather } from "./HeroWeather";
import { CompactForecast } from "./CompactForecast";

interface WeatherDashboardProps {
  weatherData: WeatherData;
  weatherStatus: WeatherStatus;
  weatherDelta: WeatherDelta;
  unit: TemperatureUnit;
  onAskAI: (prompt: string) => void;
  onOpenLocationModal: () => void;
  onViewForecast: () => void;
  onViewRetrospective?: () => void;
  onViewNearby: () => void;
  activeAlerts?: WeatherAlert[];
  theme?: Theme;
}

export const WeatherDashboard: React.FC<WeatherDashboardProps> = ({
  weatherData,
  weatherStatus,
  weatherDelta,
  unit,
  onAskAI,
  onOpenLocationModal,
  onViewForecast,
  onViewRetrospective,
  activeAlerts = [],
  theme = "dark",
}) => {
  const isDark = theme === "dark";

  return (
    <div id="weather-dashboard" className="space-y-6 animate-fade-in w-full">
      {/* 1. Dynamic Weather Shift Banner (Only when a real shift occurs) */}
      {weatherDelta.hasChange && (
        <div
          id="weather-delta-banner"
          className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border p-4 transition-all ${
            isDark
              ? "border-amber-500/40 bg-amber-950/30 text-amber-200"
              : "border-sky-200 bg-sky-50/90 text-sky-950 shadow-xs"
          }`}
        >
          <div className="flex items-start gap-3">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                isDark ? "bg-amber-500/20 text-amber-300" : "bg-sky-500 text-white"
              }`}
            >
              <TrendingUp className="h-4 w-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-amber-300" : "text-sky-800"}`}>
                  Weather Telemetry Update
                </h4>
              </div>
              <p className={`text-sm font-semibold mt-0.5 ${isDark ? "text-white" : "text-slate-800"}`}>
                {weatherDelta.message}
              </p>
            </div>
          </div>

          <button
            onClick={() => onAskAI("Explain this recent weather update and what precautions I should take.")}
            className="shrink-0 flex items-center gap-1.5 rounded-xl bg-sky-500 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-sky-600 active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Consult AI</span>
          </button>
        </div>
      )}

      {/* 2. Primary Hero Weather Section */}
      <HeroWeather
        weatherData={weatherData}
        unit={unit}
        theme={theme}
        onOpenLocationModal={onOpenLocationModal}
        activeAlerts={activeAlerts}
      />

      {/* 2.5 Quick Retrospective Summary Card */}
      {onViewRetrospective && (
        <div
          id="dashboard-retrospective-cta"
          onClick={onViewRetrospective}
          className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border p-4 cursor-pointer transition hover:scale-[1.005] active:scale-[0.995] ${
            isDark
              ? "bg-[#0b1224] border-slate-800 hover:border-sky-500/50 hover:bg-slate-800/70"
              : "bg-white border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 shadow-xs"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isDark ? "bg-amber-500/15 text-amber-400" : "bg-amber-100 text-amber-700"}`}>
              <History className="h-5 w-5" />
            </div>
            <div>
              <h4 className={`text-sm font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-slate-900"}`}>
                7-Day Retrospective Weather Summary
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                  d3.js Visualized
                </span>
              </h4>
              <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Explore temperature trends, weekly averages, and rainfall patterns observed at {weatherData.location.name}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs font-bold text-sky-400 self-end sm:self-center shrink-0">
            <span>View 7-Day Line Chart</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      )}

      {/* 3. Compact Hourly & 5-Day Forecast */}
      <CompactForecast
        hourly={weatherData.hourly}
        daily={weatherData.daily}
        unit={unit}
        theme={theme}
      />
    </div>
  );
};
