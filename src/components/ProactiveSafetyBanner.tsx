import React, { useState } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  AlertOctagon,
  X,
  ArrowRight,
  Sparkles,
  MapPin,
  ChevronDown,
  ChevronUp,
  Volume2,
  Share2,
  Check,
} from "lucide-react";
import { ProactiveSafetyRisk, Theme } from "../types/weather";
import { shareWeatherAlert } from "../utils/shareUtils";

interface ProactiveSafetyBannerProps {
  risk: ProactiveSafetyRisk;
  onViewNearby: () => void;
  onAskAI: (prompt: string) => void;
  onDismiss: () => void;
  theme?: Theme;
  isGpsActive?: boolean;
}

export const ProactiveSafetyBanner: React.FC<ProactiveSafetyBannerProps> = ({
  risk,
  onViewNearby,
  onAskAI,
  onDismiss,
  theme = "dark",
  isGpsActive = false,
}) => {
  const isDark = theme === "dark";
  const [isExpanded, setIsExpanded] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const handleShareRiskAlert = async () => {
    const alertTitle = `⚠️ WEATHER SAFETY ADVISORY: ${risk.title}`;
    const alertBody = `🚨 ${risk.title}\n📍 Location: ${risk.locationName}\n\n1. What is Happening: ${risk.whatIsHappening}\n2. How It Affects You: ${risk.howItAffects}\n3. What To Do: ${risk.whatToDo}`;

    const res = await shareWeatherAlert({
      title: alertTitle,
      text: alertBody,
      locationName: risk.locationName,
    });

    if (res.success) {
      setShareFeedback(res.method === "clipboard" ? "Copied!" : "Shared!");
      setTimeout(() => setShareFeedback(null), 3000);
    }
  };

  const getStyleForLevel = () => {
    switch (risk.level) {
      case "critical":
      case "danger":
        return {
          container: isDark
            ? "border-rose-500/60 bg-gradient-to-r from-rose-950/95 via-[#18080f]/95 to-slate-950/95 text-rose-50 shadow-rose-950/40"
            : "border-rose-300 bg-gradient-to-r from-rose-50 via-rose-100/60 to-white text-rose-950 shadow-rose-200/40",
          badge: "bg-rose-600 text-white",
          icon: <AlertOctagon className="h-4 w-4 text-white" />,
          accentBtn: "bg-rose-600 hover:bg-rose-500 text-white",
          detailBg: isDark ? "bg-rose-950/40 border-rose-800/40" : "bg-rose-100/70 border-rose-200",
          subtext: isDark ? "text-rose-200" : "text-rose-900",
          glow: "border-rose-500/80 shadow-lg shadow-rose-900/20",
        };
      case "caution":
        return {
          container: isDark
            ? "border-amber-500/50 bg-gradient-to-r from-amber-950/90 via-[#181106]/95 to-slate-950/95 text-amber-50 shadow-amber-950/30"
            : "border-amber-300 bg-gradient-to-r from-amber-50 via-amber-100/60 to-white text-amber-950 shadow-amber-200/30",
          badge: "bg-amber-500 text-white",
          icon: <AlertTriangle className="h-4 w-4 text-white" />,
          accentBtn: "bg-amber-600 hover:bg-amber-500 text-white",
          detailBg: isDark ? "bg-amber-950/40 border-amber-800/40" : "bg-amber-100/70 border-amber-200",
          subtext: isDark ? "text-amber-200" : "text-amber-900",
          glow: "border-amber-500/60 shadow-md shadow-amber-900/10",
        };
      default:
        return {
          container: isDark
            ? "border-sky-500/40 bg-gradient-to-r from-sky-950/80 via-[#071324]/90 to-slate-950/95 text-sky-50"
            : "border-sky-300 bg-gradient-to-r from-sky-50 via-sky-100/50 to-white text-sky-950",
          badge: "bg-sky-500 text-white",
          icon: <Info className="h-4 w-4 text-white" />,
          accentBtn: "bg-sky-600 hover:bg-sky-500 text-white",
          detailBg: isDark ? "bg-sky-950/30 border-sky-800/30" : "bg-sky-100/70 border-sky-200",
          subtext: isDark ? "text-sky-200" : "text-sky-900",
          glow: "border-sky-500/40",
        };
    }
  };

  const style = getStyleForLevel();

  const handleAskAIClick = () => {
    onAskAI(
      `I received a proactive weather alert for ${risk.locationName}: "${risk.title} - ${risk.whatIsHappening}". Can you explain what is happening, how it affects my plans, and what I should do right now?`
    );
  };

  return (
    <div
      id="proactive-safety-notification"
      className={`mb-4 overflow-hidden rounded-2xl border backdrop-blur-md transition-all animate-fade-in ${style.container} ${style.glow}`}
    >
      {/* Primary Notification Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
        <div className="flex items-start gap-3 min-w-0">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${style.badge} shadow-xs`}>
            {style.icon}
          </span>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black tracking-wide uppercase">
                {risk.title}
              </span>
              {isGpsActive && (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                  <MapPin className="h-2.5 w-2.5" />
                  GPS Live
                </span>
              )}
              {risk.escalated && (
                <span className="rounded-md bg-rose-500 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-white animate-pulse">
                  Escalated
                </span>
              )}
            </div>

            <p className={`text-xs font-semibold mt-0.5 leading-snug line-clamp-2 ${style.subtext}`}>
              {risk.whatIsHappening}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {/* Share Alert Button */}
          <button
            onClick={handleShareRiskAlert}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition active:scale-95 shadow-xs ${
              isDark
                ? "bg-rose-900/60 hover:bg-rose-800/80 text-rose-200 border border-rose-700/50"
                : "bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300"
            }`}
            title="Share this safety advisory via Web Share"
          >
            {shareFeedback ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-300">{shareFeedback}</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5 text-rose-400" />
                <span className="hidden sm:inline">Share Alert</span>
              </>
            )}
          </button>

          {risk.needsShelterPlaces && (
            <button
              onClick={onViewNearby}
              className="flex items-center gap-1.5 rounded-xl bg-white text-rose-950 px-3 py-1.5 text-xs font-bold transition hover:bg-rose-50 active:scale-95 shadow-xs"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
              <span>Nearby Help</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          )}

          <button
            onClick={handleAskAIClick}
            className={`hidden md:flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition ${
              isDark
                ? "bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700"
                : "bg-white hover:bg-slate-50 text-slate-800 border border-slate-200"
            }`}
          >
            <Sparkles className="h-3 w-3 text-cyan-400" />
            <span>Ask WeatherGPT</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
              isDark ? "bg-slate-800/70 text-slate-300 hover:text-white" : "bg-white/80 text-slate-700 hover:bg-white"
            }`}
            title={isExpanded ? "Collapse safety details" : "Expand safety details"}
          >
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          <button
            onClick={onDismiss}
            className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
              isDark ? "bg-slate-800/70 text-slate-400 hover:text-white" : "bg-white/80 text-slate-500 hover:text-slate-900"
            }`}
            title="Dismiss notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded 4-Part Safety Guidance */}
      {isExpanded && (
        <div className={`border-t px-4 py-3.5 sm:px-5 sm:py-4 text-xs space-y-2.5 ${style.detailBg}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="font-extrabold uppercase tracking-wider text-[10px] opacity-80">
                1. What is Happening:
              </div>
              <p className="font-medium leading-relaxed">{risk.whatIsHappening}</p>
            </div>

            <div className="space-y-1">
              <div className="font-extrabold uppercase tracking-wider text-[10px] opacity-80">
                2. How It May Affect You:
              </div>
              <p className="font-medium leading-relaxed">{risk.howItAffects}</p>
            </div>
          </div>

          <div className="pt-1.5 border-t border-black/10 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="font-extrabold uppercase tracking-wider text-[10px] opacity-80">
                3. What You Should Do:
              </div>
              <p className="font-bold">{risk.whatToDo}</p>
            </div>

            <div className="flex items-center gap-2 pt-1 sm:pt-0">
              <button
                onClick={handleAskAIClick}
                className="flex md:hidden items-center gap-1 rounded-lg bg-sky-600 text-white px-2.5 py-1 text-xs font-semibold"
              >
                <Sparkles className="h-3 w-3" />
                <span>Ask AI</span>
              </button>

              {risk.needsShelterPlaces && (
                <button
                  onClick={onViewNearby}
                  className="flex sm:hidden items-center gap-1 rounded-lg bg-rose-600 text-white px-2.5 py-1 text-xs font-semibold"
                >
                  <ShieldAlert className="h-3 w-3" />
                  <span>Nearby Help</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
