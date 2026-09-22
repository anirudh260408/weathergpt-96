import React from "react";
import {
  MapPin,
  Sun,
  Moon,
  RefreshCw,
  Menu,
  AlertTriangle,
  SlidersHorizontal,
  User,
  Shield,
  Bell,
  BellRing,
} from "lucide-react";
import { TemperatureUnit, WeatherStatusLevel, Theme, UserAccount, GPSStatus } from "../types/weather";

interface NavbarProps {
  locationName: string;
  uvIndex: number;
  unit: TemperatureUnit;
  onToggleUnit: () => void;
  onOpenLocationModal: () => void;
  onUseGps?: () => void;
  lastUpdated: string;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenMobileMenu: () => void;
  statusLevel: WeatherStatusLevel;
  onOpenAlertsModal: () => void;
  activeAlertCount: number;
  theme?: Theme;
  onToggleTheme?: () => void;
  currentUser: UserAccount | null;
  onOpenAccountModal: () => void;
  gpsStatus?: GPSStatus;
  onOpenNotificationSettings?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  locationName,
  uvIndex,
  unit,
  onToggleUnit,
  onOpenLocationModal,
  onUseGps,
  lastUpdated,
  onRefresh,
  isRefreshing,
  onOpenMobileMenu,
  statusLevel,
  onOpenAlertsModal,
  activeAlertCount,
  theme = "dark",
  onToggleTheme,
  currentUser,
  onOpenAccountModal,
  gpsStatus = "idle",
  onOpenNotificationSettings,
}) => {
  const isDark = theme === "dark";

  const getGpsBadge = () => {
    switch (gpsStatus) {
      case "active":
        return {
          text: "GPS Active",
          icon: "📍",
          color: isDark ? "text-emerald-400 bg-emerald-950/40 border-emerald-500/30" : "text-emerald-800 bg-emerald-50 border-emerald-200",
        };
      case "denied":
        return {
          text: "GPS Denied",
          icon: "🚫",
          color: isDark ? "text-rose-400 bg-rose-950/40 border-rose-500/30" : "text-rose-800 bg-rose-50 border-rose-200",
        };
      case "timeout":
      case "unavailable":
        return {
          text: "GPS Unavail",
          icon: "⚠️",
          color: isDark ? "text-amber-400 bg-amber-950/40 border-amber-500/30" : "text-amber-800 bg-amber-50 border-amber-200",
        };
      default:
        return {
          text: "GPS",
          icon: "📡",
          color: isDark ? "text-cyan-300 bg-cyan-950/40 border-cyan-500/30" : "text-cyan-800 bg-cyan-50 border-cyan-200",
        };
    }
  };

  const gpsBadge = getGpsBadge();

  return (
    <header
      id="app-navbar"
      className={`sticky top-0 z-30 flex h-14 sm:h-16 shrink-0 w-full items-center justify-between border-b px-2.5 sm:px-6 backdrop-blur-md transition-colors ${
        isDark
          ? "bg-[#080d1a]/90 border-slate-800/80 text-slate-200"
          : "bg-white/90 border-slate-200/80 text-slate-800"
      }`}
    >
      {/* Left side: Mobile Toggle & Brand / Location */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
        <button
          id="mobile-menu-btn"
          onClick={onOpenMobileMenu}
          className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border shrink-0 lg:hidden active:scale-95 transition ${
            isDark
              ? "border-slate-700 bg-slate-800/80 text-slate-300"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
          }`}
          aria-label="Open Navigation"
        >
          <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        {/* Location selector pill (interactive) */}
        <button
          id="navbar-location-pill"
          onClick={onOpenLocationModal}
          className={`flex items-center gap-1 sm:gap-1.5 rounded-xl border px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium transition shrink-0 active:scale-95 ${
            isDark
              ? "bg-[#0f172a] hover:bg-slate-800/90 border-slate-700/80 text-slate-200 hover:border-slate-600"
              : "bg-sky-50/80 hover:bg-sky-100/90 border-sky-200/80 text-sky-800"
          }`}
          title="Change location"
        >
          <MapPin className="h-3.5 w-3.5 text-sky-400 shrink-0" />
          <span className="max-w-[85px] xs:max-w-[120px] sm:max-w-[180px] truncate font-semibold">
            {locationName || "Detecting..."}
          </span>
        </button>

        {/* GPS Location & Safety Status Button */}
        {onUseGps && (
          <button
            id="navbar-gps-btn"
            onClick={onUseGps}
            className={`flex items-center gap-1 rounded-xl border px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs font-medium transition shrink-0 active:scale-95 ${gpsBadge.color}`}
            title="Detect current GPS location & activate safety monitor"
          >
            <span className="text-xs">{gpsBadge.icon}</span>
            <span className="hidden sm:inline font-semibold">{gpsBadge.text}</span>
          </button>
        )}
      </div>

      {/* Right side: Alerts, Proactive Bell, Unit Switcher, Theme, Refresh, Account */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Active Alert indicator */}
        {activeAlertCount > 0 && (
          <button
            onClick={onOpenAlertsModal}
            className={`flex items-center gap-1 sm:gap-1.5 rounded-xl px-2 sm:px-2.5 py-1 text-xs font-bold border transition shrink-0 active:scale-95 ${
              statusLevel === "DANGER"
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
                : "bg-amber-500/20 text-amber-300 border-amber-500/40"
            }`}
            title="View Weather Alerts"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span className="hidden xs:inline">{activeAlertCount} {activeAlertCount === 1 ? "Alert" : "Alerts"}</span>
            <span className="xs:hidden">{activeAlertCount}</span>
          </button>
        )}

        {/* Proactive Notification Settings & Alert Center */}
        {onOpenNotificationSettings && (
          <button
            id="navbar-notifications-btn"
            onClick={onOpenNotificationSettings}
            className={`hidden xs:flex h-8 w-8 items-center justify-center rounded-xl border transition shrink-0 active:scale-95 ${
              isDark
                ? "border-slate-700/80 bg-[#0f172a] text-slate-300 hover:text-sky-300 hover:border-slate-600"
                : "border-slate-200 bg-white text-slate-700 hover:text-sky-600 hover:bg-slate-50"
            }`}
            title="Weather Safety & Proactive Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>
        )}

        {/* Temperature Unit Switcher (°C | °F) - responsive */}
        <button
          id="navbar-unit-switcher"
          onClick={onToggleUnit}
          className={`flex h-8 items-center rounded-xl border px-2 py-0.5 text-xs font-semibold transition shrink-0 active:scale-95 ${
            isDark
              ? "bg-[#0f172a] border-slate-700/80 text-cyan-300 hover:border-slate-600"
              : "bg-slate-100 border-slate-200 text-sky-700 hover:bg-slate-200"
          }`}
          title={`Click to switch to °${unit === "C" ? "F" : "C"}`}
        >
          <span className="font-bold">°{unit}</span>
        </button>

        {/* Refresh button with spinner */}
        <button
          id="refresh-weather-btn"
          onClick={onRefresh}
          disabled={isRefreshing}
          className={`flex h-8 w-8 items-center justify-center rounded-xl border transition shrink-0 active:scale-95 ${
            isDark
              ? "border-slate-700/80 bg-[#0f172a] text-slate-300 hover:text-white hover:border-slate-600"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
          title={lastUpdated ? `Updated ${lastUpdated} (Click to refresh)` : "Refresh telemetry"}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`} />
        </button>

        {/* Theme Toggle */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className={`flex h-8 w-8 items-center justify-center rounded-xl border transition shrink-0 active:scale-95 ${
              isDark
                ? "border-slate-700/80 bg-[#0f172a] text-slate-300 hover:text-amber-400 hover:border-slate-600"
                : "border-slate-200 bg-white text-slate-700 hover:text-sky-600 hover:bg-slate-50"
            }`}
            title={`Switch to ${isDark ? "Light" : "Dark"} mode`}
          >
            {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
          </button>
        )}

        {/* Account & Security Hub */}
        <button
          id="navbar-account-btn"
          onClick={onOpenAccountModal}
          className={`flex items-center gap-1 sm:gap-1.5 rounded-xl border p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-semibold transition active:scale-[0.98] shrink-0 ${
            currentUser
              ? isDark
                ? "bg-slate-800/90 border-slate-700 text-slate-200 hover:border-cyan-400/50 hover:bg-slate-800"
                : "bg-white border-slate-200 text-slate-800 hover:border-sky-300 shadow-xs"
              : isDark
              ? "bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border-cyan-500/40 shadow-xs"
              : "bg-sky-500 hover:bg-sky-600 text-white border-sky-600 shadow-xs"
          }`}
          title="Account, 2FA Security & Preferences"
        >
          {currentUser ? (
            <>
              <div className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-500 to-cyan-400 text-slate-950 font-bold text-[10px]">
                {currentUser.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt="Avatar" className="h-full w-full rounded-lg object-cover" />
                ) : (
                  currentUser.name.charAt(0).toUpperCase()
                )}
                <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400 border border-slate-900" />
              </div>
              <span className="truncate max-w-[90px] hidden sm:inline">{currentUser.name.split(" ")[0]}</span>
              <Shield className="h-3 w-3 text-cyan-400 shrink-0 ml-0.5 hidden sm:inline" />
            </>
          ) : (
            <>
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden xs:inline">Account</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
