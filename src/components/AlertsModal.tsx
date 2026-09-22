import React, { useState } from "react";
import {
  X,
  AlertTriangle,
  AlertOctagon,
  Info,
  ShieldCheck,
  BellRing,
  ArrowRight,
  Share2,
  Check,
} from "lucide-react";
import { WeatherAlert, WeatherData, Theme } from "../types/weather";
import { shareWeatherAlert } from "../utils/shareUtils";

interface AlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: WeatherAlert[];
  weatherData: WeatherData;
  onAskAI: (prompt: string) => void;
  onViewNearby: () => void;
  theme?: Theme;
}

export const AlertsModal: React.FC<AlertsModalProps> = ({
  isOpen,
  onClose,
  alerts,
  weatherData,
  onAskAI,
  onViewNearby,
  theme = "dark",
}) => {
  const [sharedAlertId, setSharedAlertId] = useState<string | null>(null);

  if (!isOpen) return null;
  const isDark = theme === "dark";

  const handleShareAlert = async (alert: WeatherAlert) => {
    const alertTitle = `⚠️ Weather Alert (${alert.level.toUpperCase()}): ${alert.title}`;
    const alertBody = `🚨 ${alert.title}\n📍 Location: ${weatherData.location.name}\n📋 Details: ${alert.message}\n🛡️ Action: ${alert.action}\n🌡️ Current Conditions: ${weatherData.current.tempC}°C, Wind ${weatherData.current.windSpeedKmh} km/h, Rain ${weatherData.current.rainProbability}%`;

    const res = await shareWeatherAlert({
      title: alertTitle,
      text: alertBody,
      locationName: weatherData.location.name,
    });

    if (res.success) {
      setSharedAlertId(alert.id);
      setTimeout(() => setSharedAlertId(null), 3000);
    }
  };

  const getAlertBadge = (level: string) => {
    switch (level) {
      case "danger":
        return {
          bg: "bg-rose-600 text-white",
          border: "border-rose-300",
          cardBg: isDark ? "bg-rose-950/40 border-rose-500/40" : "bg-rose-50/70 border-rose-200",
          icon: <AlertOctagon className="h-4 w-4 text-white" />,
        };
      case "warning":
        return {
          bg: "bg-amber-500 text-white",
          border: "border-amber-300",
          cardBg: isDark ? "bg-amber-950/40 border-amber-500/40" : "bg-amber-50/70 border-amber-200",
          icon: <AlertTriangle className="h-4 w-4 text-white" />,
        };
      case "caution":
        return {
          bg: "bg-yellow-400 text-yellow-950",
          border: "border-yellow-300",
          cardBg: isDark ? "bg-yellow-950/30 border-yellow-500/40" : "bg-yellow-50/50 border-yellow-200",
          icon: <AlertTriangle className="h-4 w-4 text-yellow-900" />,
        };
      default:
        return {
          bg: "bg-blue-500 text-white",
          border: "border-blue-300",
          cardBg: isDark ? "bg-blue-950/30 border-blue-500/40" : "bg-blue-50/50 border-blue-200",
          icon: <Info className="h-4 w-4 text-white" />,
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-fade-in">
      <div
        className={`relative w-full max-w-2xl overflow-hidden rounded-2xl shadow-2xl border transition-colors ${
          isDark
            ? "bg-[#0c1427] border-slate-800 text-slate-100 shadow-cyan-950/20"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between border-b px-6 py-4 ${
            isDark ? "border-slate-800 bg-[#090f1e]" : "border-slate-200 bg-slate-50/80"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                isDark ? "bg-amber-500/20 text-amber-300" : "bg-amber-100 text-amber-800"
              }`}
            >
              <BellRing className="h-4 w-4" />
            </span>
            <div>
              <h3 className={`text-base font-extrabold ${isDark ? "text-white" : "text-slate-900"}`}>
                Active Weather Alerts & Advisories
              </h3>
              <p className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Rule-based meteorological detection for {weatherData.location.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
              isDark
                ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                : "text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            }`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Alerts List Body */}
        <div className="max-h-[65vh] overflow-y-auto p-6 space-y-4">
          {alerts.length === 0 ? (
            <div className="py-12 text-center">
              <ShieldCheck className="mx-auto h-12 w-12 text-emerald-400 mb-2" />
              <h4 className={`text-base font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                No Active Severe Alerts
              </h4>
              <p className={`text-xs max-w-sm mx-auto mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Atmospheric measurements in {weatherData.location.name} are currently within safe baseline parameters.
              </p>
            </div>
          ) : (
            alerts.map((alert) => {
              const badge = getAlertBadge(alert.level);
              return (
                <div
                  key={alert.id}
                  className={`rounded-xl border p-4.5 transition ${badge.cardBg}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-md ${badge.bg}`}>
                        {badge.icon}
                      </span>
                      <h4 className={`text-sm font-black ${isDark ? "text-white" : "text-slate-900"}`}>
                        {alert.title}
                      </h4>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${badge.bg}`}
                    >
                      {alert.level}
                    </span>
                  </div>

                  <p className={`text-xs font-semibold mt-2 ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                    {alert.message}
                  </p>

                  <div
                    className={`mt-3 rounded-lg p-2.5 border text-xs ${
                      isDark
                        ? "bg-[#070b14]/70 border-slate-750 text-slate-300"
                        : "bg-white/80 border-black/5 text-slate-700"
                    }`}
                  >
                    <strong className={isDark ? "text-white" : "text-slate-900"}>Recommended Action: </strong>
                    <span>{alert.action}</span>
                  </div>

                  <div
                    className={`mt-3 flex items-center justify-between text-[11px] pt-1 ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono">Trigger: {alert.triggerValue}</span>
                      <button
                        onClick={() => handleShareAlert(alert)}
                        className={`flex items-center gap-1 font-bold px-2 py-0.5 rounded-md border transition ${
                          isDark
                            ? "bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700"
                            : "bg-white border-slate-300 text-slate-800 hover:bg-slate-100"
                        }`}
                        title="Share this alert via Web Share API"
                      >
                        {sharedAlertId === alert.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400">Shared</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="h-3 w-3 text-rose-400" />
                            <span>Share Alert</span>
                          </>
                        )}
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        onClose();
                        onAskAI(
                          `Explain this alert: "${alert.title}: ${alert.message}". What immediate actions should I take in ${weatherData.location.name}?`
                        );
                      }}
                      className={`font-bold hover:underline ${isDark ? "text-cyan-400 hover:text-cyan-300" : "text-sky-600 hover:text-sky-700"}`}
                    >
                      Ask AI about this alert →
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between border-t px-6 py-3 ${
            isDark ? "border-slate-800 bg-[#090f1e]" : "border-slate-200 bg-slate-50"
          }`}
        >
          <span className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {alerts.length} active notification{alerts.length === 1 ? "" : "s"}
          </span>

          <div className="flex gap-2">
            {alerts.some((a) => a.level === "danger") && (
              <button
                onClick={() => {
                  onClose();
                  onViewNearby();
                }}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition"
              >
                View Nearby Safe Places
              </button>
            )}

            <button
              onClick={onClose}
              className={`rounded-lg border px-4 py-1.5 text-xs font-bold transition ${
                isDark
                  ? "border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
