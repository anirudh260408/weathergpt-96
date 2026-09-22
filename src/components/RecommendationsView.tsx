import React from "react";
import {
  Compass,
  Shirt,
  Car,
  Activity,
  Sun,
  Droplets,
  Wind,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";
import { SafetyRecommendation, WeatherData, Theme } from "../types/weather";

interface RecommendationsViewProps {
  weatherData: WeatherData;
  recommendations: SafetyRecommendation[];
  onAskAI: (prompt: string) => void;
  theme?: Theme;
}

export const RecommendationsView: React.FC<RecommendationsViewProps> = ({
  weatherData,
  recommendations,
  onAskAI,
  theme = "dark",
}) => {
  const isDark = theme === "dark";
  const { current, location } = weatherData;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "danger":
        return {
          bg: isDark ? "bg-rose-950/40 border-rose-900/60 text-rose-300" : "bg-rose-50 border-rose-200 text-rose-700",
          icon: <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />,
          label: "Hazardous / Postpone",
        };
      case "warning":
        return {
          bg: isDark ? "bg-amber-950/40 border-amber-900/60 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-800",
          icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
          label: "High Caution",
        };
      case "caution":
        return {
          bg: isDark ? "bg-yellow-950/40 border-yellow-900/60 text-yellow-300" : "bg-yellow-50 border-yellow-200 text-yellow-800",
          icon: <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />,
          label: "Moderate Caution",
        };
      default:
        return {
          bg: isDark ? "bg-emerald-950/40 border-emerald-900/60 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-700",
          icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
          label: "Favorable / Safe",
        };
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "clothing":
        return <Shirt className="h-5 w-5 text-indigo-400" />;
      case "travel":
        return <Car className="h-5 w-5 text-blue-400" />;
      case "sports":
        return <Activity className="h-5 w-5 text-emerald-400" />;
      case "uv":
        return <Sun className="h-5 w-5 text-amber-400" />;
      default:
        return <Compass className="h-5 w-5 text-sky-400" />;
    }
  };

  return (
    <div id="recommendations-view" className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className={`border-b pb-4 ${isDark ? "border-slate-800" : "border-slate-200"}`}>
        <h2 className={`text-xl font-black tracking-tight flex items-center gap-2 ${isDark ? "text-white" : "text-slate-900"}`}>
          <Compass className={`h-5 w-5 ${isDark ? "text-cyan-400" : "text-sky-600"}`} />
          <span>Personalized Weather & Safety Recommendations</span>
        </h2>
        <p className={`text-xs font-medium mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Actionable lifestyle, attire, and transit guidance computed directly from live measurements for {location.name}
        </p>
      </div>

      {/* Grid of Recommendation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recommendations.map((rec) => {
          const badge = getStatusBadge(rec.status);
          return (
            <div
              key={rec.id}
              className={`flex flex-col justify-between rounded-xl border p-5 shadow-2xs transition ${
                isDark
                  ? "border-slate-800 bg-[#0c1427]/90 hover:border-cyan-500/40 text-slate-100"
                  : "border-slate-200 bg-white hover:border-sky-300"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                      isDark ? "bg-slate-900 border border-slate-800" : "bg-slate-100"
                    }`}>
                      {getCategoryIcon(rec.category)}
                    </span>
                    <div>
                      <h4 className={`text-sm font-extrabold ${isDark ? "text-white" : "text-slate-900"}`}>{rec.title}</h4>
                      <p className={`text-[11px] font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>{rec.subtitle}</p>
                    </div>
                  </div>

                  <span
                    className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${badge.bg}`}
                  >
                    {badge.icon}
                    <span>{badge.label}</span>
                  </span>
                </div>

                <div className={`mt-4 rounded-xl p-3.5 border text-xs leading-relaxed font-medium ${
                  isDark
                    ? "bg-slate-900/80 border-slate-800 text-slate-200"
                    : "bg-slate-50/80 border-slate-100 text-slate-700"
                }`}>
                  {rec.advice}
                </div>
              </div>

              <div className={`mt-4 flex items-center justify-between border-t pt-3 ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                <span className={`text-[11px] font-mono ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  Grounding: {current.tempC}°C • {current.rainProbability}% Rain • {current.windSpeedKmh}km/h
                </span>

                <button
                  onClick={() =>
                    onAskAI(
                      `Give me more specific advice on: ${rec.title}. Current conditions in ${location.name}: ${current.tempC}°C, ${current.condition}.`
                    )
                  }
                  className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg transition ${
                    isDark
                      ? "text-cyan-300 bg-cyan-950/40 hover:bg-cyan-950/70"
                      : "text-sky-600 hover:text-sky-700 bg-sky-50"
                  }`}
                >
                  <span>Ask WeatherGPT</span>
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
