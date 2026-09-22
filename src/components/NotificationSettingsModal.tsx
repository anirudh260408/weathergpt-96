import React, { useState, useEffect } from "react";
import {
  X,
  Bell,
  BellRing,
  ShieldAlert,
  MapPin,
  CloudRain,
  Sun,
  Wind,
  Volume2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  History,
  Info,
} from "lucide-react";
import {
  NotificationSettings,
  ProactiveNotificationLogItem,
  Theme,
} from "../types/weather";
import {
  getSavedNotificationSettings,
  saveNotificationSettings,
  getNotificationHistory,
  clearNotificationHistory,
} from "../utils/proactiveSafetyEngine";

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: Theme;
  onSettingsUpdated?: (settings: NotificationSettings) => void;
  isGpsActive?: boolean;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
  theme = "dark",
  onSettingsUpdated,
  isGpsActive = false,
}) => {
  const isDark = theme === "dark";
  const [activeTab, setActiveTab] = useState<"settings" | "history">("settings");
  const [settings, setSettings] = useState<NotificationSettings>(getSavedNotificationSettings);
  const [logs, setLogs] = useState<ProactiveNotificationLogItem[]>([]);
  const [permissionState, setPermissionState] = useState<NotificationPermission>("default");
  const [permissionMsg, setPermissionMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSettings(getSavedNotificationSettings());
      setLogs(getNotificationHistory());
      if (typeof window !== "undefined" && "Notification" in window) {
        setPermissionState(Notification.permission);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggle = (key: keyof NotificationSettings) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    saveNotificationSettings(updated);
    if (onSettingsUpdated) onSettingsUpdated(updated);
  };

  const handleRequestBrowserPermission = async () => {
    setPermissionMsg(null);
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermissionMsg("Browser notifications are not supported in this browser environment.");
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermissionState(result);
      const updated = { ...settings, browserPermission: result };
      setSettings(updated);
      saveNotificationSettings(updated);
      if (onSettingsUpdated) onSettingsUpdated(updated);

      if (result === "granted") {
        setPermissionMsg("Proactive browser notifications are now enabled!");
      } else if (result === "denied") {
        setPermissionMsg("Permission was denied in your browser settings.");
      }
    } catch (err) {
      console.warn("Permission request error:", err);
      setPermissionMsg("Unable to request notification permission.");
    }
  };

  const handleClearLogs = () => {
    clearNotificationHistory();
    setLogs([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-fade-in">
      <div
        className={`relative w-full max-w-xl overflow-hidden rounded-2xl shadow-2xl border transition-colors ${
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
                isDark ? "bg-sky-500/20 text-sky-300" : "bg-sky-100 text-sky-800"
              }`}
            >
              <BellRing className="h-4 w-4" />
            </span>
            <div>
              <h3 className={`text-base font-extrabold ${isDark ? "text-white" : "text-slate-900"}`}>
                Weather Safety & Proactive Notifications
              </h3>
              <p className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Intelligent risk detection & GPS safety alerts
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

        {/* Tab Selection */}
        <div className={`flex border-b px-6 pt-2 gap-4 ${isDark ? "border-slate-800" : "border-slate-200"}`}>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-1.5 pb-2.5 text-xs font-bold transition border-b-2 ${
              activeTab === "settings"
                ? "border-sky-500 text-sky-400"
                : isDark
                ? "border-transparent text-slate-400 hover:text-slate-200"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Bell className="h-3.5 w-3.5" />
            <span>Alert Preferences</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-1.5 pb-2.5 text-xs font-bold transition border-b-2 ${
              activeTab === "history"
                ? "border-sky-500 text-sky-400"
                : isDark
                ? "border-transparent text-slate-400 hover:text-slate-200"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Alert History ({logs.length})</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6 space-y-5">
          {activeTab === "settings" ? (
            <>
              {/* Browser Permission Banner */}
              <div
                className={`rounded-xl border p-4 text-xs transition ${
                  permissionState === "granted"
                    ? isDark
                      ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-200"
                      : "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : isDark
                    ? "border-sky-500/30 bg-sky-950/30 text-sky-200"
                    : "border-sky-200 bg-sky-50 text-sky-900"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      {permissionState === "granted" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <BellRing className="h-4 w-4 text-sky-400" />
                      )}
                      <span>Browser Push Notifications</span>
                    </div>
                    <p className="opacity-90 leading-relaxed">
                      Allow WeatherGPT to notify you when important weather conditions are detected near your location.
                    </p>
                  </div>

                  {permissionState !== "granted" ? (
                    <button
                      onClick={handleRequestBrowserPermission}
                      className="shrink-0 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-500 transition active:scale-95 shadow-xs"
                    >
                      Enable Push
                    </button>
                  ) : (
                    <span className="shrink-0 rounded-md bg-emerald-600/30 px-2 py-0.5 text-[10px] font-extrabold text-emerald-300 border border-emerald-500/40">
                      Active
                    </span>
                  )}
                </div>

                {permissionMsg && (
                  <p className="mt-2 text-[11px] font-semibold text-sky-300">{permissionMsg}</p>
                )}
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                {/* Master Proactive Toggle */}
                <div
                  className={`flex items-center justify-between rounded-xl border p-3.5 ${
                    isDark ? "border-slate-800 bg-[#090f1e]" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Bell className="h-4 w-4 text-sky-400" />
                    <div>
                      <div className={`text-xs font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                        Proactive Weather Notifications
                      </div>
                      <div className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Send alerts when meaningful weather risks are detected
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={() => handleToggle("enabled")}
                    className="h-4 w-4 rounded accent-sky-500 cursor-pointer"
                  />
                </div>

                {/* Location-based Alerts */}
                <div
                  className={`flex items-center justify-between rounded-xl border p-3.5 ${
                    isDark ? "border-slate-800 bg-[#090f1e]" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-emerald-400" />
                    <div>
                      <div className={`text-xs font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                        GPS Location-Based Safety Alerts
                      </div>
                      <div className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Alert when weather changes around your live GPS coordinates
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.locationAlerts}
                    onChange={() => handleToggle("locationAlerts")}
                    className="h-4 w-4 rounded accent-sky-500 cursor-pointer"
                  />
                </div>

                {/* Dangerous Weather Mode */}
                <div
                  className={`flex items-center justify-between rounded-xl border p-3.5 ${
                    isDark ? "border-slate-800 bg-[#090f1e]" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="h-4 w-4 text-rose-500" />
                    <div>
                      <div className={`text-xs font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                        Dangerous Weather & Thunderstorms
                      </div>
                      <div className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        High priority safety alerts with nearby assistance facilities
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.dangerAlerts}
                    onChange={() => handleToggle("dangerAlerts")}
                    className="h-4 w-4 rounded accent-sky-500 cursor-pointer"
                  />
                </div>

                {/* Rain & Showers */}
                <div
                  className={`flex items-center justify-between rounded-xl border p-3.5 ${
                    isDark ? "border-slate-800 bg-[#090f1e]" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CloudRain className="h-4 w-4 text-cyan-400" />
                    <div>
                      <div className={`text-xs font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                        Rain Approaching Alerts
                      </div>
                      <div className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Notify when rain or showers are heading your way
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.rainAlerts}
                    onChange={() => handleToggle("rainAlerts")}
                    className="h-4 w-4 rounded accent-sky-500 cursor-pointer"
                  />
                </div>

                {/* High Heat */}
                <div
                  className={`flex items-center justify-between rounded-xl border p-3.5 ${
                    isDark ? "border-slate-800 bg-[#090f1e]" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Sun className="h-4 w-4 text-amber-400" />
                    <div>
                      <div className={`text-xs font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                        High Heat & UV Index Warnings
                      </div>
                      <div className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Notify when extreme daytime temperatures are recorded
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.heatAlerts}
                    onChange={() => handleToggle("heatAlerts")}
                    className="h-4 w-4 rounded accent-sky-500 cursor-pointer"
                  />
                </div>

                {/* Strong Winds */}
                <div
                  className={`flex items-center justify-between rounded-xl border p-3.5 ${
                    isDark ? "border-slate-800 bg-[#090f1e]" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Wind className="h-4 w-4 text-indigo-400" />
                    <div>
                      <div className={`text-xs font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                        Strong Wind Advisories
                      </div>
                      <div className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Notify when wind gusts exceed safety thresholds
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.windAlerts}
                    onChange={() => handleToggle("windAlerts")}
                    className="h-4 w-4 rounded accent-sky-500 cursor-pointer"
                  />
                </div>
              </div>

              <div
                className={`flex items-center gap-2 rounded-xl p-3 text-[11px] ${
                  isDark ? "bg-slate-900/60 text-slate-400" : "bg-slate-100 text-slate-600"
                }`}
              >
                <Info className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                <span>
                  <strong>Anti-Spam Guarantee:</strong> Alerts operate on a 45-minute cooldown. You will only be alerted again if conditions escalate to higher severity.
                </span>
              </div>
            </>
          ) : (
            /* History Logs */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Recent Triggered Alerts ({logs.length})
                </span>
                {logs.length > 0 && (
                  <button
                    onClick={handleClearLogs}
                    className="flex items-center gap-1 text-[11px] font-bold text-rose-400 hover:text-rose-300 hover:underline"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Clear History</span>
                  </button>
                )}
              </div>

              {logs.length === 0 ? (
                <div className="py-12 text-center text-xs opacity-60">
                  No proactive alerts have been triggered yet in this session.
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className={`rounded-xl border p-3.5 text-xs space-y-1 ${
                      log.risk.level === "danger" || log.risk.level === "critical"
                        ? isDark
                          ? "border-rose-800/40 bg-rose-950/20 text-rose-200"
                          : "border-rose-200 bg-rose-50 text-rose-900"
                        : isDark
                        ? "border-amber-800/40 bg-amber-950/20 text-amber-200"
                        : "border-amber-200 bg-amber-50 text-amber-900"
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span>{log.risk.title}</span>
                      <span className="font-mono text-[10px] opacity-70">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-90">{log.risk.whatIsHappening}</p>
                    <div className="text-[10px] font-semibold pt-0.5 opacity-80">
                      Action: {log.risk.whatToDo}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between border-t px-6 py-3.5 ${
            isDark ? "border-slate-800 bg-[#090f1e]" : "border-slate-200 bg-slate-50"
          }`}
        >
          <span className={`text-[11px] font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {isGpsActive ? "📍 GPS Active" : "📍 Manual Location"}
          </span>

          <button
            onClick={onClose}
            className={`rounded-lg border px-4 py-1.5 text-xs font-bold transition ${
              isDark
                ? "border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
