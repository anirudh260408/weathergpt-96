import React, { useState } from "react";
import {
  Calendar,
  Clock,
  Droplets,
  Wind,
  Sun,
  CloudRain,
  Compass,
} from "lucide-react";
import { WeatherData, TemperatureUnit, Theme } from "../types/weather";
import { formatTemp } from "../utils/wmoCodes";

interface ForecastViewProps {
  weatherData: WeatherData;
  unit: TemperatureUnit;
  onAskAI: (prompt: string) => void;
  theme?: Theme;
}

export const ForecastView: React.FC<ForecastViewProps> = ({
  weatherData,
  unit,
  onAskAI,
  theme = "dark",
}) => {
  const isDark = theme === "dark";
  const [forecastTab, setForecastTab] = useState<"hourly" | "daily">("hourly");
  const { hourly, daily, location } = weatherData;

  return (
    <div id="forecast-view" className="space-y-6 animate-fade-in">
      {/* Header & Sub-navigation Tab Switcher */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 ${
          isDark ? "border-slate-800" : "border-slate-200"
        }`}
      >
        <div>
          <h2
            className={`text-xl font-black tracking-tight flex items-center gap-2 ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            <Calendar className={`h-5 w-5 ${isDark ? "text-cyan-400" : "text-indigo-500"}`} />
            <span>Meteorological Forecasts</span>
          </h2>
          <p className={`text-xs font-medium mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Real sensor-backed forecasts for {location.name}, {location.region || location.country}
          </p>
        </div>

        {/* Tab Buttons */}
        <div
          className={`flex items-center rounded-xl p-1 text-xs font-semibold ${
            isDark ? "bg-slate-900 border border-slate-800 text-slate-400" : "bg-slate-100 text-slate-600"
          }`}
        >
          <button
            onClick={() => setForecastTab("hourly")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
              forecastTab === "hourly"
                ? isDark
                  ? "bg-[#0c1427] text-cyan-400 font-bold shadow-xs border border-cyan-500/20"
                  : "bg-white text-indigo-600 shadow-xs font-bold"
                : isDark
                ? "hover:text-white"
                : "hover:text-slate-900"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>24-Hour Forecast</span>
          </button>
          <button
            onClick={() => setForecastTab("daily")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
              forecastTab === "daily"
                ? isDark
                  ? "bg-[#0c1427] text-cyan-400 font-bold shadow-xs border border-cyan-500/20"
                  : "bg-white text-indigo-600 shadow-xs font-bold"
                : isDark
                ? "hover:text-white"
                : "hover:text-slate-900"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>7-Day Outlook</span>
          </button>
        </div>
      </div>

      {/* Hourly Forecast Tab */}
      {forecastTab === "hourly" && (
        <div className="space-y-4">
          <div className={`flex items-center justify-between text-xs px-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            <span>Next 24 Hours Progression</span>
            <span>Probability of Precipitation (%)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {hourly.map((item, idx) => (
              <div
                key={idx}
                className={`flex flex-col justify-between rounded-xl border p-3.5 shadow-2xs transition ${
                  isDark
                    ? "border-slate-800 bg-[#0c1427]/90 hover:border-cyan-500/40 text-slate-100"
                    : "border-slate-200/80 bg-white hover:border-indigo-300 text-slate-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isDark ? "text-slate-200" : "text-slate-700"}`}>{item.hour}</span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {idx === 0 ? "Now" : `+${idx}h`}
                  </span>
                </div>

                <div className="my-3 flex items-center justify-center">
                  <span className="text-3xl">
                    {item.category === "rain" || item.category === "drizzle"
                      ? "🌧️"
                      : item.category === "thunderstorm"
                      ? "⛈️"
                      : item.category === "snow"
                      ? "❄️"
                      : item.category === "cloudy"
                      ? "⛅"
                      : "☀️"}
                  </span>
                </div>

                <div className="space-y-1.5 text-center">
                  <div className={`text-base font-extrabold ${isDark ? "text-white" : "text-slate-900"}`}>
                    {formatTemp(item.tempC, unit)}
                  </div>
                  <div className={`text-[11px] font-medium truncate ${isDark ? "text-slate-300" : "text-slate-500"}`}>
                    {item.condition}
                  </div>

                  {/* Rain Probability Bar */}
                  <div className="pt-1">
                    <div className={`flex items-center justify-between text-[10px] font-semibold mb-0.5 ${isDark ? "text-cyan-400" : "text-sky-600"}`}>
                      <span className="flex items-center gap-0.5">
                        <Droplets className="h-2.5 w-2.5" /> Rain
                      </span>
                      <span>{item.rainProbability}%</span>
                    </div>
                    <div className={`h-1.5 w-full overflow-hidden rounded-full ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
                      <div
                        className="h-full rounded-full bg-sky-500 transition-all"
                        style={{ width: `${Math.min(100, item.rainProbability)}%` }}
                      />
                    </div>
                  </div>

                  {/* Wind speed indicator */}
                  <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 pt-1">
                    <Wind className="h-2.5 w-2.5" />
                    <span>{item.windSpeedKmh} km/h</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Forecast Tab */}
      {forecastTab === "daily" && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2.5">
            {daily.map((day, idx) => (
              <div
                key={idx}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-4 shadow-2xs transition ${
                  isDark
                    ? "border-slate-800 bg-[#0c1427]/90 hover:border-cyan-500/40"
                    : "border-slate-200/80 bg-white hover:border-indigo-300"
                }`}
              >
                {/* Day name & date */}
                <div className="flex items-center gap-3 sm:w-48">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-2xl ${
                    isDark ? "bg-slate-900 border border-slate-800" : "bg-slate-100"
                  }`}>
                    {day.category === "rain" || day.category === "drizzle"
                      ? "🌧️"
                      : day.category === "thunderstorm"
                      ? "⛈️"
                      : day.category === "snow"
                      ? "❄️"
                      : day.category === "cloudy"
                      ? "⛅"
                      : "☀️"}
                  </div>
                  <div>
                    <h4 className={`text-sm font-extrabold ${isDark ? "text-white" : "text-slate-900"}`}>{day.dayName}</h4>
                    <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>{day.dateFormatted}</p>
                  </div>
                </div>

                {/* Condition */}
                <div className="sm:w-48">
                  <span className={`text-xs font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>{day.condition}</span>
                  <div className={`flex items-center gap-2 text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    <span className={`font-medium flex items-center gap-0.5 ${isDark ? "text-cyan-400" : "text-sky-600"}`}>
                      <CloudRain className="h-3 w-3" /> {day.rainProbability}% rain
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      <Wind className="h-3 w-3" /> {day.windSpeedKmh} km/h
                    </span>
                  </div>
                </div>

                {/* Temperature Range Bar */}
                <div className="flex items-center gap-3 sm:w-64">
                  <span className={`text-xs font-semibold w-12 text-right ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {formatTemp(day.minTempC, unit)}
                  </span>
                  <div className={`relative h-2 flex-1 overflow-hidden rounded-full ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
                    <div
                      className="absolute h-full rounded-full bg-gradient-to-r from-sky-400 via-amber-400 to-rose-400"
                      style={{
                        left: `${Math.max(0, ((day.minTempC - 10) / 35) * 100)}%`,
                        right: `${Math.max(0, 100 - ((day.maxTempC - 10) / 35) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className={`text-xs font-bold w-12 text-left ${isDark ? "text-white" : "text-slate-900"}`}>
                    {formatTemp(day.maxTempC, unit)}
                  </span>
                </div>

                {/* Ask AI shortcut for this day */}
                <button
                  onClick={() =>
                    onAskAI(
                      `What should I plan for ${day.dayName} (${day.dateFormatted}) in ${location.name}? It is forecast to be ${day.condition} with High ${day.maxTempC}°C, Low ${day.minTempC}°C, and ${day.rainProbability}% rain probability.`
                    )
                  }
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition shrink-0 ${
                    isDark
                      ? "text-cyan-300 bg-cyan-950/40 hover:bg-cyan-950/70"
                      : "text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
                  }`}
                >
                  Plan with AI
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
