import React from "react";
import {
  Plus,
  Calendar,
  Sun,
  Moon,
  Shield,
  Compass,
  Sparkles,
  Trash2,
  History,
  Settings,
  User,
  ChevronRight,
  X,
} from "lucide-react";
import { TemperatureUnit, WeatherAlert, Theme, ChatHistoryItem, ChatSession, UserAccount, AppTab } from "../types/weather";

interface SidebarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  onNewChat: () => void;
  sessions?: ChatSession[];
  activeSessionId?: string;
  onSelectSession?: (id: string) => void;
  onDeleteSession?: (id: string) => void;
  chatHistory: ChatHistoryItem[];
  onSelectHistoryItem: (query: string) => void;
  onDeleteHistoryItem?: (id: string) => void;
  onClearChatHistory?: () => void;
  locationName: string;
  onOpenLocationModal: () => void;
  onUseGps?: () => void;
  alerts: WeatherAlert[];
  onOpenAlertsModal: () => void;
  unit: TemperatureUnit;
  onToggleUnit: () => void;
  uvIndex: number;
  isRefreshing: boolean;
  onRefresh: () => void;
  isDangerMode: boolean;
  onToggleDangerPreview: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  theme?: Theme;
  onToggleTheme?: () => void;
  currentUser: UserAccount | null;
  onOpenAccountModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onNewChat,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  chatHistory,
  onSelectHistoryItem,
  onDeleteHistoryItem,
  onClearChatHistory,
  locationName,
  onOpenLocationModal,
  onUseGps,
  alerts,
  onOpenAlertsModal,
  unit,
  onToggleUnit,
  uvIndex,
  isRefreshing,
  onRefresh,
  isDangerMode,
  onToggleDangerPreview,
  isOpenMobile,
  onCloseMobile,
  theme = "dark",
  onToggleTheme,
  currentUser,
  onOpenAccountModal,
}) => {
  const isDark = theme === "dark";

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-72 shrink-0 min-w-[18rem] max-w-[18rem] h-full flex-col justify-between border-r transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 overflow-hidden ${
          isDark
            ? "bg-[#090e1c] border-slate-800/80 text-slate-200"
            : "bg-white/95 border-slate-200/80 text-slate-800"
        } ${isOpenMobile ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Top Branding & New Chat (matches screenshot) */}
        <div className={`flex flex-col p-4 border-b ${isDark ? "border-slate-800/80" : "border-slate-100"}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 to-cyan-400 shadow-md shadow-cyan-500/20">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-lg font-extrabold tracking-tight text-white">Weather</span>
                  <span className="text-lg font-extrabold tracking-tight text-cyan-400">GPT</span>
                </div>
                <p className="text-xs font-medium text-slate-400">Your AI Weather Assistant</p>
              </div>
            </div>

            <button
              onClick={onCloseMobile}
              className={`flex h-8 w-8 items-center justify-center rounded-xl border lg:hidden transition ${
                isDark
                  ? "border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white"
                  : "border-slate-200 bg-slate-100 text-slate-600 hover:text-slate-900"
              }`}
              aria-label="Close Sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* New Chat Button (matches user screenshot exactly) */}
          <button
            id="new-chat-button"
            onClick={() => {
              onNewChat();
              setActiveTab("chat");
              if (isOpenMobile) onCloseMobile();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 py-2.5 px-4 text-sm font-semibold text-white shadow-sm shadow-sky-500/25 transition hover:brightness-110 active:scale-[0.99]"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>+ New Chat</span>
          </button>
        </div>

        {/* Middle Navigation & Chat History */}
        <div className="flex-1 min-h-0 min-w-0 overflow-y-auto px-3 py-3 space-y-4">
          {/* Main Navigation Views */}
          <div className="space-y-1">
            <div className={`px-2 py-1 text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              Views
            </div>

            <button
              id="nav-chat-btn"
              onClick={() => {
                setActiveTab("chat");
                if (isOpenMobile) onCloseMobile();
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                activeTab === "chat"
                  ? isDark
                    ? "bg-sky-500/15 text-cyan-300 border border-sky-500/30"
                    : "bg-sky-50 text-sky-700 font-semibold"
                  : isDark
                  ? "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                  : "text-slate-600 hover:bg-slate-100/70"
              }`}
            >
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <span>AI Weather Assistant</span>
            </button>

            <button
              id="nav-dashboard-btn"
              onClick={() => {
                setActiveTab("dashboard");
                if (isOpenMobile) onCloseMobile();
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                activeTab === "dashboard"
                  ? isDark
                    ? "bg-sky-500/15 text-cyan-300 border border-sky-500/30"
                    : "bg-sky-50 text-sky-700 font-semibold"
                  : isDark
                  ? "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                  : "text-slate-600 hover:bg-slate-100/70"
              }`}
            >
              <Sun className="h-4 w-4 text-amber-400" />
              <span>Live Dashboard</span>
            </button>

            <button
              id="nav-forecast-btn"
              onClick={() => {
                setActiveTab("forecast");
                if (isOpenMobile) onCloseMobile();
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                activeTab === "forecast"
                  ? isDark
                    ? "bg-sky-500/15 text-cyan-300 border border-sky-500/30"
                    : "bg-sky-50 text-sky-700 font-semibold"
                  : isDark
                  ? "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                  : "text-slate-600 hover:bg-slate-100/70"
              }`}
            >
              <Calendar className="h-4 w-4 text-indigo-400" />
              <span>Hourly & 7-Day Forecast</span>
            </button>

            <button
              id="nav-retrospective-btn"
              onClick={() => {
                setActiveTab("retrospective");
                if (isOpenMobile) onCloseMobile();
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                activeTab === "retrospective"
                  ? isDark
                    ? "bg-sky-500/15 text-cyan-300 border border-sky-500/30"
                    : "bg-sky-50 text-sky-700 font-semibold"
                  : isDark
                  ? "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                  : "text-slate-600 hover:bg-slate-100/70"
              }`}
            >
              <History className="h-4 w-4 text-amber-400" />
              <span>7-Day Retrospective</span>
            </button>

            <button
              id="nav-nearby-btn"
              onClick={() => {
                setActiveTab("nearby");
                if (isOpenMobile) onCloseMobile();
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                activeTab === "nearby"
                  ? isDark
                    ? "bg-sky-500/15 text-cyan-300 border border-sky-500/30"
                    : "bg-sky-50 text-sky-700 font-semibold"
                  : isDark
                  ? "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                  : "text-slate-600 hover:bg-slate-100/70"
              }`}
            >
              <Shield className="h-4 w-4 text-rose-400" />
              <span>Nearby Safe Places</span>
            </button>

            <button
              id="nav-recs-btn"
              onClick={() => {
                setActiveTab("recommendations");
                if (isOpenMobile) onCloseMobile();
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                activeTab === "recommendations"
                  ? isDark
                    ? "bg-sky-500/15 text-cyan-300 border border-sky-500/30"
                    : "bg-sky-50 text-sky-700 font-semibold"
                  : isDark
                  ? "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                  : "text-slate-600 hover:bg-slate-100/70"
              }`}
            >
              <Compass className="h-4 w-4 text-emerald-400" />
              <span>Safety & Attire Advice</span>
            </button>
          </div>

          {/* Divider */}
          <div className={`my-2 border-t ${isDark ? "border-slate-800/80" : "border-slate-200/80"}`} />

          {/* Chat Sessions / History Section (ChatGPT style) */}
          <div>
            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>
                  Recent Chats
                </span>
                <span className={`flex h-4 min-w-4 px-1 items-center justify-center rounded-full text-[10px] font-bold ${
                  isDark ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-600"
                }`}>
                  {sessions && sessions.length > 0 ? sessions.length : chatHistory.length}
                </span>
              </div>

              {((sessions && sessions.length > 0) || chatHistory.length > 0) && onClearChatHistory && (
                <button
                  id="clear-chat-history-btn"
                  onClick={onClearChatHistory}
                  className={`text-[10px] flex items-center gap-1 font-semibold transition hover:underline ${
                    isDark ? "text-slate-400 hover:text-rose-400" : "text-slate-500 hover:text-rose-600"
                  }`}
                  title="Clear all chat sessions"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            <div className="mt-1.5 space-y-1">
              {sessions && sessions.length > 0 ? (
                sessions.map((sess) => {
                  const isActive = activeSessionId === sess.id && activeTab === "chat";
                  return (
                    <div
                      key={sess.id}
                      className={`group relative flex w-full min-h-[38px] items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${
                        isActive
                          ? isDark
                            ? "bg-sky-500/20 text-cyan-300 border border-sky-500/35 shadow-2xs"
                            : "bg-sky-50 text-sky-800 font-semibold border border-sky-200 shadow-2xs"
                          : isDark
                          ? "text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent"
                          : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 border border-transparent"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectSession) onSelectSession(sess.id);
                          setActiveTab("chat");
                          if (isOpenMobile) onCloseMobile();
                        }}
                        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                        title={sess.title}
                      >
                        <span className="text-sm shrink-0" role="img" aria-label="topic emoji">
                          {sess.emoji || "💬"}
                        </span>
                        <span className="truncate text-xs font-medium leading-tight">
                          {sess.title || "New Chat"}
                        </span>
                        {sess.isGenerating && (
                          <span className="flex h-2 w-2 shrink-0 rounded-full bg-cyan-400 animate-pulse ml-auto" title="Generating response..." />
                        )}
                      </button>

                      {onDeleteSession && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSession(sess.id);
                          }}
                          className={`shrink-0 rounded-md p-1 transition ${
                            isActive
                              ? "opacity-80 hover:opacity-100 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400"
                              : "opacity-0 group-hover:opacity-100 hover:bg-rose-500/20 hover:text-rose-400 text-slate-500"
                          }`}
                          title="Delete this chat"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })
              ) : chatHistory.length === 0 ? (
                <p className={`px-2 py-2 text-xs italic ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  No recent chats yet. Ask a question to start!
                </p>
              ) : (
                chatHistory.map((item) => {
                  return (
                    <div
                      key={item.id}
                      className={`group relative flex w-full min-h-[38px] items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${
                        isDark
                          ? "text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent"
                          : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 border border-transparent"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelectHistoryItem(item.query || item.title);
                          setActiveTab("chat");
                          if (isOpenMobile) onCloseMobile();
                        }}
                        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                        title={item.query || item.title}
                      >
                        <span className="text-sm shrink-0" role="img" aria-label="topic emoji">
                          {item.emoji || "💬"}
                        </span>
                        <span className="truncate text-xs font-medium leading-tight">
                          {item.title}
                        </span>
                      </button>

                      {onDeleteHistoryItem && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteHistoryItem(item.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 hover:bg-rose-500/20 hover:text-rose-400 transition text-slate-500 rounded-md p-1 shrink-0"
                          title="Delete this query"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Bottom Section: Settings & Account */}
        <div
          id="sidebar-footer"
          className={`shrink-0 border-t p-3 space-y-2 ${
            isDark ? "border-slate-800/80 bg-[#070b14]/90" : "border-slate-200/80 bg-slate-50/90"
          }`}
        >
          {/* Quick Settings: Unit & Theme & Preferences */}
          <div className="flex items-center justify-between gap-1.5">
            {/* Unit Toggle Button */}
            <button
              id="sidebar-unit-toggle"
              type="button"
              onClick={onToggleUnit}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition active:scale-[0.98] ${
                isDark
                  ? "border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900 shadow-xs"
              }`}
              title={`Switch temperature unit (currently ${unit === "C" ? "Celsius (°C)" : "Fahrenheit (°F)"})`}
            >
              <span className="text-[11px] text-slate-400 font-normal">Unit:</span>
              <span className="font-bold text-cyan-400">°{unit}</span>
            </button>

            {/* Theme Toggle Button */}
            {onToggleTheme && (
              <button
                id="sidebar-theme-toggle"
                type="button"
                onClick={onToggleTheme}
                className={`flex h-8 w-8 items-center justify-center rounded-xl border transition active:scale-[0.98] ${
                  isDark
                    ? "border-slate-800 bg-slate-900/80 text-amber-400 hover:border-slate-700 hover:bg-slate-800"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900 shadow-xs"
                }`}
                title={`Switch to ${isDark ? "Light" : "Dark"} mode`}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            )}

            {/* Settings & Preferences Button */}
            <button
              id="sidebar-settings-btn"
              type="button"
              onClick={() => {
                onOpenAccountModal();
                if (isOpenMobile) onCloseMobile();
              }}
              className={`flex h-8 w-8 items-center justify-center rounded-xl border transition active:scale-[0.98] ${
                isDark
                  ? "border-slate-800 bg-slate-900/80 text-slate-400 hover:text-cyan-400 hover:border-slate-700 hover:bg-slate-800"
                  : "border-slate-200 bg-white text-slate-600 hover:text-sky-600 hover:border-slate-300 shadow-xs"
              }`}
              title="Settings & Preferences"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>

          {/* Account & Profile Button */}
          <button
            id="sidebar-account-btn"
            type="button"
            onClick={() => {
              onOpenAccountModal();
              if (isOpenMobile) onCloseMobile();
            }}
            className={`flex w-full items-center gap-2.5 rounded-xl border p-2 text-left transition active:scale-[0.99] ${
              currentUser
                ? isDark
                  ? "border-slate-800/80 bg-slate-900/60 hover:bg-slate-800/80 hover:border-cyan-500/30 text-slate-200"
                  : "border-slate-200/80 bg-white hover:bg-slate-50 hover:border-sky-300 text-slate-800 shadow-xs"
                : isDark
                ? "border-cyan-500/30 bg-cyan-950/20 hover:bg-cyan-900/30 text-cyan-300"
                : "border-sky-200 bg-sky-50/70 hover:bg-sky-100/80 text-sky-900 shadow-xs"
            }`}
            title="Account, 2FA Security & Preferences"
          >
            {currentUser ? (
              <>
                <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-500 to-cyan-400 text-slate-950 font-bold text-xs shadow-xs">
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      className="h-full w-full rounded-lg object-cover"
                    />
                  ) : (
                    currentUser.name.charAt(0).toUpperCase()
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 border-2 border-[#090e1c]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="truncate text-xs font-semibold leading-tight">{currentUser.name}</p>
                    {currentUser.twoFactorEnabled && (
                      <span title="2FA Active">
                        <Shield className="h-3 w-3 text-cyan-400 shrink-0" />
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[11px] text-slate-400 leading-tight mt-0.5">
                    {currentUser.email}
                  </p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              </>
            ) : (
              <>
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    isDark ? "bg-cyan-500/20 text-cyan-400" : "bg-sky-100 text-sky-600"
                  }`}
                >
                  <User className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-semibold leading-tight">Account & Security</p>
                  <p className="truncate text-[11px] text-slate-400 leading-tight mt-0.5">
                    Sign In / Sync Data
                  </p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

