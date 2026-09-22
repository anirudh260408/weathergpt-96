import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Mic,
  MicOff,
  Sparkles,
  Volume2,
  VolumeX,
  Copy,
  Check,
  RotateCcw,
  Bot,
  User,
  MapPin,
  ExternalLink,
  Globe,
  Search,
  Square,
  Navigation,
} from "lucide-react";
import { ChatMessage, WeatherData, Theme, LocationStatus } from "../types/weather";

interface AIChatViewProps {
  messages: ChatMessage[];
  onSendMessage: (message: string, preference?: "auto" | "maps" | "search") => Promise<void>;
  onStop?: () => void;
  isLoading: boolean;
  locationName: string;
  weatherData: WeatherData | null;
  onResetChat: () => void;
  theme?: Theme;
  locationStatus?: LocationStatus;
  onUseGps?: () => void;
  onOpenLocationModal?: () => void;
  onNewChat?: () => void;
  onSelectCity?: (city: string) => Promise<void>;
  locationMode?: "gps" | "custom";
}

export const AIChatView: React.FC<AIChatViewProps> = ({
  messages,
  onSendMessage,
  onStop,
  isLoading,
  locationName,
  weatherData,
  onResetChat,
  theme = "dark",
  locationStatus = "UNKNOWN",
  onUseGps,
  onOpenLocationModal,
  onNewChat,
  onSelectCity,
  locationMode = "gps",
}) => {
  const [input, setInput] = useState("");
  const [groundingPreference, setGroundingPreference] = useState<"auto" | "maps" | "search">("auto");
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const isSubmittingRef = useRef(false);

  const isDark = theme === "dark";

  // Natural suggestions showcasing Mode 1 (GPS), Mode 2 (Any Location), Google Maps & Google Search
  const minimalSuggestions = [
    { label: "Hyderabad weather", prompt: "Hyderabad weather" },
    { label: "Will it rain here?", prompt: "Will it rain here?" },
    { label: "🗺️ Nearest mall in Hyderabad", prompt: "Nearest mall in Hyderabad", pref: "maps" as const },
    { label: "🔍 Latest storm news & radar", prompt: "Latest storm updates and radar news", pref: "search" as const },
    { label: `🏥 Nearby hospitals in ${locationName || "Hyderabad"}`, prompt: `Nearby hospitals in ${locationName || "Hyderabad"}`, pref: "maps" as const },
    { label: "Will it rain in Chennai tomorrow?", prompt: "Will it rain in Chennai tomorrow?" },
    { label: "Vizag forecast", prompt: "Vizag forecast" },
  ];

  // Auto-scroll inside the conversation container only
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Hide suggestions if user has sent messages
  const userMessageCount = messages.filter((m) => m.role === "user").length;

  const handleSend = async (textToSend?: string, overridePref?: "auto" | "maps" | "search") => {
    if (isLoading || isSubmittingRef.current) return;
    const query = (textToSend || input).trim();
    if (!query) return;

    const prefToUse = overridePref || groundingPreference;
    isSubmittingRef.current = true;
    setInput("");
    setShowSuggestions(false);
    try {
      await onSendMessage(query, prefToUse);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape" && isLoading && onStop) {
      e.preventDefault();
      onStop();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && !isSubmittingRef.current) {
        handleSend();
      }
    }
  };

  const toggleVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const speakText = (text: string, id: string) => {
    if (!("speechSynthesis" in window)) return;

    if (speakingMessageId === id) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#•]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    setSpeakingMessageId(id);
    window.speechSynthesis.speak(utterance);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      id="clean-ai-assistant-container"
      className={`flex flex-col h-full w-full max-w-4xl mx-auto rounded-2xl sm:rounded-3xl border backdrop-blur-md overflow-hidden transition-all ${
        isDark
          ? "bg-slate-900/40 border-slate-800/80 text-slate-100 shadow-2xl shadow-black/40"
          : "bg-white/80 border-slate-200/80 text-slate-900 shadow-xl shadow-slate-200/40"
      }`}
    >
      {/* Subtle Assistant Header */}
      <div
        className={`flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 border-b shrink-0 ${
          isDark ? "border-slate-800/60 bg-slate-900/30" : "border-slate-100 bg-white/40"
        }`}
      >
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          <div className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-500 to-cyan-400 text-slate-950 shadow-xs">
            <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <h2 className="text-xs sm:text-sm font-semibold tracking-tight shrink-0">WeatherGPT</h2>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Google Maps & Search Grounded
            </span>
            <span className="sm:hidden inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0" title="Google Maps & Search Grounded">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Grounded
            </span>
            {locationName && (
              <div className="flex items-center gap-1 min-w-0">
                <span
                  className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-md font-medium shrink-0 ${
                    locationMode === "gps"
                      ? isDark
                        ? "bg-sky-500/10 text-cyan-400 border border-sky-500/20"
                        : "bg-sky-50 text-sky-700 border border-sky-200"
                      : isDark
                      ? "bg-purple-500/10 text-purple-300 border border-purple-500/20"
                      : "bg-purple-50 text-purple-700 border border-purple-200"
                  }`}
                  title={locationMode === "gps" ? "Mode 1: GPS (My Location)" : "Mode 2: Any Location"}
                >
                  <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                  <span className="max-w-[75px] xs:max-w-[110px] sm:max-w-[180px] truncate">{locationName}</span>
                </span>
                {locationMode === "custom" && onUseGps && (
                  <button
                    onClick={onUseGps}
                    className={`hidden md:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-medium transition ${
                      isDark
                        ? "bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700"
                        : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200"
                    }`}
                    title="Switch back to My Location (GPS)"
                  >
                    <Navigation className="h-2.5 w-2.5" />
                    <span>My Location</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onResetChat}
          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-medium rounded-lg border transition shrink-0 active:scale-95 ${
            isDark
              ? "border-slate-800 bg-slate-800/30 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80"
              : "border-slate-200/80 bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
          title="Reset conversation"
        >
          <RotateCcw className="h-3 w-3" />
          <span className="hidden sm:inline">Clear</span>
        </button>
      </div>

      {/* Conversation Scroll Area */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-5 min-w-0 overflow-wrap-anywhere"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[380px] h-full text-center py-6 px-4 my-auto">
            {/* WeatherGPT Branding */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 to-cyan-400 text-slate-950 shadow-md shadow-sky-500/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <span className={`text-xl font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                Weather<span className="text-cyan-400">GPT</span>
              </span>
            </div>

            {/* + New Chat Indicator */}
            <div className="mb-3">
              <button
                onClick={onNewChat || onResetChat}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border transition ${
                  isDark
                    ? "bg-sky-500/10 border-sky-500/30 text-cyan-300 hover:bg-sky-500/20"
                    : "bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100"
                }`}
                title="Start a new chat"
              >
                <span>+ New Chat</span>
              </button>
            </div>

            <h3 className={`text-lg sm:text-xl font-bold mb-1.5 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
              How can I help you with the weather?
            </h3>

            {/* Location-First Status Flow */}
            {weatherData && locationName ? (
              <p className={`text-xs max-w-sm mb-5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Ask about rain, temperatures, what to wear, cycling, or travel plans in{" "}
                <span className="font-semibold text-cyan-400">{locationName}</span>.
              </p>
            ) : (
              <div className="w-full max-w-md my-3.5 text-left">
                <div
                  className={`rounded-2xl border p-4 transition shadow-xs ${
                    locationStatus === "GPS_DENIED"
                      ? isDark
                        ? "border-rose-500/30 bg-rose-950/25 text-rose-200"
                        : "border-rose-200 bg-rose-50 text-rose-800"
                      : locationStatus === "GPS_UNAVAILABLE"
                      ? isDark
                        ? "border-amber-500/30 bg-amber-950/25 text-amber-200"
                        : "border-amber-200 bg-amber-50 text-amber-900"
                      : isDark
                      ? "border-slate-800 bg-slate-900/60 text-slate-200"
                      : "border-slate-200 bg-slate-50 text-slate-800"
                  }`}
                >
                  <div className="flex items-start gap-2.5 mb-3">
                    <MapPin className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold">
                        {locationStatus === "SCANNING"
                          ? "Detecting your location..."
                          : locationStatus === "GPS_DENIED"
                          ? "Location Access Needed"
                          : "Location not set"}
                      </div>
                      <p className={`text-[11px] mt-0.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                        {locationStatus === "SCANNING"
                          ? "Scanning GPS coordinates and connecting to meteorological sensors..."
                          : locationStatus === "GPS_DENIED"
                          ? "GPS permission was denied. Please search or select your city manually."
                          : "Share your GPS location or search any city to get live forecasts, safety alerts, and AI weather guidance."}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    {onUseGps && locationStatus !== "GPS_DENIED" && (
                      <button
                        onClick={onUseGps}
                        disabled={locationStatus === "SCANNING"}
                        className="flex w-full sm:flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 py-2 px-3 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        <span>{locationStatus === "SCANNING" ? "Locating..." : "Use My Location (GPS)"}</span>
                      </button>
                    )}
                    {onOpenLocationModal && (
                      <button
                        onClick={onOpenLocationModal}
                        className={`flex w-full sm:flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 px-3 text-xs font-semibold transition ${
                          isDark
                            ? "border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-750 hover:text-white"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <Search className="h-3.5 w-3.5" />
                        <span>Search City</span>
                      </button>
                    )}
                  </div>

                  {/* Quick popular city chips */}
                  {onSelectCity && (
                    <div className="mt-3 pt-2.5 border-t border-slate-700/30">
                      <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Or select a city:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {["New York", "London", "Tokyo", "Paris", "Sydney", "Mumbai"].map((c) => (
                          <button
                            key={c}
                            onClick={() => onSelectCity(c)}
                            className={`text-[11px] px-2.5 py-0.5 rounded-lg border transition ${
                              isDark
                                ? "border-slate-800 bg-slate-800/50 text-slate-300 hover:border-cyan-500/40 hover:text-white hover:bg-slate-800"
                                : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-900"
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md mt-1">
              {minimalSuggestions.slice(0, 4).map((sug, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(sug.prompt, sug.pref)}
                  className={`text-xs text-left p-3 rounded-xl border transition active:scale-[0.98] ${
                    isDark
                      ? "bg-slate-800/30 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700 text-slate-300 hover:text-white"
                      : "bg-slate-50/70 border-slate-200/70 hover:border-slate-300 hover:bg-white text-slate-700 shadow-2xs"
                  }`}
                >
                  <span className="font-medium">{sug.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-cyan-400 border border-sky-500/15 mt-0.5">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div className={`flex flex-col max-w-[88%] sm:max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
                  {isUser ? (
                    /* Subtle User Message Container */
                    <div
                      className={`relative rounded-2xl rounded-tr-xs px-4 py-2.5 text-sm leading-relaxed ${
                        isDark
                          ? "bg-slate-800/90 text-slate-100 border border-slate-700/60 shadow-xs"
                          : "bg-slate-100 text-slate-900 border border-slate-200/80 shadow-xs"
                      }`}
                    >
                      <div className="whitespace-pre-wrap font-normal">{msg.content}</div>
                    </div>
                  ) : (
                    /* Subtle AI Message Container - Clean and Minimalist */
                    <div
                      className={`relative rounded-2xl rounded-tl-xs px-4 py-3 text-[14.5px] leading-relaxed w-full ${
                        isDark
                          ? "bg-slate-800/30 text-slate-200 border border-slate-800/50"
                          : "bg-sky-50/40 text-slate-800 border border-sky-100/50"
                      }`}
                    >
                      <div className="tracking-normal font-normal whitespace-pre-wrap">
                        {msg.content}
                      </div>

                      {/* Grounding Citations: Google Maps & Google Search Sources */}
                      {Array.isArray(msg.sources) && msg.sources.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-700/20 dark:border-slate-700/30">
                          <div className="flex items-center justify-between gap-2 text-[11px] mb-2">
                            <div className="flex items-center gap-1.5 font-medium text-slate-400">
                              <Globe className="h-3 w-3 text-cyan-400" />
                              <span>Grounded Citations & Sources</span>
                            </div>
                            {msg.groundingType === "maps" && (
                              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                <MapPin className="h-2.5 w-2.5" />
                                Google Maps
                              </span>
                            )}
                            {msg.groundingType === "search" && (
                              <span className="flex items-center gap-1 text-[10px] text-sky-400 font-medium px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20">
                                <Search className="h-2.5 w-2.5" />
                                Google Search
                              </span>
                            )}
                            {msg.groundingType === "dual" && (
                              <span className="flex items-center gap-1 text-[10px] text-purple-400 font-medium px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20">
                                <Sparkles className="h-2.5 w-2.5" />
                                Google Maps & Search
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {msg.sources.map((source, sIdx) => {
                              const isMapSource = source.type === "maps";
                              return (
                                <a
                                  key={sIdx}
                                  href={source.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition hover:scale-[1.02] active:scale-[0.98] ${
                                    isMapSource
                                      ? isDark
                                        ? "bg-emerald-950/30 border-emerald-700/40 text-emerald-300 hover:bg-emerald-900/40 hover:border-emerald-500/60"
                                        : "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                                      : isDark
                                      ? "bg-sky-950/30 border-sky-700/40 text-sky-300 hover:bg-sky-900/40 hover:border-sky-500/60"
                                      : "bg-sky-50 border-sky-200 text-sky-800 hover:bg-sky-100"
                                  }`}
                                  title={source.snippet ? `${source.title}: ${source.snippet}` : source.title}
                                >
                                  {isMapSource ? (
                                    <MapPin className="h-3 w-3 text-emerald-400 shrink-0" />
                                  ) : (
                                    <Search className="h-3 w-3 text-sky-400 shrink-0" />
                                  )}
                                  <span className="truncate max-w-[200px] sm:max-w-[280px] font-medium">{source.title}</span>
                                  <ExternalLink className="h-2.5 w-2.5 opacity-70 shrink-0" />
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Subtle Action Toolbar */}
                      <div className="mt-2.5 flex items-center gap-3 pt-1 border-t border-slate-700/10 dark:border-slate-700/20">
                        <button
                          onClick={() => speakText(msg.content, msg.id)}
                          className={`text-[11px] flex items-center gap-1 transition ${
                            isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-800"
                          }`}
                          title={speakingMessageId === msg.id ? "Stop voice" : "Read aloud"}
                        >
                          {speakingMessageId === msg.id ? (
                            <>
                              <VolumeX className="h-3 w-3 text-cyan-400" />
                              <span className="text-cyan-400 font-medium">Stop</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="h-3 w-3" />
                              <span>Listen</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => copyToClipboard(msg.content, msg.id)}
                          className={`text-[11px] flex items-center gap-1 transition ${
                            isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-800"
                          }`}
                          title="Copy message"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" />
                              <span className="text-emerald-400 font-medium">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg mt-0.5 ${
                      isDark ? "bg-slate-800/80 text-slate-300 border border-slate-700/50" : "bg-slate-200/80 text-slate-700 border border-slate-300/50"
                    }`}
                  >
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="flex items-start gap-3 justify-start">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-cyan-400 border border-sky-500/15 mt-0.5">
              <Bot className="h-4 w-4" />
            </div>
            <div
              className={`rounded-2xl rounded-tl-xs px-4 py-2.5 text-xs flex items-center gap-2 border ${
                isDark
                  ? "bg-slate-800/30 border-slate-800/50 text-slate-400"
                  : "bg-sky-50/40 border-sky-100/50 text-slate-500"
              }`}
            >
              <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce" />
              <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]" />
              <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]" />
              <span className="ml-1 font-medium">WeatherGPT is thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions Minimal Chips */}
      {(userMessageCount < 2 || showSuggestions) && messages.length > 0 && (
        <div
          className={`px-4 sm:px-8 py-2 border-t shrink-0 flex items-center gap-1.5 overflow-x-auto scrollbar-none ${
            isDark ? "border-slate-800/60 bg-slate-900/20" : "border-slate-100 bg-slate-50/50"
          }`}
        >
          {minimalSuggestions.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(suggestion.prompt, suggestion.pref)}
              disabled={isLoading}
              className={`text-xs whitespace-nowrap px-3 py-1 rounded-full border transition active:scale-95 flex items-center gap-1.5 ${
                isDark
                  ? "bg-slate-800/40 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white"
                  : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-2xs"
              }`}
            >
              {suggestion.label}
            </button>
          ))}
        </div>
      )}

      {/* Bottom Floating/Pinned Input Area */}
      <div
        className={`p-3 sm:p-4 border-t shrink-0 ${
          isDark ? "border-slate-800/80 bg-slate-900/60" : "border-slate-100 bg-white"
        }`}
      >
        {/* Grounding Engine Mode Selector */}
        <div className="flex items-center justify-between gap-2 mb-2 px-0.5 sm:px-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`hidden sm:inline text-[11px] font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Grounding Engine:
            </span>
            <div className={`inline-flex items-center rounded-lg p-0.5 border ${
              isDark ? "border-slate-800 bg-slate-900/80" : "border-slate-200 bg-slate-100"
            }`}>
              <button
                type="button"
                onClick={() => setGroundingPreference("auto")}
                className={`px-2 py-1 sm:py-0.5 text-[11px] font-medium rounded-md transition ${
                  groundingPreference === "auto"
                    ? isDark
                      ? "bg-slate-700 text-white shadow-2xs"
                      : "bg-white text-slate-900 shadow-2xs border border-slate-200"
                    : isDark
                    ? "text-slate-400 hover:text-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Automatically choose Google Maps or Google Search based on your question"
              >
                ⚡ Auto
              </button>
              <button
                type="button"
                onClick={() => setGroundingPreference("maps")}
                className={`px-2 py-1 sm:py-0.5 text-[11px] font-medium rounded-md transition flex items-center gap-1 ${
                  groundingPreference === "maps"
                    ? "bg-emerald-600 text-white shadow-2xs font-semibold"
                    : isDark
                    ? "text-emerald-400/90 hover:text-emerald-300"
                    : "text-emerald-700 hover:text-emerald-900"
                }`}
                title="Google Maps: Discover places, malls, safe shelters, hospitals, and directions"
              >
                <MapPin className="h-3 w-3 shrink-0" />
                <span><span className="hidden xs:inline">Google </span>Maps</span>
              </button>
              <button
                type="button"
                onClick={() => setGroundingPreference("search")}
                className={`px-2 py-1 sm:py-0.5 text-[11px] font-medium rounded-md transition flex items-center gap-1 ${
                  groundingPreference === "search"
                    ? "bg-sky-600 text-white shadow-2xs font-semibold"
                    : isDark
                    ? "text-sky-400/90 hover:text-sky-300"
                    : "text-sky-700 hover:text-sky-900"
                }`}
                title="Google Search: Live web weather news, radar observations, and bulletins"
              >
                <Search className="h-3 w-3 shrink-0" />
                <span><span className="hidden xs:inline">Google </span>Search</span>
              </button>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400 font-mono">
            {groundingPreference === "maps" && <span className="text-emerald-400">Google Maps Grounded</span>}
            {groundingPreference === "search" && <span className="text-sky-400">Google Search Grounded</span>}
            {groundingPreference === "auto" && <span className="text-slate-400">Google Maps & Search Ready</span>}
          </div>
        </div>

        <div
          className={`flex items-center gap-2 rounded-2xl border px-3 py-1.5 sm:py-2 transition-all ${
            isDark
              ? "bg-slate-800/60 border-slate-700/60 focus-within:border-sky-500/70 focus-within:ring-2 focus-within:ring-sky-500/20"
              : "bg-slate-50 border-slate-200 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20"
          }`}
        >
          <input
            id="chat-input-field"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder={
              locationName
                ? `Ask WeatherGPT about ${locationName}...`
                : "Ask WeatherGPT anything..."
            }
            className={`flex-1 bg-transparent text-base sm:text-sm focus:outline-hidden ${
              isDark ? "text-white placeholder-slate-500" : "text-slate-900 placeholder-slate-400"
            }`}
          />

          {/* Voice Input Button */}
          <button
            onClick={toggleVoiceInput}
            className={`flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-xl transition shrink-0 active:scale-90 ${
              isListening
                ? "bg-rose-500 text-white animate-pulse"
                : isDark
                ? "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-200"
            }`}
            title={isListening ? "Listening... (tap to stop)" : "Speak query"}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>

          {/* Send Button */}
          <button
            id="chat-send-btn"
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-sky-500 text-white transition hover:bg-sky-600 disabled:opacity-40 disabled:hover:bg-sky-500 active:scale-95 shrink-0"
            title="Send query"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
