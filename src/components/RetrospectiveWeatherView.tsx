import React, { useState, useEffect } from "react";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Activity,
  Thermometer,
  CloudRain,
  MapPin,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Sun,
  ShieldCheck,
  Compass,
  AlertCircle,
  Wind,
  Droplets,
  Layers,
} from "lucide-react";
import {
  RetrospectiveSummary,
  RetrospectiveDay,
  TemperatureUnit,
  Theme,
  GPSState,
} from "../types/weather";
import { D3RetrospectiveChart } from "./D3RetrospectiveChart";
import { fetchRetrospectiveWeather } from "../utils/weatherEngine";

interface RetrospectiveWeatherViewProps {
  locationName: string;
  latitude?: number;
  longitude?: number;
  unit: TemperatureUnit;
  gpsState?: GPSState;
  onAskAI: (prompt: string) => void;
  onOpenLocationModal: () => void;
  theme?: Theme;
}

export const RetrospectiveWeatherView: React.FC<RetrospectiveWeatherViewProps> = ({
  locationName,
  latitude,
  longitude,
  unit,
  gpsState,
  onAskAI,
  onOpenLocationModal,
  theme = "dark",
}) => {
  const [data, setData] = useState<RetrospectiveSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<RetrospectiveDay | null>(null);
  const isDark = theme === "dark";

  const loadRetrospectiveData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchRetrospectiveWeather({
        lat: latitude,
        lon: longitude,
        city: locationName,
        name: locationName,
      });
      setData(res.data);
      if (res.data.days && res.data.days.length > 0) {
        setSelectedDay(res.data.days[res.data.days.length - 1]);
      }
    } catch (err: any) {
      console.error("Failed to load retrospective weather:", err);
      setError("Unable to load 7-day retrospective telemetry. Showing cached baseline.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRetrospectiveData();
  }, [locationName, latitude, longitude]);

  const stats = data?.stats;
  const days = data?.days || [];

  const getTrendBadge = () => {
    if (!stats) return null;
    switch (stats.tempTrend) {
      case "warming":
        return {
          label: "Warming Pattern",
          icon: <TrendingUp className="h-4 w-4 text-amber-400" />,
          color: isDark ? "bg-amber-950/40 text-amber-300 border-amber-500/30" : "bg-amber-50 text-amber-800 border-amber-200",
        };
      case "cooling":
        return {
          label: "Cooling Pattern",
          icon: <TrendingDown className="h-4 w-4 text-cyan-400" />,
          color: isDark ? "bg-cyan-950/40 text-cyan-300 border-cyan-500/30" : "bg-cyan-50 text-cyan-800 border-cyan-200",
        };
      case "fluctuating":
        return {
          label: "Variable / Fluctuating",
          icon: <Activity className="h-4 w-4 text-indigo-400" />,
          color: isDark ? "bg-indigo-950/40 text-indigo-300 border-indigo-500/30" : "bg-indigo-50 text-indigo-800 border-indigo-200",
        };
      default:
        return {
          label: "Stable Temperature",
          icon: <Activity className="h-4 w-4 text-emerald-400" />,
          color: isDark ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30" : "bg-emerald-50 text-emerald-800 border-emerald-200",
        };
    }
  };

  const trendBadge = getTrendBadge();

  return (
    <div id="retrospective-weather-view" className="space-y-6 animate-fade-in w-full pb-10">
      {/* 1. Header Banner with GPS Location & Overview */}
      <div
        id="retro-header-card"
        className={`relative overflow-hidden rounded-3xl border p-5 sm:p-6 transition-all ${
          isDark
            ? "bg-gradient-to-br from-[#0c1328] via-[#090e1e] to-[#060a15] border-slate-800 shadow-xl"
            : "bg-gradient-to-br from-white via-sky-50/50 to-blue-50/40 border-slate-200 shadow-sm"
        }`}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                isDark ? "bg-sky-500/15 border-sky-500/30 text-cyan-300" : "bg-sky-100 border-sky-200 text-sky-800"
              }`}>
                <Calendar className="h-3.5 w-3.5" />
                7-Day Retrospective Telemetry
              </span>

              {gpsState?.coords && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  isDark ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-800"
                }`}>
                  <MapPin className="h-3 w-3 text-emerald-400" />
                  Live GPS Verified
                </span>
              )}

              {trendBadge && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${trendBadge.color}`}>
                  {trendBadge.icon}
                  {trendBadge.label}
                </span>
              )}
            </div>

            <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
              Past 7 Days Weather History: {data?.location?.name || locationName}
            </h2>

            <p className={`text-xs sm:text-sm max-w-2xl leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              {stats?.trendDescription || "Observed meteorological measurements and temperature dynamics recorded over the last 7 calendar days."}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            <button
              id="retro-change-loc-btn"
              onClick={onOpenLocationModal}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${
                isDark
                  ? "bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200"
                  : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-xs"
              }`}
            >
              <MapPin className="h-3.5 w-3.5 text-sky-400" />
              <span>Location</span>
            </button>

            <button
              id="retro-refresh-btn"
              onClick={loadRetrospectiveData}
              disabled={isLoading}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${
                isDark
                  ? "bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200"
                  : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-xs"
              }`}
              title="Refresh retrospective telemetry"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-cyan-400 ${isLoading ? "animate-spin" : ""}`} />
              <span>{isLoading ? "Fetching..." : "Refresh"}</span>
            </button>

            <button
              id="retro-ask-ai-summary-btn"
              onClick={() =>
                onAskAI(
                  `Analyze the 7-day retrospective weather pattern for ${locationName}: past average was ${
                    unit === "C" ? stats?.averageTempC : stats?.averageTempF
                  }°${unit} with a ${stats?.tempTrend} trend. What does this mean for outdoor plans and upcoming conditions?`
                )
              }
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-sky-500 to-cyan-400 text-white shadow-sm shadow-sky-500/25 hover:brightness-110 active:scale-95 transition"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Analyze with AI</span>
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl mb-3 shadow-inner ${
            isDark ? "bg-slate-800 text-cyan-400 border border-slate-700" : "bg-sky-100 text-sky-600"
          }`}>
            <RefreshCw className="h-7 w-7 animate-spin" />
          </div>
          <h3 className={`text-base font-bold ${isDark ? "text-slate-100" : "text-slate-800"}`}>
            Loading 7-Day Atmospheric History
          </h3>
          <p className={`text-xs mt-1 max-w-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Aggregating observed daily temperatures, precipitation sums, and wind patterns for {locationName}...
          </p>
        </div>
      ) : error && !data ? (
        <div className={`p-6 rounded-2xl border text-center ${
          isDark ? "bg-rose-950/20 border-rose-500/30 text-rose-300" : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-rose-400" />
          <p className="font-semibold text-sm">{error}</p>
          <button
            onClick={loadRetrospectiveData}
            className="mt-3 px-4 py-1.5 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-600"
          >
            Retry Fetch
          </button>
        </div>
      ) : data ? (
        <>
          {/* 2. Bento Grid: 4 Core Retrospective KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: 7-Day Average Temperature */}
            <div
              id="kpi-avg-temp"
              className={`rounded-2xl border p-4.5 transition ${
                isDark ? "bg-[#0b1224] border-slate-800/90" : "bg-white border-slate-200 shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">7-Day Mean Temp</span>
                <span className={`p-2 rounded-xl ${isDark ? "bg-sky-500/15 text-sky-400" : "bg-sky-100 text-sky-700"}`}>
                  <Thermometer className="h-4 w-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl sm:text-3xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>
                  {unit === "C" ? stats?.averageTempC : stats?.averageTempF}°{unit}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  (Avg High {unit === "C" ? stats?.averageMaxTempC : stats?.highestMaxTempF}° / Low {unit === "C" ? stats?.averageMinTempC : stats?.lowestMinTempF}°)
                </span>
              </div>
              <p className={`text-xs mt-2 font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {stats?.todayVsAverageDiffC && stats.todayVsAverageDiffC > 0
                  ? `+${stats.todayVsAverageDiffC}°C warmer than today`
                  : stats?.todayVsAverageDiffC && stats.todayVsAverageDiffC < 0
                  ? `${stats.todayVsAverageDiffC}°C cooler than today`
                  : "Matches current baseline average"}
              </p>
            </div>

            {/* KPI 2: Week Warmest Peak */}
            <div
              id="kpi-peak-high"
              className={`rounded-2xl border p-4.5 transition ${
                isDark ? "bg-[#0b1224] border-slate-800/90" : "bg-white border-slate-200 shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Warmest Peak</span>
                <span className={`p-2 rounded-xl ${isDark ? "bg-amber-500/15 text-amber-400" : "bg-amber-100 text-amber-700"}`}>
                  <Sun className="h-4 w-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl sm:text-3xl font-black ${isDark ? "text-amber-400" : "text-amber-600"}`}>
                  {unit === "C" ? stats?.highestMaxTempC : stats?.highestMaxTempF}°{unit}
                </span>
                <span className="text-xs font-bold text-amber-500/80 flex items-center">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Peak High
                </span>
              </div>
              <p className={`text-xs mt-2 font-medium truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Observed on {stats?.highestDayName || "Past week"}
              </p>
            </div>

            {/* KPI 3: Week Coolest Low */}
            <div
              id="kpi-peak-low"
              className={`rounded-2xl border p-4.5 transition ${
                isDark ? "bg-[#0b1224] border-slate-800/90" : "bg-white border-slate-200 shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Coolest Night</span>
                <span className={`p-2 rounded-xl ${isDark ? "bg-cyan-500/15 text-cyan-400" : "bg-cyan-100 text-cyan-700"}`}>
                  <Droplets className="h-4 w-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl sm:text-3xl font-black ${isDark ? "text-cyan-400" : "text-cyan-600"}`}>
                  {unit === "C" ? stats?.lowestMinTempC : stats?.lowestMinTempF}°{unit}
                </span>
                <span className="text-xs font-bold text-cyan-500/80 flex items-center">
                  <ArrowDownRight className="h-3.5 w-3.5" />
                  Lowest Low
                </span>
              </div>
              <p className={`text-xs mt-2 font-medium truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Recorded on {stats?.lowestDayName || "Past week"}
              </p>
            </div>

            {/* KPI 4: 7-Day Rainfall Accumulation */}
            <div
              id="kpi-rainfall-total"
              className={`rounded-2xl border p-4.5 transition ${
                isDark ? "bg-[#0b1224] border-slate-800/90" : "bg-white border-slate-200 shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Rainfall</span>
                <span className={`p-2 rounded-xl ${isDark ? "bg-indigo-500/15 text-indigo-400" : "bg-indigo-100 text-indigo-700"}`}>
                  <CloudRain className="h-4 w-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl sm:text-3xl font-black ${isDark ? "text-sky-300" : "text-sky-700"}`}>
                  {stats?.totalPrecipitationMm} mm
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  ({stats?.rainyDaysCount} rainy day{stats?.rainyDaysCount === 1 ? "" : "s"})
                </span>
              </div>
              <p className={`text-xs mt-2 font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {stats?.rainyDaysCount === 0
                  ? "Dry & clear conditions over the full 7 days"
                  : `${stats?.rainyDaysCount} of 7 days had measurable rain`}
              </p>
            </div>
          </div>

          {/* 3. D3 Line Chart Section */}
          <div
            id="retro-d3-chart-section"
            className={`rounded-3xl border p-5 sm:p-6 transition ${
              isDark ? "bg-[#090f20] border-slate-800" : "bg-white border-slate-200 shadow-sm"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className={`text-base font-extrabold flex items-center gap-2 ${isDark ? "text-white" : "text-slate-900"}`}>
                  <Activity className="h-4 w-4 text-cyan-400" />
                  7-Day Temperature Trend Line Chart (d3.js)
                </h3>
                <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Interactive visualization displaying daily maximum highs, minimum lows, and the 7-day average baseline.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                  isDark ? "bg-slate-800 text-slate-300 border-slate-700" : "bg-slate-100 text-slate-700 border-slate-200"
                }`}>
                  Unit: °{unit}
                </span>
              </div>
            </div>

            {/* D3 Component */}
            <D3RetrospectiveChart
              days={days}
              unit={unit}
              averageTempC={stats?.averageTempC || 28}
              averageTempF={stats?.averageTempF || 82}
              theme={theme}
              onSelectDay={(day) => setSelectedDay(day)}
            />
          </div>

          {/* 4. Daily Retrospective Breakdown Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className={`text-sm font-extrabold uppercase tracking-wider ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                Day-by-Day Historical Observations
              </h3>
              <span className={`text-xs font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                Past 7 Days (Chronological)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
              {days.map((day, idx) => {
                const isSelected = selectedDay?.date === day.date;
                const isMax = day.maxTempC === stats?.highestMaxTempC;
                const isMin = day.minTempC === stats?.lowestMinTempC;

                return (
                  <button
                    key={day.date || idx}
                    onClick={() => setSelectedDay(day)}
                    className={`flex flex-col text-left p-3.5 rounded-2xl border transition-all ${
                      isSelected
                        ? isDark
                          ? "bg-sky-950/40 border-sky-400 ring-2 ring-sky-500/20"
                          : "bg-sky-50 border-sky-400 ring-2 ring-sky-300"
                        : isDark
                        ? "bg-[#0b1224] border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700"
                        : "bg-white border-slate-200 hover:bg-slate-50 shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <span className={`text-xs font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                        {day.dayName}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400">
                        {day.dateFormatted}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 my-1">
                      <span className="text-sm font-black text-amber-400">
                        {unit === "C" ? day.maxTempC : day.maxTempF}°
                      </span>
                      <span className="text-xs text-slate-400">/</span>
                      <span className="text-xs font-semibold text-cyan-400">
                        {unit === "C" ? day.minTempC : day.minTempF}°
                      </span>
                    </div>

                    <p className="text-[11px] font-medium text-slate-300 truncate mt-1">
                      {day.condition}
                    </p>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400 w-full">
                      <span className="flex items-center gap-1">
                        <CloudRain className="h-3 w-3 text-sky-400" />
                        {day.precipitationMm > 0 ? `${day.precipitationMm} mm` : "0 mm"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Wind className="h-3 w-3 text-slate-400" />
                        {day.windSpeedKmh}k
                      </span>
                    </div>

                    {isMax && (
                      <span className="mt-2 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-sm bg-amber-500/20 text-amber-300 text-center w-full">
                        Week High
                      </span>
                    )}
                    {isMin && !isMax && (
                      <span className="mt-2 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-sm bg-cyan-500/20 text-cyan-300 text-center w-full">
                        Week Low
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. AI Pattern & Safety Insights Integration */}
          <div
            id="retro-ai-insights-box"
            className={`rounded-2xl border p-4.5 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition ${
              isDark
                ? "bg-gradient-to-r from-sky-950/30 via-[#0b1428] to-slate-900 border-sky-500/30"
                : "bg-gradient-to-r from-sky-50 via-white to-sky-50 border-sky-200"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 to-cyan-400 text-white shadow-md shadow-cyan-500/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h4 className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                  Need a meteorological analysis of this 7-day pattern?
                </h4>
                <p className={`text-xs mt-0.5 max-w-xl ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  WeatherGPT can evaluate how recent humidity, temperature shifts, and rain influence your upcoming week, sports, or commute safety.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() =>
                  onAskAI(
                    `Based on the 7-day retrospective weather summary for ${locationName}, is our local weather stabilizing or getting hotter/colder? Give me simple practical takeaways.`
                  )
                }
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-600 text-white transition active:scale-95"
              >
                Is It Getting Hotter or Colder?
              </button>
              <button
                onClick={() =>
                  onAskAI(
                    `Based on the past 7 days of rainfall (${stats?.totalPrecipitationMm}mm recorded across ${stats?.rainyDaysCount} rainy days) in ${locationName}, what should I prepare for upcoming outdoor activities?`
                  )
                }
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
                  isDark
                    ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
                    : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-xs"
                }`}
              >
                Rainfall & Gear Advice
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
