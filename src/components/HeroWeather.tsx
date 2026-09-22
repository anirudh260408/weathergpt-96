import React from "react";
import { MapPin, ArrowUpRight, AlertTriangle, Droplets, Wind, CloudRain, Sun, Cloud, CloudLightning, Snowflake } from "lucide-react";
import { WeatherData, TemperatureUnit, Theme, WeatherAlert } from "../types/weather";
import { getSingleContextualStatus, getHumanAlertSummary } from "../utils/weatherEngine";

interface HeroWeatherProps {
  weatherData: WeatherData;
  unit: TemperatureUnit;
  theme?: Theme;
  onOpenLocationModal: () => void;
  activeAlerts: WeatherAlert[];
}

export const HeroWeather: React.FC<HeroWeatherProps> = ({
  weatherData,
  unit,
  theme = "dark",
  onOpenLocationModal,
  activeAlerts,
}) => {
  const isDark = theme === "dark";
  const { current, location } = weatherData;

  const tempDisplay = unit === "C" ? Math.round(current.tempC) : Math.round(current.tempF);
  const feelsLikeDisplay = unit === "C" ? Math.round(current.feelsLikeC) : Math.round(current.feelsLikeF);

  const contextualStatus = getSingleContextualStatus(weatherData);
  const humanAlert = getHumanAlertSummary(activeAlerts, weatherData);

  // Formatted date (e.g. "Tuesday, 21 September")
  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Render weather icon based on code
  const renderWeatherArt = () => {
    const code = current.weatherCode;
    if ([95, 96, 99].includes(code)) {
      return (
        <div className="relative flex h-20 w-20 sm:h-28 sm:w-28 shrink-0 items-center justify-center rounded-2xl sm:rounded-3xl bg-violet-500/10 text-violet-400 border border-violet-500/20 shadow-lg shadow-violet-500/10">
          <CloudLightning className="h-10 w-10 sm:h-16 sm:w-16 animate-pulse" />
        </div>
      );
    }
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code) || current.rainProbability >= 60) {
      return (
        <div className="relative flex h-20 w-20 sm:h-28 sm:w-28 shrink-0 items-center justify-center rounded-2xl sm:rounded-3xl bg-sky-500/10 text-cyan-400 border border-sky-500/20 shadow-lg shadow-sky-500/10">
          <CloudRain className="h-10 w-10 sm:h-16 sm:w-16 animate-bounce" />
        </div>
      );
    }
    if ([71, 73, 75, 77, 85, 86].includes(code)) {
      return (
        <div className="relative flex h-20 w-20 sm:h-28 sm:w-28 shrink-0 items-center justify-center rounded-2xl sm:rounded-3xl bg-blue-500/10 text-blue-300 border border-blue-500/20">
          <Snowflake className="h-10 w-10 sm:h-16 sm:w-16" />
        </div>
      );
    }
    if ([1, 2, 3, 45, 48].includes(code)) {
      return (
        <div className="relative flex h-20 w-20 sm:h-28 sm:w-28 shrink-0 items-center justify-center rounded-2xl sm:rounded-3xl bg-slate-500/10 text-slate-300 border border-slate-500/20">
          <Cloud className="h-10 w-10 sm:h-16 sm:w-16" />
        </div>
      );
    }
    return (
      <div className="relative flex h-20 w-20 sm:h-28 sm:w-28 shrink-0 items-center justify-center rounded-2xl sm:rounded-3xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-lg shadow-amber-500/10">
        <Sun className="h-10 w-10 sm:h-16 sm:w-16 animate-[spin_24s_linear_infinite]" />
      </div>
    );
  };

  return (
    <section id="hero-weather-section" className="w-full flex flex-col gap-4 sm:gap-5">
      {/* Location & Date Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onOpenLocationModal}
          className="group flex items-center gap-2 text-left focus:outline-hidden"
          title="Change location"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400 group-hover:bg-sky-500/25 transition">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className={`text-base sm:text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                {location.name}
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
            </div>
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {formattedDate}
            </p>
          </div>
        </button>

        {/* Minimalist Day / Night indicator */}
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
          isDark ? "bg-slate-800/80 border-slate-700/80 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-600"
        }`}>
          {current.isDay ? "Daytime" : "Nighttime"}
        </span>
      </div>

      {/* Hero Temperature & Condition Block */}
      <div className={`relative overflow-hidden rounded-3xl border p-5 sm:p-8 backdrop-blur-md transition-all ${
        isDark
          ? "bg-slate-900/60 border-slate-800/80 text-white shadow-2xl shadow-black/20"
          : "bg-white/80 border-slate-200/80 text-slate-900 shadow-xl shadow-slate-200/50"
      }`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col min-w-0">
            {/* Primary Massive Temperature */}
            <div className="flex items-baseline">
              <span className="text-6xl sm:text-8xl font-extrabold tracking-tighter tabular-nums leading-none">
                {tempDisplay}
              </span>
              <span className="text-2xl sm:text-4xl font-light text-slate-400 ml-1">
                °{unit}
              </span>
            </div>

            {/* Condition & Feels like */}
            <div className="mt-2 sm:mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-lg sm:text-2xl font-bold tracking-tight">
                {current.condition}
              </span>
              <span className={`text-xs sm:text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                • Feels like {feelsLikeDisplay}°{unit}
              </span>
            </div>
          </div>

          {/* Condition Illustration Art */}
          <div className="flex shrink-0 items-center justify-end">
            {renderWeatherArt()}
          </div>
        </div>

        {/* Clean Inline Atmospheric Stats */}
        <div className={`mt-4 pt-4 border-t flex items-center gap-2.5 sm:gap-4 text-xs sm:text-sm font-medium flex-wrap ${
          isDark ? "border-slate-800/60 text-slate-300" : "border-slate-100 text-slate-600"
        }`}>
          <span className="inline-flex items-center gap-1.5">
            <Droplets className="h-4 w-4 text-sky-400 shrink-0" />
            <span>Humidity {current.humidity}%</span>
          </span>
          <span className="text-slate-500 hidden xs:inline">•</span>
          <span className="inline-flex items-center gap-1.5">
            <Wind className="h-4 w-4 text-teal-400 shrink-0" />
            <span>Wind {Math.round(current.windSpeedKmh)} km/h</span>
          </span>
          <span className="text-slate-500 hidden xs:inline">•</span>
          <span className="inline-flex items-center gap-1.5">
            <CloudRain className="h-4 w-4 text-cyan-400 shrink-0" />
            <span>Rain {current.rainProbability}%</span>
          </span>
        </div>

        {/* ONE Simple Contextual Status Sentence */}
        <div className={`mt-3.5 pt-3.5 border-t text-xs sm:text-sm font-medium flex items-center gap-2 ${
          isDark ? "border-slate-800/60 text-slate-300" : "border-slate-100 text-slate-700"
        }`}>
          <span className="flex h-2 w-2 shrink-0 rounded-full bg-cyan-400 animate-pulse" />
          <span className="leading-snug">{contextualStatus}</span>
        </div>
      </div>

      {/* Human Alert (Only displayed when there is a meaningful condition) */}
      {humanAlert && (
        <div className={`flex items-start gap-3.5 rounded-2xl border p-4 transition-all ${
          humanAlert.type === "danger"
            ? isDark
              ? "bg-rose-950/40 border-rose-500/40 text-rose-200"
              : "bg-rose-50 border-rose-200 text-rose-800"
            : humanAlert.type === "heat"
            ? isDark
              ? "bg-amber-950/40 border-amber-500/40 text-amber-200"
              : "bg-amber-50 border-amber-200 text-amber-800"
            : isDark
            ? "bg-sky-950/40 border-sky-500/40 text-sky-200"
            : "bg-sky-50 border-sky-200 text-sky-800"
        }`}>
          <span className="text-xl leading-none">{humanAlert.icon}</span>
          <div className="flex-1">
            <h4 className="text-xs font-bold uppercase tracking-wider mb-0.5">
              {humanAlert.headline}
            </h4>
            <p className="text-xs sm:text-sm font-normal leading-relaxed opacity-95">
              {humanAlert.message}
            </p>
          </div>
        </div>
      )}
    </section>
  );
};
