import React from "react";
import { HourlyForecastItem, DailyForecastItem, TemperatureUnit, Theme } from "../types/weather";
import { Cloud, CloudRain, Sun, CloudLightning, Snowflake, Droplets } from "lucide-react";

interface CompactForecastProps {
  hourly: HourlyForecastItem[];
  daily: DailyForecastItem[];
  unit: TemperatureUnit;
  theme?: Theme;
}

export const CompactForecast: React.FC<CompactForecastProps> = ({
  hourly,
  daily,
  unit,
  theme = "dark",
}) => {
  const isDark = theme === "dark";

  const getConditionIcon = (condition: string, rainProb: number = 0) => {
    const c = condition.toLowerCase();
    if (c.includes("storm") || c.includes("thunder")) {
      return <CloudLightning className="h-5 w-5 text-violet-400 shrink-0" />;
    }
    if (c.includes("rain") || c.includes("drizzle") || c.includes("shower") || rainProb >= 50) {
      return <CloudRain className="h-5 w-5 text-sky-400 shrink-0" />;
    }
    if (c.includes("snow") || c.includes("flurry")) {
      return <Snowflake className="h-5 w-5 text-blue-300 shrink-0" />;
    }
    if (c.includes("cloud") || c.includes("overcast")) {
      return <Cloud className="h-5 w-5 text-slate-400 shrink-0" />;
    }
    return <Sun className="h-5 w-5 text-amber-400 shrink-0" />;
  };

  return (
    <section id="compact-forecast-section" className="w-full flex flex-col gap-4">
      {/* Hourly Forecast Header & Strip */}
      <div className={`rounded-3xl border p-5 sm:p-6 backdrop-blur-md transition-all ${
        isDark ? "bg-slate-900/60 border-slate-800/80" : "bg-white/80 border-slate-200/80 shadow-sm"
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Hourly Forecast
          </h3>
          <span className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            Next 12 Hours
          </span>
        </div>

        {/* Horizontal scrollable hourly strip */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-none">
          {hourly.slice(0, 10).map((item, idx) => {
            const tempVal = unit === "C" ? Math.round(item.tempC) : Math.round(item.tempF);
            return (
              <div
                key={idx}
                className={`flex flex-col items-center justify-between min-w-[70px] sm:min-w-[80px] p-3 rounded-2xl border transition-all ${
                  idx === 0
                    ? isDark
                      ? "bg-sky-500/15 border-sky-500/30 text-white"
                      : "bg-sky-50 border-sky-200 text-sky-950 shadow-xs"
                    : isDark
                    ? "bg-slate-800/40 border-slate-700/50 text-slate-200 hover:bg-slate-800/70"
                    : "bg-slate-50/80 border-slate-200/60 text-slate-800 hover:bg-slate-100"
                }`}
              >
                <span className={`text-xs font-medium ${idx === 0 ? "font-bold text-sky-400" : "text-slate-400"}`}>
                  {idx === 0 ? "Now" : item.hour.replace(":00", "")}
                </span>

                <div className="my-2.5">
                  {getConditionIcon(item.condition, item.rainProbability)}
                </div>

                <span className="text-sm font-bold tabular-nums">
                  {tempVal}°
                </span>

                {item.rainProbability > 20 && (
                  <span className="mt-1 flex items-center gap-0.5 text-[10px] font-semibold text-cyan-400">
                    <Droplets className="h-2.5 w-2.5" />
                    {item.rainProbability}%
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* 5-Day Compact Daily Forecast Rows */}
        <div className="mt-5 pt-4 border-t border-slate-800/60">
          <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            5-Day Outlook
          </h4>

          <div className="flex flex-col gap-2">
            {daily.slice(0, 5).map((day, idx) => {
              const maxT = unit === "C" ? Math.round(day.maxTempC) : Math.round(day.maxTempF);
              const minT = unit === "C" ? Math.round(day.minTempC) : Math.round(day.minTempF);

              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between py-2 px-3 rounded-xl transition ${
                    isDark ? "hover:bg-slate-800/40 text-slate-200" : "hover:bg-slate-50 text-slate-800"
                  }`}
                >
                  <span className="w-24 text-xs sm:text-sm font-medium">
                    {idx === 0 ? "Today" : idx === 1 ? "Tomorrow" : day.dayName}
                  </span>

                  <div className="flex items-center gap-2 w-28">
                    {getConditionIcon(day.condition, day.rainProbability)}
                    <span className={`text-xs hidden sm:inline truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      {day.condition}
                    </span>
                  </div>

                  {day.rainProbability > 20 ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-cyan-400 w-12 text-right justify-end">
                      <Droplets className="h-3 w-3" />
                      {day.rainProbability}%
                    </span>
                  ) : (
                    <span className="w-12" />
                  )}

                  <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold tabular-nums w-20 justify-end">
                    <span>{maxT}°</span>
                    <span className={`font-normal ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                      {minT}°
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
