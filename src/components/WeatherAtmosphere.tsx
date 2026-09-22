import React, { useEffect, useState } from "react";
import { WeatherData, WeatherStatusLevel } from "../types/weather";

interface WeatherAtmosphereProps {
  weatherData: WeatherData | null;
  statusLevel: WeatherStatusLevel;
  theme?: "light" | "dark";
}

type WeatherConditionType = "clear" | "cloudy" | "rain" | "storm" | "snow" | "hot" | "default";

export const WeatherAtmosphere: React.FC<WeatherAtmosphereProps> = ({
  weatherData,
  statusLevel,
  theme = "dark",
}) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const isDark = theme === "dark";
  const weatherCode = weatherData?.current?.weatherCode ?? 0;
  const tempC = weatherData?.current?.tempC ?? 25;
  const isDay = weatherData?.current?.isDay ?? true;
  const rainProb = weatherData?.current?.rainProbability ?? 0;

  // Determine atmospheric condition category
  let conditionType: WeatherConditionType = "default";

  if (statusLevel === "DANGER" || [95, 96, 99].includes(weatherCode)) {
    conditionType = "storm";
  } else if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weatherCode) || rainProb >= 60) {
    conditionType = "rain";
  } else if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) {
    conditionType = "snow";
  } else if ([1, 2, 3, 45, 48].includes(weatherCode)) {
    conditionType = "cloudy";
  } else if (weatherCode === 0) {
    conditionType = tempC >= 35 ? "hot" : "clear";
  } else if (tempC >= 35) {
    conditionType = "hot";
  }

  // Dynamic subtle gradient palette based on condition and theme
  const getAtmosphericGradients = () => {
    if (statusLevel === "DANGER") {
      return isDark
        ? "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(225, 29, 72, 0.12), transparent 70%), linear-gradient(180deg, #09080e 0%, #06050a 100%)"
        : "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(244, 63, 94, 0.08), transparent 70%), linear-gradient(180deg, #fff5f5 0%, #ffffff 100%)";
    }

    switch (conditionType) {
      case "clear":
        return isDark
          ? isDay
            ? "radial-gradient(ellipse 80% 60% at 50% -15%, rgba(56, 189, 248, 0.10), rgba(251, 191, 36, 0.04) 50%, transparent 80%), linear-gradient(180deg, #070d18 0%, #060911 100%)"
            : "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(99, 102, 241, 0.10), transparent 70%), linear-gradient(180deg, #060813 0%, #030408 100%)"
          : "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(253, 224, 71, 0.10), rgba(56, 189, 248, 0.08) 60%, transparent 85%), linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)";

      case "cloudy":
        return isDark
          ? "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(148, 163, 184, 0.08), transparent 70%), linear-gradient(180deg, #0b0f19 0%, #080c14 100%)"
          : "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(203, 213, 225, 0.2), transparent 70%), linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)";

      case "rain":
        return isDark
          ? "radial-gradient(ellipse 80% 60% at 50% -15%, rgba(30, 58, 138, 0.18), rgba(14, 116, 144, 0.08) 60%, transparent 80%), linear-gradient(180deg, #060c18 0%, #040810 100%)"
          : "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(186, 230, 253, 0.2), rgba(224, 242, 254, 0.1) 60%, transparent 80%), linear-gradient(180deg, #f0f9ff 0%, #ffffff 100%)";

      case "storm":
        return isDark
          ? "radial-gradient(ellipse 80% 60% at 50% -20%, rgba(109, 40, 217, 0.16), rgba(225, 29, 72, 0.06) 60%, transparent 80%), linear-gradient(180deg, #070612 0%, #030208 100%)"
          : "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(196, 181, 253, 0.15), transparent 70%), linear-gradient(180deg, #faf5ff 0%, #ffffff 100%)";

      case "hot":
        return isDark
          ? "radial-gradient(ellipse 80% 60% at 50% -15%, rgba(245, 158, 11, 0.10), rgba(239, 68, 68, 0.06) 60%, transparent 80%), linear-gradient(180deg, #100b08 0%, #0a0705 100%)"
          : "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(254, 215, 170, 0.25), rgba(253, 186, 116, 0.1) 60%, transparent 80%), linear-gradient(180deg, #fffbf5 0%, #ffffff 100%)";

      default:
        return isDark
          ? "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(56, 189, 248, 0.06), transparent 70%), linear-gradient(180deg, #070c18 0%, #050811 100%)"
          : "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(224, 242, 254, 0.3), transparent 70%), linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)";
    }
  };

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden transition-all duration-700 ease-out"
      style={{
        background: getAtmosphericGradients(),
      }}
    >
      {/* Subtle condition soft glows */}
      {!prefersReducedMotion && (
        <>
          {/* CLEAR / SUNNY: Soft gentle sunlight glow */}
          {(conditionType === "clear" || conditionType === "hot") && isDay && (
            <div className="absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-amber-400/5 blur-3xl transition-opacity duration-1000" />
          )}

          {/* RAIN / DRIZZLE: Soft cool ambient indigo-blue glow */}
          {conditionType === "rain" && (
            <div className="absolute -top-20 left-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-sky-500/5 blur-3xl transition-opacity duration-1000" />
          )}

          {/* STORM: Soft subtle lightning pulse */}
          {conditionType === "storm" && (
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-violet-400/10" />
            </div>
          )}
        </>
      )}
    </div>
  );
};
