import React, { useState } from "react";
import { AlertOctagon, ShieldAlert, ArrowRight, X, ChevronDown, ChevronUp, Share2, Check } from "lucide-react";
import { WeatherAlert, WeatherData } from "../types/weather";
import { shareWeatherAlert } from "../utils/shareUtils";

interface DangerBannerProps {
  alerts: WeatherAlert[];
  weatherData: WeatherData;
  onViewNearbyAssistance: () => void;
  isSimulated?: boolean;
}

export const DangerBanner: React.FC<DangerBannerProps> = ({
  alerts,
  weatherData,
  onViewNearbyAssistance,
  isSimulated = false,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  if (isDismissed) return null;

  const dangerAlerts = alerts.filter((a) => a.level === "danger");
  const primaryAlert = dangerAlerts[0] || alerts[0];

  const whatIsHappening = primaryAlert
    ? primaryAlert.message
    : `Severe conditions detected with wind speeds reaching ${weatherData.current.windSpeedKmh} km/h and rain probability at ${weatherData.current.rainProbability}%.`;

  const actionText = primaryAlert?.action || "Move indoors to a sturdy shelter and avoid non-essential travel.";

  const handleShareAlert = async () => {
    const alertTitle = `⚠️ SEVERE WEATHER ALERT: ${weatherData.location.name}`;
    const alertBody = `🚨 Alert: ${primaryAlert?.title || "Severe Weather"}\n📍 Location: ${weatherData.location.name}\n⛈️ Conditions: ${whatIsHappening}\n🛡️ Action: ${actionText}\n🌡️ Current Temp: ${weatherData.current.tempC}°C | Wind: ${weatherData.current.windSpeedKmh} km/h | Rain: ${weatherData.current.rainProbability}%`;

    const result = await shareWeatherAlert({
      title: alertTitle,
      text: alertBody,
      locationName: weatherData.location.name,
    });

    if (result.success) {
      setShareFeedback(result.method === "clipboard" ? "Alert Copied!" : "Alert Shared!");
      setTimeout(() => setShareFeedback(null), 3000);
    }
  };

  return (
    <div
      id="dangerous-weather-mode-banner"
      className="mb-4 overflow-hidden rounded-2xl border border-rose-500/50 bg-gradient-to-r from-rose-950/95 via-rose-900/90 to-slate-950/95 backdrop-blur-md text-white shadow-lg shadow-rose-950/30 transition-all"
    >
      {/* Sleek Compact Header Strip */}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white animate-pulse shadow-xs">
            <AlertOctagon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wide uppercase text-rose-200 truncate">
                {primaryAlert?.title || "Severe Weather Advisory"}
              </span>
              {isSimulated && (
                <span className="rounded-md bg-rose-800/80 px-1.5 py-0.5 text-[9px] font-bold text-rose-200">
                  Preview
                </span>
              )}
            </div>
            <p className="text-xs text-rose-100/90 truncate font-medium">
              {actionText}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Share Alert Button */}
          <button
            id="danger-banner-share-btn"
            onClick={handleShareAlert}
            className="flex items-center gap-1.5 rounded-xl bg-rose-800/80 hover:bg-rose-700/90 border border-rose-600/50 px-2.5 py-1.5 text-xs font-bold text-rose-100 transition active:scale-95 shadow-xs"
            title="Share active weather alert via Web Share"
          >
            {shareFeedback ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-300">{shareFeedback}</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5 text-rose-200" />
                <span className="hidden sm:inline">Share Alert</span>
              </>
            )}
          </button>

          <button
            onClick={onViewNearbyAssistance}
            className="hidden sm:flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-rose-950 transition hover:bg-rose-50 active:scale-95 shadow-xs"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
            <span>Shelters</span>
            <ArrowRight className="h-3 w-3" />
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-900/60 text-rose-300 hover:text-white transition"
            title={isExpanded ? "Collapse details" : "Expand details"}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          <button
            onClick={() => setIsDismissed(true)}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-900/60 text-rose-400 hover:text-white hover:bg-rose-800/80 transition"
            title="Dismiss banner"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Expandable Protocol Details */}
      {isExpanded && (
        <div className="border-t border-rose-800/50 bg-rose-950/60 px-4 py-3 sm:px-5 sm:py-4 text-xs space-y-2">
          <p className="text-rose-200 font-medium leading-relaxed">
            {whatIsHappening}
          </p>
          <div className="flex flex-wrap gap-2 pt-1 font-mono text-[11px]">
            <span className="rounded bg-rose-900/60 px-2 py-0.5 text-rose-300 border border-rose-800/50">
              Temp: {weatherData.current.tempC}°C
            </span>
            <span className="rounded bg-rose-900/60 px-2 py-0.5 text-rose-300 border border-rose-800/50">
              Rain Prob: {weatherData.current.rainProbability}%
            </span>
            <span className="rounded bg-rose-900/60 px-2 py-0.5 text-rose-300 border border-rose-800/50">
              Wind: {weatherData.current.windSpeedKmh} km/h
            </span>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-rose-300/80">
              Alert generated for {weatherData.location.name}
            </span>
            <button
              onClick={handleShareAlert}
              className="sm:hidden flex items-center gap-1.5 text-xs font-bold text-rose-200 underline"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>Share this alert</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
